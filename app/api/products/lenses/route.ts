import { NextRequest } from 'next/server';
import { handleApiError } from '@/lib/errors';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/products/lenses
 * List all lens products
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get('category') || 'EYEGLASSES';
    const organizationId = searchParams.get('organizationId');

    if (!organizationId) {
      return Response.json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'organizationId is required' },
      }, { status: 400 });
    }

    const products = await prisma.product.findMany({
      where: {
        organizationId,
        category: category as any,
        isActive: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    return Response.json({
      success: true,
      data: products.map((p) => ({
        id: p.id,
        itCode: p.itCode || p.sku,
        name: p.name,
        brandLine: p.brandLine,
        index: p.lensIndex || null,
        price: p.basePrice,
        yopoEligible: p.yopoEligible,
      })),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

