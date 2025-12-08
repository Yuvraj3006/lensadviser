import { NextRequest } from 'next/server';
import { handleApiError } from '@/lib/errors';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/products/lenses/price-matrix
 * Get price matrix filtered by prescription parameters
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const sph = searchParams.get('sph');
    const cyl = searchParams.get('cyl');
    const add = searchParams.get('add');
    const visionType = searchParams.get('visionType');
    const organizationId = searchParams.get('organizationId');

    if (!organizationId) {
      return Response.json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'organizationId is required' },
      }, { status: 400 });
    }

    // Get all lens products
    const products = await prisma.product.findMany({
      where: {
        organizationId,
        category: 'EYEGLASSES',
        isActive: true,
      },
    });

    // Filter and format for price matrix
    const priceMatrix = products
      .filter((p) => {
        // Add filtering logic based on prescription if needed
        // For now, return all active lenses
        return true;
      })
      .map((p) => {
        // Determine category based on features or other criteria
        let category = 'SV'; // Single Vision
        if (add && parseFloat(add) > 0) {
          category = visionType === 'BIFOCAL' ? 'BF' : 'PAL';
        }

        // Extract index from lensIndex
        const index = p.lensIndex || '1.56';

        return {
          itCode: p.itCode || p.sku,
          name: p.name,
          index,
          category,
          price: p.basePrice,
        };
      });

    return Response.json({
      success: true,
      data: priceMatrix,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

