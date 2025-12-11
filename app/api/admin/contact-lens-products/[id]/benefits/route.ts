import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticate, authorize } from '@/middleware/auth.middleware';
import { handleApiError } from '@/lib/errors';
import { UserRole } from '@/lib/constants';
import { z } from 'zod';

const updateBenefitsSchema = z.object({
  benefits: z.array(
    z.object({
      benefitCode: z.string(),
      score: z.number().min(0).max(3).default(1.0), // Benefit score (0-3 scale)
    })
  ),
});

/**
 * GET /api/admin/contact-lens-products/[id]/benefits
 * Get benefit mappings for a contact lens product
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await authenticate(request);
    authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN)(user);

    const { id } = await params;

    // Verify contact lens product exists
    const product = await (prisma as any).contactLensProduct.findUnique({
      where: { id },
    });

    if (!product) {
      return Response.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Contact lens product not found',
          },
        },
        { status: 404 }
      );
    }

    // Get benefits using BenefitFeature (unified model)
    const benefits = await (prisma as any).benefitFeature.findMany({
      where: {
        type: 'BENEFIT',
        organizationId: user.organizationId,
        isActive: true,
      },
    });

    // Get benefit scores from product's benefitScores JSON field
    const benefitScores: Record<string, number> = {};
    benefits.forEach((b: any) => {
      benefitScores[b.code] = 0; // Default to 0
    });

    // Parse benefit scores from JSON field if exists
    if (product.benefitScores) {
      try {
        const storedScores = JSON.parse(product.benefitScores);
        Object.entries(storedScores).forEach(([code, score]) => {
          if (benefitScores.hasOwnProperty(code)) {
            benefitScores[code] = score as number;
          }
        });
      } catch (e) {
        console.warn('[GET /api/admin/contact-lens-products/[id]/benefits] Failed to parse benefitScores:', e);
      }
    }

    return Response.json({
      success: true,
      data: {
        benefitScores, // Map of benefit code to score (0-3)
        benefits: benefits.map((b: any) => ({
          id: b.id,
          code: b.code,
          name: b.name,
          description: b.description,
          pointWeight: b.pointWeight,
          maxScore: b.maxScore,
        })),
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PUT /api/admin/contact-lens-products/[id]/benefits
 * Set benefit scores for a contact lens product
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await authenticate(request);
    authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN)(user);

    const { id } = await params;
    const body = await request.json();
    const validated = updateBenefitsSchema.parse(body);

    // Verify contact lens product exists
    const product = await (prisma as any).contactLensProduct.findUnique({
      where: { id },
    });

    if (!product) {
      return Response.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Contact lens product not found',
          },
        },
        { status: 404 }
      );
    }

    // Get benefits by codes using BenefitFeature
    const benefitCodes = validated.benefits.map((b) => b.benefitCode);
    const benefits = await (prisma as any).benefitFeature.findMany({
      where: {
        type: 'BENEFIT',
        organizationId: user.organizationId,
        code: { in: benefitCodes },
        isActive: true,
      },
    });

    // Create a map for quick lookup
    const benefitMap = new Map(benefits.map((b: any) => [b.code, b]));

    // Store benefit scores in benefitScores JSON field
    const benefitScoresObj: Record<string, number> = {};
    validated.benefits
      .filter((b) => b.score > 0)
      .forEach((b) => {
        benefitScoresObj[b.benefitCode] = Math.max(0, Math.min(3, b.score)); // Clamp 0-3
      });

    // Update product with benefit scores in JSON field
    await (prisma as any).contactLensProduct.update({
      where: { id },
      data: {
        benefitScores: Object.keys(benefitScoresObj).length > 0 ? JSON.stringify(benefitScoresObj) : null,
      },
    });

    return Response.json({
      success: true,
      data: {
        benefitScores: benefitScoresObj,
        message: 'Benefit scores updated successfully',
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
