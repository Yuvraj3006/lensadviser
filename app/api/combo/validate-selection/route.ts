import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleApiError } from '@/lib/errors';
import { z } from 'zod';

const validateSelectionSchema = z.object({
  session_id: z.string(),
  context: z.enum(['COMBO', 'REGULAR']),
  combo_code: z.string().optional(), // BRONZE, SILVER, GOLD, PLATINUM
  selected: z.object({
    frame_brand_id: z.string().nullable().optional(),
    sun_brand_id: z.string().nullable().optional(),
    lens_sku_id: z.string().nullable().optional(),
    second_eyewear_choice: z.enum(['FRAME', 'SUN']).nullable().optional(),
  }),
  needs_profile: z.object({
    screen_time: z.string().optional(),
    backup_need: z.boolean().optional(),
    lens_complexity: z.string().optional(),
  }).optional(),
});

// Combo tier ladder for upgrade suggestions
const COMBO_TIER_LADDER = ['BRONZE', 'SILVER', 'GOLD', 'PLATINUM'];

/**
 * POST /api/combo/validate-selection
 * Validate combo selection and suggest upgrades if needed
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = validateSelectionSchema.parse(body);

    const { session_id, context, combo_code, selected, needs_profile } = validated;

    // Only validate for COMBO context
    if (context !== 'COMBO') {
      return Response.json({
        success: true,
        data: {
          eligible: true,
          blocked_items: [],
          upgrade: {
            suggest_upgrade: false,
            from_tier: null,
            to_tier: null,
            reason_code: null,
            customer_message: null,
          },
        },
      });
    }

    if (!combo_code) {
      return Response.json(
        {
          success: false,
          error: {
            code: 'MISSING_COMBO_CODE',
            message: 'combo_code is required for COMBO context',
          },
        },
        { status: 400 }
      );
    }

    const blockedItems: string[] = [];
    let suggestUpgrade = false;
    let upgradeReason: 'BRAND_NOT_ELIGIBLE' | 'LENS_NOT_ELIGIBLE' | 'NEEDS_MISMATCH' | 'BOTH_OPTIONS' | null = null;
    let suggestedTier: string | null = null;

    // T1: Check frame brand eligibility
    if (selected.frame_brand_id) {
      const frameBrand = await prisma.productBrand.findUnique({
        where: { id: selected.frame_brand_id },
      });

      if (!frameBrand || !frameBrand.comboAllowed) {
        blockedItems.push(`frame_brand_${selected.frame_brand_id}`);
        suggestUpgrade = true;
        upgradeReason = 'BRAND_NOT_ELIGIBLE';
      }
    }

    // T2: Check sun brand eligibility
    if (selected.sun_brand_id) {
      const sunBrand = await prisma.productBrand.findUnique({
        where: { id: selected.sun_brand_id },
      });

      if (!sunBrand || !sunBrand.comboAllowed) {
        blockedItems.push(`sun_brand_${selected.sun_brand_id}`);
        suggestUpgrade = true;
        upgradeReason = 'BRAND_NOT_ELIGIBLE';
      }
    }

    // T2: Check lens SKU eligibility (double-lock)
    if (selected.lens_sku_id) {
      const lens = await prisma.lensProduct.findUnique({
        where: { id: selected.lens_sku_id },
        include: {
          // We need to check the brand too
        },
      });

      if (lens) {
        // Check lens brand combo_allowed
        const lensBrand = await prisma.lensBrand.findFirst({
          where: {
            name: lens.brandLine,
            isActive: true,
          },
        });

        if (!lensBrand || !lensBrand.comboAllowed || !lens.comboAllowed) {
          blockedItems.push(`lens_sku_${selected.lens_sku_id}`);
          suggestUpgrade = true;
          upgradeReason = 'LENS_NOT_ELIGIBLE';
        }
      }
    }

    // T3: Check needs profile mismatch
    if (needs_profile) {
      const { screen_time, backup_need, lens_complexity } = needs_profile;
      
      // If high screen time + advanced lens complexity + backup need, suggest GOLD
      if (
        screen_time === 'HIGH' &&
        (lens_complexity === 'ADVANCED' || lens_complexity === 'PREMIUM') &&
        backup_need === true &&
        combo_code !== 'GOLD' &&
        combo_code !== 'PLATINUM'
      ) {
        suggestUpgrade = true;
        upgradeReason = 'NEEDS_MISMATCH';
      }
      // If advanced/premium + backup need, suggest at least SILVER
      else if (
        (lens_complexity === 'ADVANCED' || lens_complexity === 'PREMIUM') &&
        backup_need === true &&
        combo_code === 'BRONZE'
      ) {
        suggestUpgrade = true;
        upgradeReason = 'NEEDS_MISMATCH';
      }
    }

    // T4: Check if customer wants both options (2nd eyewear + sunglasses)
    // Combo rules: EXACTLY_ONE option (Frame OR Sun, not both)
    // If both frame_brand_id and sun_brand_id are provided, trigger upgrade
    if (selected.frame_brand_id && selected.sun_brand_id) {
      blockedItems.push('both_eyewear_options');
      suggestUpgrade = true;
      if (!upgradeReason) {
        upgradeReason = 'BOTH_OPTIONS';
      }
    }
    // For now, we'll skip this as it depends on specific combo tier configuration

    // Determine suggested tier (next tier in ladder)
    if (suggestUpgrade && upgradeReason) {
      const currentTierIndex = COMBO_TIER_LADDER.indexOf(combo_code);
      if (currentTierIndex >= 0 && currentTierIndex < COMBO_TIER_LADDER.length - 1) {
        suggestedTier = COMBO_TIER_LADDER[currentTierIndex + 1];
      }
    }

    // Generate customer message
    let customerMessage: string | null = null;
    if (suggestUpgrade && suggestedTier) {
      switch (upgradeReason) {
        case 'BRAND_NOT_ELIGIBLE':
          customerMessage = `This selection works best in the ${suggestedTier} Combo for complete coverage.`;
          break;
        case 'LENS_NOT_ELIGIBLE':
          customerMessage = `This lens selection works best in the ${suggestedTier} Combo for better options.`;
          break;
        case 'NEEDS_MISMATCH':
          customerMessage = `For your usage needs, the ${suggestedTier} Combo provides better comfort and backup options.`;
          break;
        case 'BOTH_OPTIONS':
          customerMessage = `The ${suggestedTier} Combo allows you to choose both frame and sunglasses options.`;
          break;
        default:
          customerMessage = `We recommend upgrading to ${suggestedTier} Combo for a better match.`;
      }
    }

    return Response.json({
      success: true,
      data: {
        eligible: blockedItems.length === 0 && !suggestUpgrade,
        blocked_items: blockedItems,
        upgrade: {
          suggest_upgrade: suggestUpgrade,
          from_tier: combo_code,
          to_tier: suggestedTier,
          reason_code: upgradeReason,
          customer_message: customerMessage,
        },
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Validation failed',
            details: error.issues,
          },
        },
        { status: 400 }
      );
    }
    return handleApiError(error);
  }
}

