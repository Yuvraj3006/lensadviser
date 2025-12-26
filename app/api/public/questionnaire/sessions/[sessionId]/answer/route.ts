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

    // OPTIMIZATION: Fetch session and question in parallel
    const [session, question] = await Promise.all([
      prisma.session.findUnique({
        where: { id: sessionId },
      }),
      prisma.question.findFirst({
        where: {
          id: questionId,
          isActive: true,
        },
        select: {
          id: true,
          category: true,
          organizationId: true,
        },
      }),
    ]);

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

    if (!question) {
      throw new NotFoundError('Question');
    }

    // Verify question belongs to session's category
    if (question.category !== session.category) {
      throw new ValidationError('Question does not belong to session category');
    }

    // OPTIMIZATION: Fetch store and verify options in parallel
    const [store, options] = await Promise.all([
      prisma.store.findUnique({
        where: { id: session.storeId },
        select: { organizationId: true },
      }),
      prisma.answerOption.findMany({
        where: {
          id: { in: optionIds },
          questionId: questionId,
        },
        select: { id: true },
      }),
    ]);

    if (!store) {
      throw new NotFoundError('Store');
    }

    // Verify question belongs to organization
    if (question.organizationId !== store.organizationId) {
      throw new ValidationError('Question does not belong to organization');
    }

    if (options.length !== optionIds.length) {
      throw new ValidationError('One or more selected options are invalid');
    }

    // OPTIMIZATION: Save answers and get counts in parallel
    const now = new Date();
    const answerData = optionIds.map((optionId: string) => ({
      sessionId,
      questionId,
      optionId,
      answeredAt: now,
    }));

    // OPTIMIZATION: Use createMany for better performance (single query)
    // Note: MongoDB doesn't support skipDuplicates, so we use createMany without it
    // Duplicates will be handled by unique index if needed
    await prisma.sessionAnswer.createMany({
      data: answerData,
    });

    // OPTIMIZATION: Get distinct question count and total questions in parallel
    const [allAnswers, totalQuestions] = await Promise.all([
      // Fetch only questionId for distinct count (lighter query)
      prisma.sessionAnswer.findMany({
        where: { sessionId },
        select: { questionId: true },
      }),
      prisma.question.count({
        where: {
          organizationId: store.organizationId,
          category: session.category,
          isActive: true,
        },
      }),
    ]);

    // Get distinct question IDs (in-memory, faster than DB distinct)
    const answeredQuestionIds = new Set(allAnswers.map((a) => String(a.questionId)));
    const answeredQuestions = answeredQuestionIds.size;

    const isComplete = answeredQuestions >= totalQuestions;

    // If all answered, mark as completed and generate NeedsProfile
    if (isComplete) {
      // Generate and save NeedsProfile
      const { needsProfileService } = await import('@/services/needs-profile.service');
      let profile = null;
      try {
        profile = await needsProfileService.generateNeedsProfile(sessionId);
        await needsProfileService.saveNeedsProfile(sessionId, profile);
        console.log('[Questionnaire] NeedsProfile generated and saved:', profile);
        
        // Track needs profile generated
        const { analyticsService } = await import('@/services/analytics.service');
        await analyticsService.needsProfileGenerated(sessionId, profile);
      } catch (profileError) {
        console.error('[Questionnaire] Failed to generate NeedsProfile:', profileError);
        // Don't fail the request if profile generation fails
      }

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

