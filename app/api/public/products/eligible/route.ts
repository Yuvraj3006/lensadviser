import { NextRequest } from 'next/server';
import { handleApiError, ValidationError } from '@/lib/errors';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/public/products/eligible
 * Get products eligible for upsell based on price range
 */
export async function GET(request: NextRequest) {
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

    // Fetch products with store products
    const products = await prisma.product.findMany({
      where: {
        organizationId: store.organizationId,
        isActive: true,
      },
      take: limit * 2, // Fetch more to filter by price
    });

    // Get store products for price filtering
    const productIds = products.map(p => p.id);
    const storeProducts = await prisma.storeProduct.findMany({
      where: {
        productId: { in: productIds },
        storeId,
        isAvailable: true,
      },
    });

    // Create a map of product prices
    const productPriceMap = new Map<string, number>();
    storeProducts.forEach(sp => {
      const price = sp.priceOverride ?? products.find(p => p.id === sp.productId)?.basePrice ?? 0;
      productPriceMap.set(sp.productId, price);
    });

    // Filter products by price range and map to include pricing
    const eligibleProducts = products
      .map(product => {
        const price = productPriceMap.get(product.id) ?? product.basePrice;
        return {
          ...product,
          storePrice: price,
          inStock: storeProducts.some(sp => sp.productId === product.id && sp.isAvailable),
        };
      })
      .filter(product => {
        const price = product.storePrice;
        return price >= minPrice && price <= maxPrice;
      })
      .slice(0, limit)
      .map(product => ({
        id: product.id,
        name: product.name,
        brand: product.brand,
        imageUrl: product.imageUrl,
        basePrice: product.basePrice,
        storePrice: product.storePrice,
        inStock: product.inStock,
        sku: product.sku,
        category: product.category,
      }));

    return Response.json({
      success: true,
      data: eligibleProducts,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

