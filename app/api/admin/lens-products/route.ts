import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticate, authorize } from '@/middleware/auth.middleware';
import { handleApiError } from '@/lib/errors';
import { UserRole } from '@/lib/constants';
import { VisionType, LensIndex } from '@prisma/client';
import { z } from 'zod';
import { getCachedValue, setCachedValue } from '@/lib/cache';
import { measureQuery } from '@/lib/performance';

// NOTE: This route is deprecated. Use /api/admin/lenses instead.
// Keeping for backward compatibility but redirecting to new schema

// GET /api/admin/lens-products - List lens products (DEPRECATED - use /api/admin/lenses)
export async function GET(request: NextRequest) {
  try {
    // Dummy auth bypass for development (same as other admin APIs)
    const user = {
      userId: '507f1f77bcf86cd799439011', // Valid MongoDB ObjectId
      organizationId: '507f1f77bcf86cd799439011', // Valid MongoDB ObjectId
      role: UserRole.ADMIN,
      storeId: null,
    };

    const { searchParams } = new URL(request.url);
    const brandLine = searchParams.get('brandLine') || searchParams.get('brandId'); // Support both for backward compat
    const visionType = searchParams.get('visionType') || searchParams.get('type') as VisionType | null;
    const lensIndex = searchParams.get('lensIndex') || searchParams.get('index') as LensIndex | null;
    const comboAllowed = searchParams.get('comboAllowed'); // Filter by comboAllowed

    const where: any = {
      isActive: true,
    };
    
    // Filter by comboAllowed if specified
    if (comboAllowed === 'true') {
      where.comboAllowed = true;
    }

    if (brandLine) {
      where.brandLine = brandLine; // LensProduct uses brandLine string, not lensBrandId
    }

    if (visionType) {
      where.visionType = visionType;
    }

    if (lensIndex) {
      where.lensIndex = lensIndex;
    }

    const products = await measureQuery('lensProduct.findMany', () =>
      prisma.lensProduct.findMany({
      where,
      include: {
        rxRanges: {
          orderBy: { createdAt: 'asc' },
        },
        features: {
          include: {
            feature: {
              select: {
                code: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: [
        { brandLine: 'asc' },
        { name: 'asc' },
      ],
      })
    );

    const brandCacheKey = 'lens-brand-map';
    let brandMap = getCachedValue<Map<string, { id: string; name: string }>>(brandCacheKey);
    if (!brandMap) {
      const brands = await measureQuery('lensBrand.findMany', () => prisma.lensBrand.findMany());
      brandMap = new Map(brands.map(b => [b.name, { id: b.id, name: b.name }]));
      setCachedValue(brandCacheKey, brandMap, 120_000);
    }

    return Response.json({
      success: true,
      data: products.map((product) => {
        const brand = brandMap.get(product.brandLine);
        const rxRange = product.rxRanges[0]; // Get first Rx range for backward compatibility
        return {
          id: product.id,
          itCode: product.itCode,
          name: product.name,
          lensBrand: brand ? { id: brand.id, name: brand.name } : null,
          brandLine: product.brandLine, // Keep for backward compatibility
          type: product.visionType, // Map visionType to type for frontend compatibility
          visionType: product.visionType,
          index: product.lensIndex, // Map lensIndex to index for frontend compatibility
          lensIndex: product.lensIndex,
          tintOption: product.tintOption,
          category: product.category,
          deliveryDays: product.deliveryDays,
          mrp: product.mrp || product.baseOfferPrice, // Use actual MRP if available
          offerPrice: product.baseOfferPrice,
          baseOfferPrice: product.baseOfferPrice,
          addOnPrice: product.addOnPrice,
          sphMin: rxRange?.sphMin ?? -10, // Default values if no Rx range (backward compat)
          sphMax: rxRange?.sphMax ?? 10,
          cylMin: rxRange?.cylMin ?? -4,
          cylMax: rxRange?.cylMax ?? 4,
          rxRangeAddOnPrice: rxRange?.addOnPrice ?? 0,
          rxRanges: product.rxRanges.map((r) => ({
            sphMin: r.sphMin,
            sphMax: r.sphMax,
            cylMin: r.cylMin,
            cylMax: r.cylMax,
            addOnPrice: r.addOnPrice,
          })),
          featureCodes: product.features.map((pf) => pf.feature.code), // Include feature codes
          yopoEligible: product.yopoEligible,
          comboAllowed: product.comboAllowed,
          isActive: product.isActive,
          createdAt: product.createdAt,
          updatedAt: product.updatedAt,
        };
      }),
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
  category: z.enum(['ECONOMY', 'STANDARD', 'PREMIUM', 'ULTRA']).optional().default('STANDARD'),
  deliveryDays: z.number().int().min(1).optional().default(4),
  mrp: z.number().min(0).optional(),
  offerPrice: z.number().min(0).optional(),
  baseOfferPrice: z.number().min(0).optional(),
  addOnPrice: z.number().min(0).optional().nullable(),
  rxRanges: z.array(z.object({
    sphMin: z.number(),
    sphMax: z.number(),
    cylMin: z.number(),
    cylMax: z.number(),
    addMin: z.number().nullable().optional(),
    addMax: z.number().nullable().optional(),
    addOnPrice: z.number().min(0),
  })).optional(),
  yopoEligible: z.boolean().optional().default(false),
  comboAllowed: z.boolean().optional().default(false),
  isActive: z.boolean().optional().default(true),
  featureCodes: z.array(z.string()).optional().default([]), // Feature codes for mapping
  benefitScores: z.record(z.string(), z.number().min(0).max(3)).optional().default({}), // Benefit code -> score (0-3)
});

export async function POST(request: NextRequest) {
  try {
    // Dummy auth bypass for development (same as other admin APIs)
    const user = {
      userId: '507f1f77bcf86cd799439011', // Valid MongoDB ObjectId
      organizationId: '507f1f77bcf86cd799439011', // Valid MongoDB ObjectId
      role: UserRole.ADMIN,
      storeId: null,
    };

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

    // Get feature IDs from codes if provided
    const features = validated.featureCodes && validated.featureCodes.length > 0
      ? await prisma.feature.findMany({
          where: {
            code: { in: validated.featureCodes },
          },
          select: { id: true },
        })
      : [];

    // Get benefit IDs from codes if provided
    const benefitCodes = validated.benefitScores 
      ? Object.keys(validated.benefitScores).filter(code => (validated.benefitScores?.[code] || 0) > 0)
      : [];
    
    const benefits = benefitCodes.length > 0
      ? await (prisma as any).benefitFeature.findMany({
          where: {
            organizationId: user.organizationId,
            type: 'BENEFIT',
            code: { in: benefitCodes },
          },
          select: { id: true, code: true },
        })
      : [];

    // Create lens product
    const baseOfferPrice = validated.baseOfferPrice || validated.offerPrice || 0;
    const mrp = validated.mrp || baseOfferPrice; // Use MRP if provided, otherwise use baseOfferPrice as MRP
    const lens = await prisma.lensProduct.create({
      data: {
        itCode: validated.itCode,
        name: validated.name,
        brandLine: brand.name, // Use brand name as brandLine
        visionType: validated.type as VisionType,
        lensIndex: validated.index as LensIndex,
        tintOption: validated.tintOption as any,
        mrp: mrp || null, // Save MRP
        baseOfferPrice: baseOfferPrice,
        addOnPrice: validated.addOnPrice || null,
        category: validated.category as any || 'STANDARD',
        yopoEligible: validated.yopoEligible ?? false,
        comboAllowed: validated.comboAllowed ?? false,
        deliveryDays: validated.deliveryDays ?? 4,
        isActive: validated.isActive ?? true,
        rxRanges: validated.rxRanges && validated.rxRanges.length > 0 ? {
          create: validated.rxRanges.map((range) => ({
            sphMin: range.sphMin,
            sphMax: range.sphMax,
            cylMin: range.cylMin,
            cylMax: range.cylMax,
            addOnPrice: range.addOnPrice,
          })),
        } : undefined,
        features: features.length > 0 ? {
          create: features.map((f) => ({
            featureId: f.id,
          })),
        } : undefined,
        benefits: benefits.length > 0 ? {
          create: benefits.map((b: { id: string; code: string }) => ({
            benefitId: b.id,
            score: validated.benefitScores?.[b.code] || 0,
          })),
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
        mrp: lens.mrp,
        baseOfferPrice: lens.baseOfferPrice,
        addOnPrice: lens.addOnPrice,
        yopoEligible: lens.yopoEligible,
        comboAllowed: lens.comboAllowed,
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
