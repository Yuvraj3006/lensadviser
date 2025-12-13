import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleApiError } from '@/lib/errors';

/**
 * GET /api/config
 * Get global configuration including combo_offer_status
 */
export async function GET(request: NextRequest) {
  try {
    // Get combo_offer_status from Config table
    const comboStatus = await prisma.config.findUnique({
      where: { key: 'combo_offer_status' },
    });

    // Get active combo tiers
    const activeTiers = await prisma.comboTier.findMany({
      where: { isActive: true },
      include: {
        benefits: true,
      },
      orderBy: {
        effectivePrice: 'asc',
      },
    });

    // Default combo_offer_status to OFF if not set
    const comboOfferStatus = comboStatus?.value || 'OFF';

    return Response.json({
      success: true,
      data: {
        combo_offer_status: comboOfferStatus,
        active_combo_tiers: activeTiers.map(tier => ({
          combo_code: tier.comboCode,
          display_name: tier.displayName,
          effective_price: tier.effectivePrice,
          badge: tier.badge,
          benefits: tier.benefits.map(b => ({
            type: b.benefitType,
            label: b.label,
            max_value: b.maxValue,
            constraints: b.constraints,
          })),
        })),
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

