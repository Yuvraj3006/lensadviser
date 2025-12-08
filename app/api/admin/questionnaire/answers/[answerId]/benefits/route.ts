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
      points: z.number(),
    })
  ),
});

// PUT /api/admin/questionnaire/answers/:answerId/benefits - Update answer → benefit mapping
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ answerId: string }> }
) {
  try {
    const user = await authenticate(request);
    authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN)(user);

    const { answerId } = await params;
    const body = await request.json();
    const validated = updateBenefitsSchema.parse(body);

    // Verify answer exists and belongs to organization
    const answer = await prisma.answerOption.findFirst({
      where: {
        id: answerId,
      },
      include: {
        question: true,
      },
    });

    if (!answer || answer.question.organizationId !== user.organizationId) {
      return Response.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Answer not found',
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

    const benefitMap = new Map(benefits.map((b) => [b.code, b]));

    // Delete existing answer benefits
    await prisma.answerBenefit.deleteMany({
      where: { answerId },
    });

    // Create new answer benefits
    const answerBenefits = await Promise.all(
      validated.benefits.map(async (benefitInput) => {
        const benefit = benefitMap.get(benefitInput.benefitCode);
        if (!benefit) {
          throw new Error(`Benefit code not found: ${benefitInput.benefitCode}`);
        }

        return prisma.answerBenefit.create({
          data: {
            answerId,
            benefitId: benefit.id,
            points: benefitInput.points || 0, // Store points from benefitEffects
          },
        });
      })
    );

    return Response.json({
      success: true,
      data: answerBenefits,
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

