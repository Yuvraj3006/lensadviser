import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticate, authorize } from '@/middleware/auth.middleware';
import { handleApiError, ValidationError, NotFoundError } from '@/lib/errors';
import { UserRole } from '@/lib/constants';
import { z } from 'zod';

const updateComboTierSchema = z.object({
  // comboCode is immutable - cannot be updated after creation
  displayName: z.string().min(1, 'Display name is required').optional(),
  effectivePrice: z.number().positive('Effective price must be positive').optional(),
  totalComboValue: z.number().positive('Total combo value must be positive').optional().nullable(),
  badge: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().optional(),
  benefits: z.array(
    z.object({
      id: z.string().optional(),
      benefitType: z.enum(['frame', 'lens', 'eyewear', 'addon', 'voucher']),
      label: z.string().min(1, 'Label is required'),
      maxValue: z.number().optional().nullable(),
      constraints: z.string().optional().nullable(),
    })
  ).optional(),
});

/**
 * GET /api/admin/combo-tiers/[id]
 * Get a single combo tier
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const user = await authenticate(request);
    authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN)(user);

    const { id } = await Promise.resolve(params);

    const tier = await prisma.comboTier.findUnique({
      where: { id },
      include: {
        benefits: {
          orderBy: {
            benefitType: 'asc',
          },
        },
        rules: {
          orderBy: {
            ruleType: 'asc',
          },
        },
      },
    });

    if (!tier) {
      throw new NotFoundError('Combo tier');
    }

    return Response.json({
      success: true,
      data: tier,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PUT /api/admin/combo-tiers/[id]
 * Update a combo tier
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const user = await authenticate(request);
    authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN)(user);

    const { id } = await Promise.resolve(params);
    const body = await request.json();
    const validated = updateComboTierSchema.parse(body);

    // Check if tier exists
    const existing = await prisma.comboTier.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundError('Combo tier');
    }

    // Update tier
    const updateData: any = {};
    // comboCode is immutable - don't allow updates
    // if (validated.comboCode !== undefined) updateData.comboCode = validated.comboCode;
    if (validated.displayName !== undefined) updateData.displayName = validated.displayName;
    if (validated.effectivePrice !== undefined) updateData.effectivePrice = validated.effectivePrice;
    if (validated.totalComboValue !== undefined) updateData.totalComboValue = validated.totalComboValue;
    if (validated.badge !== undefined) updateData.badge = validated.badge;
    if (validated.isActive !== undefined) updateData.isActive = validated.isActive;
    if (validated.sortOrder !== undefined) updateData.sortOrder = validated.sortOrder;

    // Update benefits if provided
    if (validated.benefits !== undefined) {
      // Delete existing benefits (comboCode is the FK to ComboTier.id)
      await prisma.comboBenefit.deleteMany({
        where: { comboCode: id },
      });

      // Create new benefits (comboCode references ComboTier.id)
      await prisma.comboBenefit.createMany({
        data: validated.benefits.map(b => ({
          comboCode: id, // This is the ComboTier.id (ObjectId)
          benefitType: b.benefitType,
          label: b.label,
          maxValue: b.maxValue || null,
          constraints: b.constraints || null,
        })),
      });
    }

    const updated = await prisma.comboTier.update({
      where: { id },
      data: updateData,
      include: {
        benefits: {
          orderBy: {
            benefitType: 'asc',
          },
        },
        rules: {
          orderBy: {
            ruleType: 'asc',
          },
        },
      },
    });

    return Response.json({
      success: true,
      data: updated,
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

/**
 * DELETE /api/admin/combo-tiers/[id]
 * Delete a combo tier
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const user = await authenticate(request);
    authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN)(user);

    const { id } = await Promise.resolve(params);

    // Check if tier exists
    const existing = await prisma.comboTier.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundError('Combo tier');
    }

    // Delete tier (benefits will be cascade deleted)
    await prisma.comboTier.delete({
      where: { id },
    });

    return Response.json({
      success: true,
      message: 'Combo tier deleted successfully',
    });
  } catch (error) {
    return handleApiError(error);
  }
}

