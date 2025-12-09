import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticate } from '@/middleware/auth.middleware';
import { handleApiError } from '@/lib/errors';

/**
 * GET /api/admin/products/brands
 * Get unique brands from products (frames only)
 */
export async function GET(request: NextRequest) {
  try {
    const user = await authenticate(request);

    // Get all active frames from RetailProduct
    const products = await prisma.retailProduct.findMany({
      where: {
        type: 'FRAME',
        isActive: true,
      },
      include: {
        brand: {
          select: {
            id: true,
            name: true,
          },
        },
        subBrand: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Extract unique brands from ProductBrand
    const brands = Array.from(
      new Set(products.map((p) => p.brand.name).filter((b): b is string => !!b))
    ).sort();

    // Extract unique sub-brands
    const subBrands = Array.from(
      new Set(
        products
          .map((p) => p.subBrand?.name)
          .filter((b): b is string => !!b)
      )
    ).sort();

    // Get brand-subBrand combinations
    const brandSubBrandMap: Record<string, string[]> = {};
    products.forEach((p) => {
      if (p.brand.name && p.subBrand?.name) {
        if (!brandSubBrandMap[p.brand.name]) {
          brandSubBrandMap[p.brand.name] = [];
        }
        if (!brandSubBrandMap[p.brand.name].includes(p.subBrand.name)) {
          brandSubBrandMap[p.brand.name].push(p.subBrand.name);
        }
      }
    });

    // Sort brand lines for each brand
    Object.keys(brandSubBrandMap).forEach((brand) => {
      brandSubBrandMap[brand].sort();
    });

    return Response.json({
      success: true,
      data: {
        brands,
        subBrands,
        brandSubBrandMap,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

