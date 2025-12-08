import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticate } from '@/middleware/auth.middleware';
import { handleApiError, NotFoundError } from '@/lib/errors';
import { SubmitAnswerSchema } from '@/lib/validation';
import { recommendationService } from '@/services/recommendation.service';
import { z } from 'zod';

// POST /api/questionnaire/sessions/[sessionId]/answer - Submit answer
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const user = await authenticate(request);
    const { sessionId } = await params;

    const body = await request.json();
    const validatedData = SubmitAnswerSchema.parse(body);

    // Verify session exists
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundError('Session');
    }

    // Get the question to check total questions
    const totalQuestions = await prisma.question.count({
      where: {
        category: session.category,
        isActive: true,
      },
    });

    // Save answers
    await prisma.sessionAnswer.createMany({
      data: validatedData.optionIds.map((optionId: string) => ({
        sessionId,
        questionId: validatedData.questionId,
        optionId,
        answeredAt: new Date(),
      })),
    });

    // Check current answer count (distinct questions answered)
    const distinctQuestions = await prisma.sessionAnswer.findMany({
      where: { sessionId },
      select: { questionId: true },
      distinct: ['questionId'] as any,
    });
    const answerCount = distinctQuestions.length;

    const isComplete = answerCount >= totalQuestions;

    if (isComplete) {
      // Generate recommendations
      const recommendations = await recommendationService.generateRecommendations(
        sessionId,
        session.storeId,
        session.category,
        10
      );

      // Save recommendations
      await recommendationService.saveRecommendations(sessionId, recommendations);

      // Update session status
      await prisma.session.update({
        where: { id: sessionId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
        },
      });

      // Return recommendations
      return Response.json({
        success: true,
        data: {
          complete: true,
          progress: answerCount,
          totalQuestions,
          recommendations: recommendations.map((rec) => ({
            product: {
              id: rec.productId,
              name: rec.product.name,
              sku: rec.product.sku,
              brand: rec.product.brand,
              imageUrl: rec.product.imageUrl,
            },
            matchScore: rec.matchScore,
            rank: recommendations.indexOf(rec) + 1,
            storePrice: rec.storePrice,
            inStock: rec.inStock,
          })),
        },
      });
    }

    // Not complete yet - return progress
    return Response.json({
      success: true,
      data: {
        complete: false,
        progress: answerCount,
        totalQuestions,
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

