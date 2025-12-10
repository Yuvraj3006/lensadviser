import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticate, authorize } from '@/middleware/auth.middleware';
import { handleApiError, ValidationError } from '@/lib/errors';
import { UserRole } from '@/lib/constants';

/**
 * GET /api/admin/lenses/[id]/tint-colors
 * Get available tint colors and mirror coatings for a lens
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await authenticate(request);
    authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.STORE_MANAGER, UserRole.SALES_EXECUTIVE)(user);

    const { id } = await params;

    // Get lens with tint colors and mirror coatings
    const lens = await prisma.lensProduct.findUnique({
      where: { id },
      include: {
        tintColors: {
          include: {
            tintColor: true,
          },
        },
        mirrorCoatings: {
          include: {
            mirrorCoating: true,
          },
        },
      },
    });

    if (!lens) {
      throw new ValidationError('Lens not found');
    }

    // Extract tint colors and mirror coatings
    const tintColors = lens.tintColors
      .map(tc => tc.tintColor)
      .filter(tc => tc.isActive)
      .sort((a, b) => a.displayOrder - b.displayOrder);

    const mirrorCoatings = lens.mirrorCoatings
      .map(mc => mc.mirrorCoating)
      .filter(mc => mc.isActive)
      .sort((a, b) => a.displayOrder - b.displayOrder);

    return Response.json({
      success: true,
      data: {
        tintColors,
        mirrorCoatings,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

