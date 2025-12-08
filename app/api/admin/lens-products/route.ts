import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticate, authorize } from '@/middleware/auth.middleware';
import { handleApiError } from '@/lib/errors';
import { UserRole } from '@/lib/constants';
import { VisionType, LensIndex } from '@prisma/client';
import { z } from 'zod';

// NOTE: This route is deprecated. Use /api/admin/lenses instead.
// Keeping for backward compatibility but redirecting to new schema

// GET /api/admin/lens-products - List lens products (DEPRECATED - use /api/admin/lenses)
export async function GET(request: NextRequest) {
  try {
    const user = await authenticate(request);
    authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN)(user);

    const { searchParams } = new URL(request.url);
    const brandLine = searchParams.get('brandLine') || searchParams.get('brandId'); // Support both for backward compat
    const visionType = searchParams.get('visionType') || searchParams.get('type') as VisionType | null;
    const lensIndex = searchParams.get('lensIndex') || searchParams.get('index') as LensIndex | null;

    const where: any = {
      isActive: true,
    };

    if (brandLine) {
      where.brandLine = brandLine; // LensProduct uses brandLine string, not lensBrandId
    }

    if (visionType) {
      where.visionType = visionType;
    }

    if (lensIndex) {
      where.lensIndex = lensIndex;
    }

    const products = await prisma.lensProduct.findMany({
      where,
      orderBy: [
        { brandLine: 'asc' },
        { name: 'asc' },
      ],
    });

    return Response.json({
      success: true,
      data: products.map((product) => ({
        id: product.id,
        itCode: product.itCode,
        name: product.name,
        brandLine: product.brandLine, // Return brandLine instead of lensBrand object
        visionType: product.visionType,
        lensIndex: product.lensIndex,
        tintOption: product.tintOption,
        category: product.category,
        baseOfferPrice: product.baseOfferPrice,
        addOnPrice: product.addOnPrice,
        yopoEligible: product.yopoEligible,
        isActive: product.isActive,
        createdAt: product.createdAt,
        updatedAt: product.updatedAt,
      })),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

// POST /api/admin/lens-products - Create new lens product (DEPRECATED - use /api/admin/lenses)
export async function POST(request: NextRequest) {
  try {
    // Redirect to new endpoint schema
    return Response.json(
      {
        success: false,
        error: {
          code: 'DEPRECATED_ENDPOINT',
          message: 'This endpoint is deprecated. Please use POST /api/admin/lenses instead. See /api/admin/lenses for the correct schema.',
        },
      },
      { status: 410 } // 410 Gone - indicates resource is no longer available
    );
  } catch (error) {
    return handleApiError(error);
  }
}
