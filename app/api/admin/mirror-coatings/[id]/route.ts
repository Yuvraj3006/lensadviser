import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticate, authorize } from '@/middleware/auth.middleware';
import { handleApiError, ValidationError } from '@/lib/errors';
import { UserRole } from '@/lib/constants';
import { z } from 'zod';

const updateMirrorCoatingSchema = z.object({
  code: z.string().min(1).optional(),
  name: z.string().min(1).optional(),
  imageUrl: z.string().optional(),
  addOnPrice: z.number().min(0).optional(),
  isActive: z.boolean().optional(),
  displayOrder: z.number().optional(),
});

/**
 * PUT /api/admin/mirror-coatings/[id]
 * Update a mirror coating
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
    const validated = updateMirrorCoatingSchema.parse(body);

    // Check if coating exists
    const existing = await prisma.mirrorCoating.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new ValidationError('Mirror coating not found');
    }

    // Check code uniqueness if code is being updated
    if (validated.code && validated.code !== existing.code) {
      const codeExists = await prisma.mirrorCoating.findUnique({
        where: { code: validated.code },
      });
      if (codeExists) {
        throw new ValidationError('Mirror coating code already exists');
      }
    }

    const updated = await prisma.mirrorCoating.update({
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
 * DELETE /api/admin/mirror-coatings/[id]
 * Delete a mirror coating
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await authenticate(request);
    authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN)(user);

    const { id } = await params;

    // Check if coating is used by any lens products
    const usedByLenses = await prisma.lensProductMirrorCoating.findFirst({
      where: { mirrorCoatingId: id },
    });

    if (usedByLenses) {
      throw new ValidationError('Cannot delete mirror coating that is linked to lens products');
    }

    await prisma.mirrorCoating.delete({
      where: { id },
    });

    return Response.json({
      success: true,
      message: 'Mirror coating deleted successfully',
    });
  } catch (error) {
    return handleApiError(error);
  }
}

