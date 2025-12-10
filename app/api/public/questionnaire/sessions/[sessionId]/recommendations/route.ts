import { NextRequest } from 'next/server';
import { handleApiError, NotFoundError } from '@/lib/errors';
import { recommendationsAdapterService } from '@/services/recommendations-adapter.service';
import { prisma } from '@/lib/prisma';

// GET /api/public/questionnaire/sessions/[sessionId]/recommendations
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;

    // Validate sessionId
    if (!sessionId || sessionId.trim() === '') {
      throw new NotFoundError('Session ID is required');
    }

    // Check if session exists
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundError('Session not found');
    }

    // Get store information separately (no relation exists in schema)
    const store = await prisma.store.findUnique({
      where: { id: session.storeId },
      select: {
        name: true,
        city: true,
        phone: true,
      },
    });

    if (!store) {
      throw new NotFoundError('Store not found');
    }

    // Check if session has answers before generating recommendations
    const answerCount = await prisma.sessionAnswer.count({
      where: { sessionId },
    });

    if (answerCount === 0) {
      return Response.json({
        success: false,
        error: {
          code: 'NO_ANSWERS',
          message: 'Session has no answers. Please complete the questionnaire first.',
        },
      }, { status: 400 });
    }

    // Generate recommendations using new BenefitRecommendationService adapter
    let result;
    try {
      console.log(`[GET /api/public/questionnaire/sessions/[sessionId]/recommendations] Generating recommendations for session ${sessionId}`);
      result = await recommendationsAdapterService.generateRecommendations(sessionId);
      console.log(`[GET /api/public/questionnaire/sessions/[sessionId]/recommendations] Generated ${result.recommendations.length} recommendations`);
    } catch (genError: any) {
      console.error('[GET /api/public/questionnaire/sessions/[sessionId]/recommendations] Error details:', {
        message: genError?.message,
        stack: genError?.stack,
        name: genError?.name,
      });
        console.error('[GET /api/public/questionnaire/sessions/[sessionId]/recommendations] Error generating recommendations:', {
          error: genError,
          message: genError?.message,
          stack: genError?.stack,
          sessionId,
        });
        // If generation fails, return a more helpful error
        if (genError.message?.includes('No valid answers') || genError.message?.includes('No valid')) {
          return Response.json({
            success: false,
            error: {
              code: 'INVALID_ANSWERS',
              message: 'Session answers are invalid or incomplete. Please complete the questionnaire again.',
            },
          }, { status: 400 });
        }
        if (genError.message?.includes('No products found')) {
          return Response.json({
            success: false,
            error: {
              code: 'NO_PRODUCTS',
              message: 'No products found matching your preferences. Please try again later.',
            },
          }, { status: 404 });
        }
        throw genError; // Re-throw to be handled by handleApiError
    }

    // Convert Date to ISO string for JSON serialization
    const formattedResult = {
      ...result,
      generatedAt: result.generatedAt instanceof Date 
        ? result.generatedAt.toISOString() 
        : typeof result.generatedAt === 'string' 
          ? result.generatedAt 
          : new Date().toISOString(),
    };

    // Validate result before returning
    if (!result || !result.recommendations || result.recommendations.length === 0) {
      console.error('[GET /api/public/questionnaire/sessions/[sessionId]/recommendations] No recommendations in result');
      console.error('[GET /api/public/questionnaire/sessions/[sessionId]/recommendations] Result structure:', {
        hasResult: !!result,
        hasRecommendations: !!(result && result.recommendations),
        recommendationsLength: result?.recommendations?.length || 0,
        benefitScoresCount: result?.benefitScores ? Object.keys(result.benefitScores).length : 0,
      });
      
      // Return success with empty recommendations instead of error
      // Frontend can handle empty state
      return Response.json({
        success: true,
        data: {
          ...formattedResult,
          recommendations: [],
          store: store,
          sessionStatus: session.status,
          message: 'No recommendations found. Please check if lens products are available in the database.',
        },
      });
    }

    return Response.json({
      success: true,
      data: {
        ...formattedResult,
        store: store,
        sessionStatus: session.status,
      },
    });
  } catch (error: any) {
    console.error('[GET /api/public/questionnaire/sessions/[sessionId]/recommendations] Unhandled error:', {
      error,
      message: error?.message,
      stack: error?.stack,
      name: error?.name,
    });
    return handleApiError(error);
  }
}

// POST /api/public/questionnaire/sessions/[sessionId]/recommendations
// Regenerate recommendations
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;

    // Validate sessionId
    if (!sessionId || sessionId.trim() === '') {
      throw new NotFoundError('Session ID is required');
    }

    // Verify session exists
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundError('Session not found');
    }

    const result = await recommendationsAdapterService.generateRecommendations(sessionId);

    return Response.json({
      success: true,
      data: result,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

