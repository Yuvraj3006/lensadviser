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

// POST /api/admin/lens-products - Create new lens product
// NOTE: This endpoint is kept for backward compatibility with /admin/lens-products page
const createLensProductSchema = z.object({
  itCode: z.string().min(1),
  name: z.string().min(1),
  lensBrandId: z.string().min(1), // Will be converted to brandLine
  type: z.enum(['SINGLE_VISION', 'PROGRESSIVE', 'BIFOCAL', 'ANTI_FATIGUE', 'MYOPIA_CONTROL']),
  index: z.enum(['INDEX_156', 'INDEX_160', 'INDEX_167', 'INDEX_174']),
  tintOption: z.enum(['CLEAR', 'TINT', 'PHOTOCHROMIC', 'TRANSITION']).optional().default('CLEAR'),
  mrp: z.number().min(0).optional(),
  offerPrice: z.number().min(0).optional(),
  baseOfferPrice: z.number().min(0).optional(),
  addOnPrice: z.number().min(0).optional().nullable(),
  sphMin: z.number().optional(),
  sphMax: z.number().optional(),
  cylMax: z.number().optional(),
  addMin: z.number().optional().nullable(),
  addMax: z.number().optional().nullable(),
  yopoEligible: z.boolean().optional().default(false),
  isActive: z.boolean().optional().default(true),
});

export async function POST(request: NextRequest) {
  try {
    const user = await authenticate(request);
    authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN)(user);

    const body = await request.json();
    const validated = createLensProductSchema.parse(body);

    // Convert lensBrandId to brandLine
    const brand = await prisma.lensBrand.findUnique({
      where: { id: validated.lensBrandId },
    });

    if (!brand) {
      return Response.json(
        {
          success: false,
          error: {
            code: 'INVALID_BRAND',
            message: 'Lens brand not found',
          },
        },
        { status: 400 }
      );
    }

    // Check for duplicate IT code
    const existing = await prisma.lensProduct.findUnique({
      where: { itCode: validated.itCode },
    });

    if (existing) {
      return Response.json(
        {
          success: false,
          error: {
            code: 'DUPLICATE_IT_CODE',
            message: 'Lens product with this IT code already exists',
          },
        },
        { status: 409 }
      );
    }

    // Create lens product
    const baseOfferPrice = validated.baseOfferPrice || validated.offerPrice || 0;
    const lens = await prisma.lensProduct.create({
      data: {
        itCode: validated.itCode,
        name: validated.name,
        brandLine: brand.name, // Use brand name as brandLine
        visionType: validated.type as VisionType,
        lensIndex: validated.index as LensIndex,
        tintOption: validated.tintOption as any,
        baseOfferPrice: baseOfferPrice,
        addOnPrice: validated.addOnPrice || null,
        category: 'STANDARD', // Default category
        yopoEligible: validated.yopoEligible ?? false,
        deliveryDays: 4, // Default
        isActive: validated.isActive ?? true,
        rxRanges: (validated.sphMin !== undefined || validated.sphMax !== undefined) ? {
          create: [{
            sphMin: validated.sphMin ?? -10,
            sphMax: validated.sphMax ?? 10,
            cylMin: validated.cylMax !== undefined ? -validated.cylMax : -4,
            cylMax: validated.cylMax ?? 4,
            addOnPrice: 0,
          }],
        } : undefined,
      },
    });

    return Response.json({
      success: true,
      data: {
        id: lens.id,
        itCode: lens.itCode,
        name: lens.name,
        brandLine: lens.brandLine,
        visionType: lens.visionType,
        lensIndex: lens.lensIndex,
        tintOption: lens.tintOption,
        category: lens.category,
        baseOfferPrice: lens.baseOfferPrice,
        addOnPrice: lens.addOnPrice,
        yopoEligible: lens.yopoEligible,
        isActive: lens.isActive,
        createdAt: lens.createdAt,
        updatedAt: lens.updatedAt,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Validation failed',
            details: error.issues,
          },
        },
        { status: 400 }
      );
    }
    return handleApiError(error);
  }
}
