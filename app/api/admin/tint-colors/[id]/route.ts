import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticate, authorize } from '@/middleware/auth.middleware';
import { handleApiError, ValidationError } from '@/lib/errors';
import { UserRole } from '@/lib/constants';
import { z } from 'zod';

const updateTintColorSchema = z.object({
  code: z.string().min(1).optional(),
  name: z.string().min(1).optional(),
  hexColor: z.string().optional(),
  imageUrl: z.string().optional(),
  category: z.enum(['SOLID', 'GRADIENT', 'FASHION']).optional(),
  darknessPercent: z.number().min(0).max(100).optional(),
  isPolarized: z.boolean().optional(),
  isMirror: z.boolean().optional(),
  isActive: z.boolean().optional(),
  displayOrder: z.number().optional(),
});

/**
 * PUT /api/admin/tint-colors/[id]
 * Update a tint color
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
    const validated = updateTintColorSchema.parse(body);

    // Check if color exists
    const existing = await prisma.tintColor.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new ValidationError('Tint color not found');
    }

    // Check code uniqueness if code is being updated
    if (validated.code && validated.code !== existing.code) {
      const codeExists = await prisma.tintColor.findUnique({
        where: { code: validated.code },
      });
      if (codeExists) {
        throw new ValidationError('Tint color code already exists');
      }
    }

    const updated = await prisma.tintColor.update({
      where: { id },
      data: validated,
    });

    return Response.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * DELETE /api/admin/tint-colors/[id]
 * Delete a tint color
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await authenticate(request);
    authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN)(user);

    const { id } = await params;

    // Check if color is used by any lens products
    const usedByLenses = await prisma.lensProductTintColor.findFirst({
      where: { tintColorId: id },
    });

    if (usedByLenses) {
      throw new ValidationError('Cannot delete tint color that is linked to lens products');
    }

    await prisma.tintColor.delete({
      where: { id },
    });

    return Response.json({
      success: true,
      message: 'Tint color deleted successfully',
    });
  } catch (error) {
    return handleApiError(error);
  }
}

