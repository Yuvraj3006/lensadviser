import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleApiError } from '@/lib/errors';

/**
 * GET /api/combo/tiers
 * Get all active combo tiers with benefits for comparison cards
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId');

    const where: any = {
      isActive: true,
    };

    // Optional: Filter by organization if provided
    if (organizationId) {
      where.organizationId = organizationId;
    }

    const tiers = await prisma.comboTier.findMany({
      where,
      include: {
        benefits: {
          orderBy: {
            benefitType: 'asc',
          },
        },
      },
      orderBy: {
        effectivePrice: 'asc',
      },
    });

    return Response.json({
      success: true,
      data: tiers.map(tier => ({
        combo_code: tier.comboCode,
        display_name: tier.displayName,
        effective_price: tier.effectivePrice,
        total_combo_value: tier.totalComboValue,
        badge: tier.badge,
        benefits: tier.benefits.map(b => ({
          type: b.benefitType,
          label: b.label,
          max_value: b.maxValue,
          constraints: b.constraints ? JSON.parse(b.constraints) : null,
        })),
      })),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

