import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticate, authorize } from '@/middleware/auth.middleware';
import { handleApiError, NotFoundError } from '@/lib/errors';
import { UserRole } from '@/lib/constants';
import { VisionType, LensIndex, TintOption, LensCategory } from '@prisma/client';
import { z } from 'zod';

const rxRangeSchema = z.object({
  sphMin: z.number(),
  sphMax: z.number(),
  cylMin: z.number(),
  cylMax: z.number(),
  addOnPrice: z.number().default(0),
});

const updateLensSchema = z.object({
  itCode: z.string().min(1).optional(),
  name: z.string().min(1).optional(),
  brandLine: z.string().min(1).optional(),
  visionType: z.enum(['SINGLE_VISION', 'PROGRESSIVE', 'BIFOCAL', 'ANTI_FATIGUE', 'MYOPIA_CONTROL']).optional(),
  lensIndex: z.enum(['INDEX_156', 'INDEX_160', 'INDEX_167', 'INDEX_174']).optional(),
  tintOption: z.enum(['CLEAR', 'TINT', 'PHOTOCHROMIC', 'TRANSITION']).optional(),
  baseOfferPrice: z.number().min(0).optional(),
  addOnPrice: z.number().min(0).optional().nullable(),
  category: z.enum(['ECONOMY', 'STANDARD', 'PREMIUM', 'ULTRA']).optional(),
  yopoEligible: z.boolean().optional(),
  deliveryDays: z.number().int().min(1).optional(),
  isActive: z.boolean().optional(),
  rxRanges: z.array(rxRangeSchema).optional(),
  featureCodes: z.array(z.string()).optional(),
  benefitScores: z.record(z.string(), z.number().min(0).max(3)).optional(),
});

// GET /api/admin/lenses/:id - Get lens details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await authenticate(request);
    authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN)(user);

    const { id } = await params;

    const lens = await prisma.lensProduct.findUnique({
      where: { id },
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
        specs: true,
      },
    });

    if (!lens) {
      throw new NotFoundError('Lens product');
    }

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
        specs: lens.specs,
        createdAt: lens.createdAt,
        updatedAt: lens.updatedAt,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

// PUT /api/admin/lenses/:id - Update lens product
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await authenticate(request);
    authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN)(user);

    const { id } = await params;
    const body = await request.json();
    const validated = updateLensSchema.parse(body);

    // Verify lens exists
    const existing = await prisma.lensProduct.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundError('Lens product');
    }

    // Check for duplicate IT code if updating
    if (validated.itCode && validated.itCode !== existing.itCode) {
      const duplicate = await prisma.lensProduct.findUnique({
        where: { itCode: validated.itCode },
      });

      if (duplicate) {
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
    }

    // Prepare update data
    const updateData: any = {
      ...(validated.itCode && { itCode: validated.itCode }),
      ...(validated.name && { name: validated.name }),
      ...(validated.brandLine && { brandLine: validated.brandLine }),
      ...(validated.visionType && { visionType: validated.visionType as VisionType }),
      ...(validated.lensIndex && { lensIndex: validated.lensIndex as LensIndex }),
      ...(validated.tintOption && { tintOption: validated.tintOption as TintOption }),
      ...(validated.baseOfferPrice !== undefined && { baseOfferPrice: validated.baseOfferPrice }),
      ...(validated.addOnPrice !== undefined && { addOnPrice: validated.addOnPrice }),
      ...(validated.category && { category: validated.category as LensCategory }),
      ...(validated.yopoEligible !== undefined && { yopoEligible: validated.yopoEligible }),
      ...(validated.deliveryDays !== undefined && { deliveryDays: validated.deliveryDays }),
      ...(validated.isActive !== undefined && { isActive: validated.isActive }),
    };

    // Handle RX ranges replacement
    if (validated.rxRanges !== undefined) {
      // Delete existing ranges
      await prisma.lensRxRange.deleteMany({
        where: { lensId: id },
      });

      // Create new ranges
      updateData.rxRanges = {
        create: validated.rxRanges.map((range) => ({
          sphMin: range.sphMin,
          sphMax: range.sphMax,
          cylMin: range.cylMin,
          cylMax: range.cylMax,
          addOnPrice: range.addOnPrice,
        })),
      };
    }

    // Handle features replacement
    if (validated.featureCodes !== undefined) {
      // Delete existing features
      await prisma.productFeature.deleteMany({
        where: { productId: id },
      });

      // Get feature IDs from codes
      const features = await prisma.feature.findMany({
        where: {
          code: { in: validated.featureCodes },
        },
        select: { id: true },
      });

      // Create new features
      updateData.features = {
        create: features.map((f) => ({
          featureId: f.id,
        })),
      };
    }

    // Handle benefits replacement
    if (validated.benefitScores !== undefined) {
      // Delete existing benefits
      await prisma.productBenefit.deleteMany({
        where: { productId: id },
      });

      // Get benefit IDs from codes (benefits are organization-specific)
      const benefits = await prisma.benefit.findMany({
        where: {
          organizationId: user.organizationId,
          code: { in: Object.keys(validated.benefitScores) },
        },
        select: { id: true, code: true },
      });

      // Create new benefits
      updateData.benefits = {
        create: benefits.map((b) => ({
          benefitId: b.id,
          score: validated.benefitScores?.[b.code] || 0,
        })),
      };
    }

    // Update lens
    const lens = await prisma.lensProduct.update({
      where: { id },
      data: updateData,
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

// DELETE /api/admin/lenses/:id - Soft delete lens
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await authenticate(request);
    authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN)(user);

    const { id } = await params;

    const lens = await prisma.lensProduct.update({
      where: { id },
      data: { isActive: false },
    });

    return Response.json({
      success: true,
      data: lens,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

