import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleApiError, ValidationError } from '@/lib/errors';
import { z } from 'zod';

const calculateBenefitsSchema = z.object({
  answers: z.array(z.string()).min(1, 'At least one answer ID is required'),
});

/**
 * POST /api/advisor/calculate-benefits
 * Calculate customer benefit profile from selected answers
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = calculateBenefitsSchema.parse(body);

    // Fetch benefit mappings for all answer IDs
    const answerBenefits = await prisma.answerBenefit.findMany({
      where: {
        answerId: { in: validated.answers },
      },
      include: {
        benefit: {
          select: {
            code: true,
            name: true,
          },
        },
      },
    });

    // Sum points for each benefit
    const benefitProfile: Record<string, number> = {};
    
    answerBenefits.forEach((ab) => {
      const benefitCode = ab.benefit.code;
      if (!benefitProfile[benefitCode]) {
        benefitProfile[benefitCode] = 0;
      }
      benefitProfile[benefitCode] += ab.points;
    });

    // Ensure all benefits are represented (default to 0)
    const allBenefits = await prisma.benefit.findMany({
      where: {
        isActive: true,
      },
      select: {
        code: true,
      },
    });

    allBenefits.forEach((benefit) => {
      if (!(benefit.code in benefitProfile)) {
        benefitProfile[benefit.code] = 0;
      }
    });

    return Response.json({
      success: true,
      data: {
        benefitProfile,
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

