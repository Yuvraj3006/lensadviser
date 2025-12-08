import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticate, authorize } from '@/middleware/auth.middleware';
import { handleApiError, NotFoundError } from '@/lib/errors';
import { UserRole } from '@prisma/client';

// DELETE /api/admin/frame-brands/[id] - Delete frame brand
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await authenticate(request);
    authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN)(user);

    const { id } = await params;

    const brand = await prisma.frameBrand.findUnique({
      where: {
        id,
        organizationId: user.organizationId,
      },
    });

    if (!brand) {
      throw new NotFoundError('Frame brand');
    }

    await prisma.frameBrand.delete({
      where: { id },
    });

    return Response.json({
      success: true,
      message: 'Brand deleted successfully',
    });
  } catch (error) {
    return handleApiError(error);
  }
}

