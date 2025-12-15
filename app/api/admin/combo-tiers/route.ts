import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticate, authorize } from '@/middleware/auth.middleware';
import { handleApiError, ValidationError } from '@/lib/errors';
import { UserRole } from '@/lib/constants';
import { z } from 'zod';

const createComboTierSchema = z.object({
  comboCode: z.string().min(1, 'Combo code is required'),
  displayName: z.string().min(1, 'Display name is required'),
  effectivePrice: z.number().positive('Effective price must be positive'),
  totalComboValue: z.number().positive('Total combo value must be positive').optional().nullable(),
  badge: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
  sortOrder: z.number().default(0),
  benefits: z.array(
    z.object({
      benefitType: z.enum(['frame', 'lens', 'eyewear', 'addon', 'voucher']),
      label: z.string().min(1, 'Label is required'),
      maxValue: z.number().optional().nullable(),
      constraints: z.string().optional().nullable(),
    })
  ),
});

/**
 * GET /api/admin/combo-tiers
 * Get all combo tiers
 */
export async function GET(request: NextRequest) {
  try {
    const user = await authenticate(request);
    authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN)(user);

    const tiers = await prisma.comboTier.findMany({
      include: {
        benefits: {
          orderBy: {
            benefitType: 'asc',
          },
        },
      },
      orderBy: {
        sortOrder: 'asc',
      },
    });

    return Response.json({
      success: true,
      data: tiers,
    });
  } catch (error) {
    console.error('[GET /api/admin/combo-tiers] Error:', error);
    return handleApiError(error);
  }
}

/**
 * POST /api/admin/combo-tiers
 * Create a new combo tier
 */
export async function POST(request: NextRequest) {
  try {
    const user = await authenticate(request);
    authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN)(user);

    const body = await request.json();
    const validated = createComboTierSchema.parse(body);

    // Check if combo code already exists
    const existing = await prisma.comboTier.findUnique({
      where: { comboCode: validated.comboCode },
    });

    if (existing) {
      throw new ValidationError(`Combo tier with code "${validated.comboCode}" already exists`);
    }

    // Create tier with benefits
    const tier = await prisma.comboTier.create({
      data: {
        comboCode: validated.comboCode,
        displayName: validated.displayName,
        effectivePrice: validated.effectivePrice,
        totalComboValue: validated.totalComboValue || null,
        badge: validated.badge || null,
        isActive: validated.isActive,
        sortOrder: validated.sortOrder || 0,
        benefits: {
          create: validated.benefits.map(b => ({
            benefitType: b.benefitType,
            label: b.label,
            maxValue: b.maxValue || null,
            constraints: b.constraints || null,
          })),
        },
      },
      include: {
        benefits: true,
      },
    });

    return Response.json({
      success: true,
      data: tier,
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

