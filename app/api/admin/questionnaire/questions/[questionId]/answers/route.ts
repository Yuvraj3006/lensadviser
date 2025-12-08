import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticate, authorize } from '@/middleware/auth.middleware';
import { handleApiError } from '@/lib/errors';
import { UserRole } from '@prisma/client';
import { z } from 'zod';

const createAnswersSchema = z.object({
  answers: z.array(
    z.object({
      text: z.string().optional(),
      textEn: z.string(),
      textHi: z.string().optional(),
      textHiEn: z.string().optional(),
      icon: z.string().optional(),
      displayOrder: z.number().optional(),
      benefits: z
        .array(
          z.object({
            benefitCode: z.string(),
            points: z.number(),
          })
        )
        .optional()
        .default([]),
    })
  ),
});

// POST /api/admin/questionnaire/questions/:questionId/answers - Add answers to question
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ questionId: string }> }
) {
  try {
    const user = await authenticate(request);
    authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN)(user);

    const { questionId } = await params;
    const body = await request.json();
    const validated = createAnswersSchema.parse(body);

    // Verify question exists and belongs to organization
    const question = await prisma.question.findFirst({
      where: {
        id: questionId,
        organizationId: user.organizationId,
      },
    });

    if (!question) {
      return Response.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Question not found',
          },
        },
        { status: 404 }
      );
    }

    // Get all benefit codes
    const benefitCodes = validated.answers.flatMap((a) =>
      (a.benefits || []).map((b) => b.benefitCode)
    );
    const uniqueBenefitCodes = [...new Set(benefitCodes)];

    // Fetch benefits
    const benefits = await prisma.benefit.findMany({
      where: {
        organizationId: user.organizationId,
        code: { in: uniqueBenefitCodes },
      },
    });

    const benefitMap = new Map(benefits.map((b) => [b.code, b]));

    // Create answers with benefits
    const createdAnswers = await Promise.all(
      validated.answers.map(async (answerData, index) => {
        const answer = await prisma.answerOption.create({
          data: {
            questionId,
            key: `option_${Date.now()}_${index}`, // Generate unique key
            text: answerData.text || answerData.textEn,
            textEn: answerData.textEn,
            textHi: answerData.textHi || null,
            textHiEn: answerData.textHiEn || null,
            icon: answerData.icon || null,
            order: index + 1,
            displayOrder: answerData.displayOrder || index + 1,
          },
        });

        // Create answer-benefit mappings
        if (answerData.benefits && answerData.benefits.length > 0) {
          await Promise.all(
            answerData.benefits.map(async (benefitInput) => {
              const benefit = benefitMap.get(benefitInput.benefitCode);
              if (benefit) {
                await prisma.answerBenefit.create({
                  data: {
                    answerId: answer.id,
                    benefitId: benefit.id,
                  },
                });
              }
            })
          );
        }

        return answer;
      })
    );

    return Response.json(
      {
        success: true,
        data: createdAnswers,
      },
      { status: 201 }
    );
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

