import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleApiError } from '@/lib/errors';

// GET /api/public/frame-brands?storeCode=STORE-CODE
// Public endpoint to get frame brands for a store
// Gets brands and sub-brands from Products table
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const storeCode = searchParams.get('storeCode');

    if (!storeCode) {
      return Response.json(
        {
          success: false,
          error: {
            code: 'MISSING_STORE_CODE',
            message: 'Store code is required',
          },
        },
        { status: 400 }
      );
    }

    // Get store to find organization
    const store = await prisma.store.findFirst({
      where: {
        code: storeCode.toUpperCase(),
        isActive: true,
      },
      select: {
        organizationId: true,
      },
    });

    if (!store) {
      return Response.json(
        {
          success: false,
          error: {
            code: 'INVALID_STORE',
            message: 'Invalid or inactive store code',
          },
        },
        { status: 404 }
      );
    }

    // Get brands and sub-brands from FrameBrand table (same as admin/products page uses)
    const brands = await prisma.frameBrand.findMany({
      where: {
        organizationId: store.organizationId,
        isActive: true,
      },
      include: {
        subBrands: {
          where: {
            isActive: true,
          },
          orderBy: {
            subBrandName: 'asc',
          },
        },
      },
      orderBy: {
        brandName: 'asc',
      },
    });

    // Map to response format and add Lenstrack sub-categories
    const brandsData = brands.map((brand) => {
      // For Lenstrack brand, use hardcoded sub-categories
      if (brand.brandName.toLowerCase() === 'lenstrack') {
        return {
          id: brand.id,
          brandName: brand.brandName,
          subBrands: [
            { id: 'lenstrack-essentials', subBrandName: 'Essentials' },
            { id: 'lenstrack-alfa', subBrandName: 'Alfa' },
            { id: 'lenstrack-advanced', subBrandName: 'Advanced' },
            { id: 'lenstrack-luxury', subBrandName: 'Luxury Line' },
          ],
        };
      }

      return {
        id: brand.id,
        brandName: brand.brandName,
        subBrands: brand.subBrands.map((sub) => ({
          id: sub.id,
          subBrandName: sub.subBrandName,
        })),
      };
    });

    return Response.json({
      success: true,
      data: brandsData,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
