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

    // Get brands and sub-brands from ProductBrand table (new unified brand system)
    const brands = await prisma.productBrand.findMany({
      where: {
        isActive: true,
        productTypes: { has: 'FRAME' }, // Only frame brands
      },
      include: {
        subBrands: {
          where: {
            // SubBrand doesn't have isActive, so we get all
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

    // Map to response format (ProductBrand -> FrameBrand format for backward compatibility)
    const brandsData = brands.map((brand) => {
      // For Lenstrack brand, use hardcoded sub-categories
      if (brand.name.toLowerCase() === 'lenstrack') {
        return {
          id: brand.id,
          brandName: brand.name, // Map name -> brandName for backward compatibility
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
        brandName: brand.name, // Map name -> brandName for backward compatibility
        subBrands: brand.subBrands.map((sub) => ({
          id: sub.id,
          subBrandName: sub.name, // Map name -> subBrandName for backward compatibility
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
