import { NextRequest } from 'next/server';
import { handleApiError, ValidationError } from '@/lib/errors';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/public/products/eligible
 * Get products eligible for upsell based on price range
 */
export async function POST(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const storeId = searchParams.get('storeId');
    const minPrice = parseFloat(searchParams.get('minPrice') || '0');
    const maxPrice = parseFloat(searchParams.get('maxPrice') || '10000');
    const limit = parseInt(searchParams.get('limit') || '20');

    if (!storeId) {
      throw new ValidationError('Store ID is required');
    }

    // Get store to find organization
    const store = await prisma.store.findUnique({
      where: { id: storeId },
    });

    if (!store) {
      throw new ValidationError('Store not found');
    }

    // NOTE: FRAME and SUNGLASS are manual-entry only, no SKU products exist
    // This endpoint should only return CONTACT_LENS and ACCESSORY products for upsell
    // Frames/Sunglasses cannot be used for upsell as they are not catalog products
    
    // Fetch retail products (CONTACT_LENS and ACCESSORY only) for upsell
    const products = await prisma.retailProduct.findMany({
      where: {
        type: { in: ['CONTACT_LENS', 'ACCESSORY'] },
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
      take: limit * 2, // Fetch more to filter by price
    });

    // Filter products by price range and map to include pricing
    const eligibleProducts = products
      .map(product => {
        const price = product.mrp;
        return {
          id: product.id,
          name: product.name || `${product.brand.name} ${product.type}`,
          brand: product.brand.name,
          imageUrl: null,
          basePrice: product.mrp,
          storePrice: product.mrp,
          inStock: true,
          sku: product.sku || product.id,
          category: product.type,
        };
      })
      .filter(product => {
        const price = product.storePrice;
        return price >= minPrice && price <= maxPrice;
      })
      .slice(0, limit);

    return Response.json({
      success: true,
      data: eligibleProducts,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

