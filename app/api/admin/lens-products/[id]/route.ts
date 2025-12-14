import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticate, authorize } from '@/middleware/auth.middleware';
import { handleApiError, NotFoundError } from '@/lib/errors';
import { UserRole } from '@/lib/constants';
import { VisionType, LensIndex } from '@prisma/client';
import { z } from 'zod';

// GET /api/admin/lens-products/:id - Get single lens product with all RX ranges
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await authenticate(request);
    authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN)(user);

    const { id } = await params;

    const product = await prisma.lensProduct.findUnique({
      where: { id },
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
    });

    if (!product) {
      throw new NotFoundError('Lens product');
    }

    return Response.json({
      success: true,
      data: {
        id: product.id,
        itCode: product.itCode,
        name: product.name,
        brandLine: product.brandLine,
        visionType: product.visionType,
        lensIndex: product.lensIndex,
        tintOption: product.tintOption,
        category: product.category,
        deliveryDays: product.deliveryDays,
        mrp: product.mrp,
        baseOfferPrice: product.baseOfferPrice,
        addOnPrice: product.addOnPrice,
        yopoEligible: product.yopoEligible,
        comboAllowed: product.comboAllowed,
        isActive: product.isActive,
        rxRanges: product.rxRanges.map((r) => ({
          id: r.id,
          sphMin: r.sphMin,
          sphMax: r.sphMax,
          cylMin: r.cylMin,
          cylMax: r.cylMax,
          addOnPrice: r.addOnPrice,
        })),
        featureCodes: product.features.map((pf) => pf.feature.code),
        createdAt: product.createdAt,
        updatedAt: product.updatedAt,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

const updateLensProductSchema = z.object({
  itCode: z.string().min(1).optional(),
  name: z.string().min(1).optional(),
  brandLine: z.string().min(1).optional(), // LensProduct uses brandLine string, not lensBrandId
  lensBrandId: z.string().optional(), // Accept lensBrandId for backward compatibility, will convert to brandLine
  type: z.enum(['SINGLE_VISION', 'PROGRESSIVE', 'BIFOCAL', 'ANTI_FATIGUE', 'MYOPIA_CONTROL']).optional(),
  index: z.enum(['INDEX_156', 'INDEX_160', 'INDEX_167', 'INDEX_174']).optional(),
  tintOption: z.enum(['CLEAR', 'TINT', 'PHOTOCHROMIC', 'TRANSITION']).optional(),
  category: z.enum(['ECONOMY', 'STANDARD', 'PREMIUM', 'ULTRA']).optional(),
  deliveryDays: z.number().int().min(1).optional(),
  mrp: z.number().min(0).optional(),
  offerPrice: z.number().min(0).optional(),
  baseOfferPrice: z.number().min(0).optional(),
  addOnPrice: z.number().min(0).optional().nullable(),
  featureCodes: z.array(z.string()).optional(), // Feature codes for mapping
  benefitScores: z.record(z.string(), z.number().min(0).max(3)).optional(), // Benefit code -> score (0-3)
  rxRanges: z.array(z.object({
    sphMin: z.number(),
    sphMax: z.number(),
    cylMin: z.number(),
    cylMax: z.number(),
    addMin: z.number().nullable().optional(),
    addMax: z.number().nullable().optional(),
    addOnPrice: z.number().min(0),
  })).optional(),
  yopoEligible: z.boolean().optional(),
  comboAllowed: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

// PUT /api/admin/lens-products/:id - Update lens product
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await authenticate(request);
    authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN)(user);

    const { id } = await params;
    const body = await request.json();
    const validated = updateLensProductSchema.parse(body);

    // Verify product exists
    const existing = await prisma.lensProduct.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundError('Lens product');
    }

    // Handle brandLine - convert lensBrandId to brandLine if provided
    let brandLine = validated.brandLine;
    if (validated.lensBrandId && !brandLine) {
      const brand = await prisma.lensBrand.findUnique({
        where: { id: validated.lensBrandId },
      });
      if (brand) {
        brandLine = brand.name;
      }
    }

    // Verify lens brand if updating (check if brandLine exists in LensBrand)
    if (brandLine) {
      const brand = await prisma.lensBrand.findFirst({
        where: { name: brandLine },
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
    }

    // Check for duplicate IT code if updating
    if (validated.itCode && validated.itCode !== existing.itCode) {
      const duplicate = await prisma.lensProduct.findUnique({
        where: {
          itCode: validated.itCode,
        },
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

    // Handle features update if provided
    if (validated.featureCodes !== undefined) {
      // Delete existing features
      await prisma.productFeature.deleteMany({
        where: { productId: id },
      });

      // Get feature IDs from codes
      if (validated.featureCodes.length > 0) {
        const features = await prisma.feature.findMany({
          where: {
            code: { in: validated.featureCodes },
          },
          select: { id: true },
        });

        // Create new features
        await prisma.productFeature.createMany({
          data: features.map((f) => ({
            productId: id,
            featureId: f.id,
          })),
        });
      }
    }

    // Handle benefits update if provided
    if (validated.benefitScores !== undefined) {
      // Delete existing benefits
      await prisma.productBenefit.deleteMany({
        where: { productId: id },
      });

      // Get benefit codes with score > 0
      const benefitCodes = Object.keys(validated.benefitScores).filter(
        code => (validated.benefitScores?.[code] || 0) > 0
      );

      if (benefitCodes.length > 0) {
        // Get benefit IDs from codes - use BenefitFeature model
        const benefits = await (prisma as any).benefitFeature.findMany({
          where: {
            organizationId: user.organizationId,
            type: 'BENEFIT',
            code: { in: benefitCodes },
          },
          select: { id: true, code: true },
        });

        // Create new benefits
        await prisma.productBenefit.createMany({
          data: benefits.map((b: any) => ({
            productId: id,
            benefitId: b.id,
            score: validated.benefitScores?.[b.code] || 0,
          })),
        });
      }
    }

    const updated = await prisma.lensProduct.update({
      where: { id },
      data: {
        ...(validated.itCode && { itCode: validated.itCode }),
        ...(validated.name && { name: validated.name }),
        ...(brandLine && { brandLine: brandLine }),
        ...(validated.type && { visionType: validated.type as VisionType }),
        ...(validated.index && { lensIndex: validated.index as LensIndex }),
        ...(validated.tintOption && { tintOption: validated.tintOption as any }),
        ...(validated.category && { category: validated.category as any }),
        ...(validated.deliveryDays !== undefined && { deliveryDays: validated.deliveryDays }),
        ...(validated.mrp !== undefined && { mrp: validated.mrp || null }),
        ...(validated.baseOfferPrice !== undefined && { baseOfferPrice: validated.baseOfferPrice || validated.offerPrice }),
        ...(validated.addOnPrice !== undefined && { addOnPrice: validated.addOnPrice }),
        ...(validated.yopoEligible !== undefined && { yopoEligible: validated.yopoEligible }),
        ...(validated.comboAllowed !== undefined && { comboAllowed: validated.comboAllowed }),
        ...(validated.isActive !== undefined && { isActive: validated.isActive }),
      },
      // LensProduct doesn't have lensBrand relation - it uses brandLine string
    });

    return Response.json({
      success: true,
      data: {
        id: updated.id,
        itCode: updated.itCode,
        name: updated.name,
        brandLine: updated.brandLine,
        visionType: updated.visionType,
        lensIndex: updated.lensIndex,
        tintOption: updated.tintOption,
        category: updated.category,
        mrp: updated.mrp,
        baseOfferPrice: updated.baseOfferPrice,
        addOnPrice: updated.addOnPrice,
        yopoEligible: updated.yopoEligible,
        comboAllowed: updated.comboAllowed,
        isActive: updated.isActive,
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt,
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

// DELETE /api/admin/lens-products/:id - Soft delete lens product
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await authenticate(request);
    authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN)(user);

    const { id } = await params;

    const product = await prisma.lensProduct.update({
      where: { id },
      data: {
        isActive: false,
      },
    });

    return Response.json({
      success: true,
      data: product,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

