import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticate, authorize } from '@/middleware/auth.middleware';
import { UserRole } from '@/lib/constants';
import { handleApiError, NotFoundError, ValidationError } from '@/lib/errors';
import { z } from 'zod';

const updateBenefitFeatureSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().optional().nullable(),
  // Benefit-specific fields
  pointWeight: z.number().min(0).max(10).optional().nullable(),
  maxScore: z.number().min(0).max(10).optional().nullable(),
  // Feature-specific fields
  category: z.enum(['DURABILITY', 'COATING', 'PROTECTION', 'LIFESTYLE', 'VISION']).optional().nullable(),
  displayOrder: z.number().int().min(0).optional().nullable(),
  isActive: z.boolean().optional(),
});

/**
 * GET /api/admin/benefit-features/[id]
 * Get a single benefit-feature
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await authenticate(request);
    authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN)(user);

    const { id } = await params;

    const benefitFeature = await (prisma as any).benefitFeature.findUnique({
      where: { id },
    });

    if (!benefitFeature) {
      throw new NotFoundError('BenefitFeature');
    }

    // Check organization access for benefits
    if (benefitFeature.type === 'BENEFIT' && benefitFeature.organizationId !== user.organizationId) {
      throw new NotFoundError('BenefitFeature');
    }

    return Response.json({
      success: true,
      data: benefitFeature,
    });
  } catch (error: any) {
    console.error('[benefit-features] GET Error:', error);
    return handleApiError(error);
  }
}

/**
 * PUT /api/admin/benefit-features/[id]
 * Update a benefit-feature
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await authenticate(request);
    authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN)(user);

    const { id } = await params;
    const body = await request.json();
    const validated = updateBenefitFeatureSchema.parse(body);

    // Verify benefit-feature exists
    const existing = await (prisma as any).benefitFeature.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundError('BenefitFeature');
    }

    // Check organization access for benefits
    if (existing.type === 'BENEFIT' && existing.organizationId !== user.organizationId) {
      throw new NotFoundError('BenefitFeature');
    }

    // Build update data (only include fields relevant to the type)
    const updateData: any = {};
    
    if (validated.name !== undefined) updateData.name = validated.name;
    if (validated.description !== undefined) updateData.description = validated.description;
    if (validated.isActive !== undefined) updateData.isActive = validated.isActive;

    if (existing.type === 'BENEFIT') {
      if (validated.pointWeight !== undefined) updateData.pointWeight = validated.pointWeight;
      if (validated.maxScore !== undefined) updateData.maxScore = validated.maxScore;
    } else if (existing.type === 'FEATURE') {
      if (validated.category !== undefined) updateData.category = validated.category;
      if (validated.displayOrder !== undefined) updateData.displayOrder = validated.displayOrder;
    }

    const updated = await (prisma as any).benefitFeature.update({
      where: { id },
      data: updateData,
    });

    return Response.json({
      success: true,
      data: updated,
    });
  } catch (error: any) {
    console.error('[benefit-features] PUT Error:', error);
    return handleApiError(error);
  }
}

/**
 * DELETE /api/admin/benefit-features/[id]
 * Delete (deactivate) a benefit-feature
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await authenticate(request);
    authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN)(user);

    const { id } = await params;

    // Verify benefit-feature exists
    const existing = await (prisma as any).benefitFeature.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundError('BenefitFeature');
    }

    // Check organization access for benefits
    if (existing.type === 'BENEFIT' && existing.organizationId !== user.organizationId) {
      throw new NotFoundError('BenefitFeature');
    }

    // Soft delete by setting isActive to false
    const updated = await (prisma as any).benefitFeature.update({
      where: { id },
      data: { isActive: false },
    });

    return Response.json({
      success: true,
      data: updated,
    });
  } catch (error: any) {
    console.error('[benefit-features] DELETE Error:', error);
    return handleApiError(error);
  }
}
