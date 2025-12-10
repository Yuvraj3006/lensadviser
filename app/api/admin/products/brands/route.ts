import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticate } from '@/middleware/auth.middleware';
import { handleApiError } from '@/lib/errors';

/**
 * GET /api/admin/products/brands
 * Get unique brands for frames/sunglasses (from ProductBrand, not RetailProduct)
 * NOTE: FRAME and SUNGLASS are manual-entry only, no SKU products exist
 */
export async function GET(request: NextRequest) {
  try {
    const user = await authenticate(request);

    // Get all active frame/sunglass brands from ProductBrand (not RetailProduct)
    // FRAME and SUNGLASS are manual-entry only, so we get brands directly
    const brands = await prisma.productBrand.findMany({
      where: {
        isActive: true,
        OR: [
          { productTypes: { has: 'FRAME' } },
          { productTypes: { has: 'SUNGLASS' } },
        ],
      },
      include: {
        subBrands: {
          orderBy: {
            name: 'asc',
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    // Extract unique brand names
    const brandNames = brands.map((b) => b.name).sort();

    // Extract unique sub-brands across all brands
    const allSubBrands = brands.flatMap((b) => b.subBrands.map((sb) => sb.name));
    const uniqueSubBrands = Array.from(new Set(allSubBrands)).sort();

    // Get brand-subBrand combinations
    const brandSubBrandMap: Record<string, string[]> = {};
    brands.forEach((brand) => {
      if (brand.subBrands.length > 0) {
        brandSubBrandMap[brand.name] = brand.subBrands.map((sb) => sb.name).sort();
      }
    });

    return Response.json({
      success: true,
      data: {
        brands: brandNames,
        subBrands: uniqueSubBrands,
        brandSubBrandMap,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

