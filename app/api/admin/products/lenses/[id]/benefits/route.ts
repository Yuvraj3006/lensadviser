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
      strength: z.number().min(0).max(3).default(1.0), // Benefit strength (0-3 scale)
    })
  ),
});

// PUT /api/admin/products/lenses/:id/benefits - Set product benefit scores
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

    // Verify product exists
    const product = await prisma.product.findFirst({
      where: {
        id,
        organizationId: user.organizationId,
      },
    });

    if (!product) {
      return Response.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Product not found',
          },
        },
        { status: 404 }
      );
    }

    // Get benefits by codes
    const benefitCodes = validated.benefits.map((b) => b.benefitCode);
    const benefits = await prisma.benefit.findMany({
      where: {
        organizationId: user.organizationId,
        code: { in: benefitCodes },
      },
    });

    // Create a map for quick lookup
    const benefitMap = new Map(benefits.map((b) => [b.code, b]));

    // Delete existing product benefits
    await prisma.productBenefit.deleteMany({
      where: { productId: id },
    });

    // Create new product benefits with strength
    const productBenefits = await Promise.all(
      validated.benefits
        .filter((benefitInput) => benefitInput.strength > 0) // Only create if strength > 0
        .map(async (benefitInput) => {
          const benefit = benefitMap.get(benefitInput.benefitCode);
          if (!benefit) {
            throw new Error(`Benefit code not found: ${benefitInput.benefitCode}`);
          }

          return prisma.productBenefit.create({
            data: {
              productId: id,
              benefitId: benefit.id,
              strength: Math.max(0, Math.min(3, benefitInput.strength)), // Clamp 0-3
            },
          });
        })
    );

    // Return product benefits as-is (no date fields to serialize)
    const serialized = productBenefits;

    return Response.json({
      success: true,
      data: serialized,
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

