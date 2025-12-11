import { NextRequest } from 'next/server';
import { handleApiError } from '@/lib/errors';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/public/accessories
 * Get all active accessories (public endpoint, no auth required)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get('storeId');

    // If storeId provided, get organization from store
    let organizationId: string | undefined;
    if (storeId) {
      const store = await prisma.store.findUnique({
        where: { id: storeId },
        select: { organizationId: true },
      });
      if (store) {
        organizationId = store.organizationId;
      }
    }

    // Fetch all active accessories
    const accessories = await prisma.retailProduct.findMany({
      where: {
        type: 'ACCESSORY',
        isActive: true,
      },
      include: {
        brand: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return Response.json({
      success: true,
      data: accessories.map((acc) => ({
        id: acc.id,
        name: acc.name || 'Accessory',
        description: (acc as any).description || '',
        price: acc.mrp || 0,
        mrp: acc.mrp || 0,
        brand: acc.brand,
        sku: acc.sku,
      })),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
