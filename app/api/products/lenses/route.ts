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

    const products = await prisma.lensProduct.findMany({
      where: {
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
        itCode: p.itCode,
        name: p.name,
        brandLine: p.brandLine,
        index: p.lensIndex,
        price: p.baseOfferPrice,
        yopoEligible: p.yopoEligible,
      })),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

