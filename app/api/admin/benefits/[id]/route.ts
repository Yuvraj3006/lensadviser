import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticate, authorize } from '@/middleware/auth.middleware';
import { handleApiError, NotFoundError } from '@/lib/errors';
import { UserRole } from '@/lib/constants';
import { z } from 'zod';

const updateBenefitSchema = z.object({
  name: z.string().min(1, 'Benefit name is required').optional(),
  description: z.string().optional(),
  pointWeight: z.number().min(0).max(10).optional(),
  maxScore: z.number().min(0).max(10).optional(),
  isActive: z.boolean().optional(),
});

/**
 * PUT /api/admin/benefits/[id]
 * Update a benefit
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
    const validated = updateBenefitSchema.parse(body);

    const benefit = await prisma.benefit.findFirst({
      where: {
        id,
        organizationId: user.organizationId,
      },
    });

    if (!benefit) {
      throw new NotFoundError('Benefit');
    }

    const updated = await prisma.benefit.update({
      where: { id },
      data: {
        ...(validated.name !== undefined && { name: validated.name }),
        ...(validated.description !== undefined && { description: validated.description || null }),
        ...(validated.pointWeight !== undefined && { pointWeight: validated.pointWeight }),
        ...(validated.maxScore !== undefined && { maxScore: validated.maxScore }),
        ...(validated.isActive !== undefined && { isActive: validated.isActive }),
      },
    });

    return Response.json({
      success: true,
      data: {
        id: updated.id,
        code: updated.code,
        name: updated.name,
        description: updated.description,
        pointWeight: updated.pointWeight,
        maxScore: updated.maxScore,
        isActive: updated.isActive,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
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

/**
 * DELETE /api/admin/benefits/[id]
 * Delete a benefit (soft delete by setting isActive to false)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await authenticate(request);
    authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN)(user);

    const { id } = await params;

    const benefit = await prisma.benefit.findFirst({
      where: {
        id,
        organizationId: user.organizationId,
      },
    });

    if (!benefit) {
      throw new NotFoundError('Benefit');
    }

    // Soft delete by setting isActive to false
    await prisma.benefit.update({
      where: { id },
      data: { isActive: false },
    });

    return Response.json({
      success: true,
      message: 'Benefit deleted successfully',
    });
  } catch (error) {
    return handleApiError(error);
  }
}

