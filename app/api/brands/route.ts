import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleApiError } from '@/lib/errors';

/**
 * GET /api/brands?category=frame|sun&context=COMBO|REGULAR
 * Get brands filtered by category and context
 * Used by Lens Advisor for combo/regular path filtering
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category'); // 'frame' | 'sun'
    const context = searchParams.get('context'); // 'COMBO' | 'REGULAR' | null

    if (!category || !['frame', 'sun'].includes(category.toLowerCase())) {
      return Response.json(
        {
          success: false,
          error: {
            code: 'INVALID_CATEGORY',
            message: 'Category must be "frame" or "sun"',
          },
        },
        { status: 400 }
      );
    }

    const productType = category.toUpperCase() === 'SUN' ? 'SUNGLASS' : 'FRAME';

    // Build where clause
    const whereClause: any = {
      isActive: true,
      productTypes: { has: productType },
    };

    // If context is COMBO, filter by combo_allowed=true
    if (context === 'COMBO') {
      whereClause.comboAllowed = true;
    }
    // REGULAR shows all brands (no filtering needed)

    const brands = await prisma.productBrand.findMany({
      where: whereClause,
      include: {
        subBrands: {
          where: {
            isActive: true,
          },
          orderBy: {
            name: 'asc',
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    return Response.json({
      success: true,
      data: brands.map(brand => ({
        brand_id: brand.id,
        brand_name: brand.name,
        combo_allowed: brand.comboAllowed,
        yopo_allowed: brand.yopoAllowed,
        sub_brands: brand.subBrands.map(sub => ({
          id: sub.id,
          name: sub.name,
        })),
      })),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

