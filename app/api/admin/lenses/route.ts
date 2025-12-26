import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticate, authorize } from '@/middleware/auth.middleware';
import { handleApiError } from '@/lib/errors';
import { UserRole } from '@/lib/constants';
import { VisionType, LensIndex, TintOption, LensCategory } from '@prisma/client';
import { parsePaginationParams, getPaginationSkip, createPaginationResponse } from '@/lib/pagination';
import { logger } from '@/lib/logger';
import { z } from 'zod';

const rxRangeSchema = z.object({
  sphMin: z.number(),
  sphMax: z.number(),
  cylMin: z.number(),
  cylMax: z.number(),
  addOnPrice: z.number().default(0),
});

const createLensSchema = z.object({
  itCode: z.string().min(1, 'IT Code is required'),
  name: z.string().min(1, 'Name is required'),
  brandLine: z.string().min(1, 'Brand Line is required'),
  visionType: z.enum(['SINGLE_VISION', 'PROGRESSIVE', 'BIFOCAL', 'ANTI_FATIGUE', 'MYOPIA_CONTROL']),
  lensIndex: z.enum(['INDEX_156', 'INDEX_160', 'INDEX_167', 'INDEX_174']),
  tintOption: z.enum(['CLEAR', 'TINT', 'PHOTOCHROMIC', 'TRANSITION']),
  mrp: z.number().min(0).optional().nullable(), // MRP (Maximum Retail Price)
  baseOfferPrice: z.number().min(0, 'Base offer price must be positive'),
  addOnPrice: z.number().min(0).optional().nullable(),
  category: z.enum(['ECONOMY', 'STANDARD', 'PREMIUM', 'ULTRA']),
  yopoEligible: z.boolean().optional().default(true),
  deliveryDays: z.number().int().min(1).optional().default(4),
  rxRanges: z.array(rxRangeSchema).optional().default([]),
  featureCodes: z.array(z.string()).optional().default([]),
  benefitScores: z.record(z.string(), z.number().min(0).max(3)).optional().default({}),
});

// GET /api/admin/lenses - List lenses with filters
export async function GET(request: NextRequest) {
  try {
    const user = await authenticate(request);
    authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN)(user);

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const visionType = searchParams.get('visionType') as VisionType | null;
    const index = searchParams.get('index') as LensIndex | null;
    const brandLine = searchParams.get('brandLine') || '';
    
    // Parse pagination parameters
    const { page, pageSize } = parsePaginationParams(searchParams);
    const skip = getPaginationSkip(page, pageSize);

    const where: any = {};

    if (search) {
      where.OR = [
        { itCode: { contains: search } },
        { name: { contains: search } },
      ];
    }

    if (visionType) {
      where.visionType = visionType;
    }

    if (index) {
      where.lensIndex = index;
    }

    if (brandLine) {
      where.brandLine = brandLine;
    }

    // Get total count and lenses in parallel
    const [total, lenses] = await Promise.all([
      prisma.lensProduct.count({ where }),
      prisma.lensProduct.findMany({
        where,
        skip,
        take: pageSize,
        include: {
          rxRanges: true,
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
          benefits: {
            include: {
              benefit: {
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
      }),
    ]);

    logger.info('Lenses list fetched', { 
      userId: user.userId, 
      total, 
      page, 
      pageSize,
      returned: lenses.length 
    });

    return Response.json({
      success: true,
      data: createPaginationResponse(
        lenses.map((lens) => ({
        id: lens.id,
        itCode: lens.itCode,
        name: lens.name,
        brandLine: lens.brandLine,
        visionType: lens.visionType,
        lensIndex: lens.lensIndex,
        tintOption: lens.tintOption,
        mrp: lens.mrp,
        baseOfferPrice: lens.baseOfferPrice,
        addOnPrice: lens.addOnPrice,
        category: lens.category,
        yopoEligible: lens.yopoEligible,
        deliveryDays: lens.deliveryDays,
        isActive: lens.isActive,
        rxRanges: lens.rxRanges,
        featureCodes: lens.features.map((f) => f.feature.code),
        benefitScores: lens.benefits.reduce((acc, b) => {
          acc[b.benefit.code] = b.score;
          return acc;
        }, {} as Record<string, number>),
        createdAt: lens.createdAt,
        updatedAt: lens.updatedAt,
      })),
        total,
        page,
        pageSize
      ),
    });
  } catch (error) {
    logger.error('GET /api/admin/lenses error', { userId: user.userId }, error as Error);
    return handleApiError(error);
  }
}

// POST /api/admin/lenses - Create lens product
export async function POST(request: NextRequest) {
  try {
    const user = await authenticate(request);
    authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN)(user);

    const body = await request.json();
    const validated = createLensSchema.parse(body);

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

    // Get feature IDs from codes
    const features = await prisma.feature.findMany({
      where: {
        code: { in: validated.featureCodes || [] },
      },
      select: { id: true, code: true },
    });

    // Get benefit IDs from codes (benefits are organization-specific)
    const benefits = await prisma.benefit.findMany({
      where: {
        organizationId: user.organizationId,
        code: { in: Object.keys(validated.benefitScores || {}) },
      },
      select: { id: true, code: true },
    });

    // Create lens product with relations
    const lens = await prisma.lensProduct.create({
      data: {
        itCode: validated.itCode,
        name: validated.name,
        brandLine: validated.brandLine,
        visionType: validated.visionType as VisionType,
        lensIndex: validated.lensIndex as LensIndex,
        tintOption: validated.tintOption as TintOption,
        mrp: validated.mrp || validated.baseOfferPrice || null, // Use MRP if provided, otherwise use baseOfferPrice
        baseOfferPrice: validated.baseOfferPrice,
        addOnPrice: validated.addOnPrice || null,
        category: validated.category as LensCategory,
        yopoEligible: validated.yopoEligible ?? true,
        deliveryDays: validated.deliveryDays ?? 4,
        rxRanges: {
          create: (validated.rxRanges || []).map((range) => ({
            sphMin: range.sphMin,
            sphMax: range.sphMax,
            cylMin: range.cylMin,
            cylMax: range.cylMax,
            addOnPrice: range.addOnPrice,
          })),
        },
        features: {
          create: features.map((f) => ({
            featureId: f.id,
          })),
        },
        benefits: {
          create: benefits.map((b) => ({
            benefitId: b.id,
            score: validated.benefitScores?.[b.code] || 0,
          })),
        },
      },
      include: {
        rxRanges: true,
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
        benefits: {
          include: {
            benefit: {
              select: {
                code: true,
                name: true,
              },
            },
          },
        },
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
        mrp: lens.mrp,
        baseOfferPrice: lens.baseOfferPrice,
        addOnPrice: lens.addOnPrice,
        category: lens.category,
        yopoEligible: lens.yopoEligible,
        deliveryDays: lens.deliveryDays,
        isActive: lens.isActive,
        rxRanges: lens.rxRanges,
        featureCodes: lens.features.map((f) => f.feature.code),
        benefitScores: lens.benefits.reduce((acc, b) => {
          acc[b.benefit.code] = b.score;
          return acc;
        }, {} as Record<string, number>),
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

