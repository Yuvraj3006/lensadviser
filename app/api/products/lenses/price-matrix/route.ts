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
    const products = await prisma.lensProduct.findMany({
      where: {
        isActive: true,
      },
    });

    // Filter and format for price matrix
    const priceMatrix = products
      .filter((p) => {
        // Filter by visionType if provided
        if (visionType) {
          return p.visionType === visionType;
        }
        return true;
      })
      .map((p) => {
        // Determine category based on visionType
        let category = 'SV'; // Single Vision
        if (p.visionType === 'PROGRESSIVE') {
          category = 'PAL';
        } else if (p.visionType === 'BIFOCAL') {
          category = 'BF';
        }

        // Extract index from lensIndex enum
        const indexMap: Record<string, string> = {
          'INDEX_156': '1.56',
          'INDEX_160': '1.60',
          'INDEX_167': '1.67',
          'INDEX_174': '1.74',
        };
        const index = indexMap[p.lensIndex] || '1.56';

        return {
          itCode: p.itCode,
          name: p.name,
          index,
          category,
          price: p.baseOfferPrice,
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

