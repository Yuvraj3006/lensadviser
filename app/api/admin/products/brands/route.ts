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

    // Get all active frames (EYEGLASSES)
    const products = await prisma.product.findMany({
      where: {
        organizationId: user.organizationId,
        category: 'EYEGLASSES',
        isActive: true,
      },
      select: {
        brand: true,
        brandLine: true,
      },
    });

    // Extract unique brands
    const brands = Array.from(
      new Set(products.map((p) => p.brand).filter((b): b is string => !!b))
    ).sort();

    // Extract unique brand lines (as sub-brands)
    const brandLines = Array.from(
      new Set(
        products.map((p) => p.brandLine).filter((b): b is NonNullable<typeof b> => !!b)
      )
    ).sort();

    // Get brand-brandLine combinations
    const brandSubBrandMap: Record<string, string[]> = {};
    products.forEach((p) => {
      if (p.brand && p.brandLine) {
        if (!brandSubBrandMap[p.brand]) {
          brandSubBrandMap[p.brand] = [];
        }
        if (!brandSubBrandMap[p.brand].includes(p.brandLine)) {
          brandSubBrandMap[p.brand].push(p.brandLine);
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
        subBrands: brandLines,
        brandSubBrandMap,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

