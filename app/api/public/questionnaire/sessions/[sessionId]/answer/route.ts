import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleApiError, NotFoundError, ValidationError } from '@/lib/errors';
import { z } from 'zod';

// Validation schema for public API (using ObjectIds for MongoDB)
const SubmitAnswerSchema = z.object({
  questionId: z.string().min(1, 'questionId is required'),
  optionIds: z.array(z.string().min(1)).min(1, 'At least one option must be selected'),
});

// POST /api/public/questionnaire/sessions/[sessionId]/answer - Submit answer
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    
    // Validate sessionId
    if (!sessionId || sessionId.trim() === '') {
      throw new ValidationError('sessionId is required');
    }

    // Parse and validate request body
    let body: any;
    try {
      body = await request.json();
    } catch (error) {
      throw new ValidationError('Invalid JSON in request body');
    }

    const validatedData = SubmitAnswerSchema.parse(body);
    const { questionId, optionIds } = validatedData;

    // Verify session exists
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundError('Session');
    }

    // Verify session is not already completed
    if (session.status === 'COMPLETED') {
      return Response.json({
        success: false,
        error: {
          code: 'SESSION_COMPLETED',
          message: 'This session has already been completed',
        },
      }, { status: 400 });
    }

    // Get store to find organizationId
    const store = await prisma.store.findUnique({
      where: { id: session.storeId },
    });

    if (!store) {
      throw new NotFoundError('Store');
    }

    // Verify question exists and belongs to the session's category
    const question = await prisma.question.findFirst({
      where: {
        id: questionId,
        category: session.category,
        organizationId: store.organizationId,
        isActive: true,
      },
    });

    if (!question) {
      throw new NotFoundError('Question');
    }

    // Verify all options exist and belong to the question
    const options = await prisma.answerOption.findMany({
      where: {
        id: { in: optionIds },
        questionId: questionId,
      },
    });

    if (options.length !== optionIds.length) {
      throw new ValidationError('One or more selected options are invalid');
    }

    // Save answers with answeredAt timestamp
    const now = new Date();
    const answerPromises = optionIds.map((optionId: string) =>
      prisma.sessionAnswer.create({
        data: {
          sessionId,
          questionId,
          optionId,
          answeredAt: now,
        },
      })
    );

    await Promise.all(answerPromises);

    // Get all answers for this session (query separately since no relation exists)
    const allAnswers = await prisma.sessionAnswer.findMany({
      where: { sessionId },
      select: { questionId: true },
    });

    // Get distinct question IDs that have been answered
    const answeredQuestionIds = new Set(allAnswers.map((a) => a.questionId.toString()));
    const answeredQuestions = answeredQuestionIds.size;

    // Get total questions for this category and organization
    const totalQuestions = await prisma.question.count({
      where: {
        organizationId: store.organizationId,
        category: session.category,
        isActive: true,
      },
    });

    const isComplete = answeredQuestions >= totalQuestions;

    // If all answered, mark as completed
    if (isComplete) {
      await prisma.session.update({
        where: { id: sessionId },
        data: {
          status: 'COMPLETED',
          completedAt: now,
        },
      });
    }

    return Response.json({
      success: true,
      data: {
        completed: isComplete,
        answeredQuestions,
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

