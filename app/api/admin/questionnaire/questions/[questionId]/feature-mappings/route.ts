import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticate, authorize } from '@/middleware/auth.middleware';
import { handleApiError } from '@/lib/errors';
import { UserRole } from '@/lib/constants';
import { z } from 'zod';

const updateFeatureMappingsSchema = z.object({
  mappings: z.array(
    z.object({
      optionKey: z.string(), // Answer option key (e.g., "8-12hrs")
      featureKey: z.string(), // Feature key (e.g., "blue_light_filter")
      weight: z.number().min(0).max(3), // Weight: 0.0 to 3.0
    })
  ),
});

// GET /api/admin/questionnaire/questions/:questionId/feature-mappings - Get feature mappings for a question
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ questionId: string }> }
) {
  try {
    const user = await authenticate(request);
    authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN)(user);

    const { questionId } = await params;

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

    // FeatureMapping model has been removed - use AnswerBenefit instead
    // Return empty array for backward compatibility
    return Response.json({
      success: true,
      data: [],
      message: 'Feature mappings have been removed. Use AnswerBenefit mappings instead.',
    });
  } catch (error) {
    return handleApiError(error);
  }
}

// PUT /api/admin/questionnaire/questions/:questionId/feature-mappings - Update feature mappings for a question
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ questionId: string }> }
) {
  try {
    const user = await authenticate(request);
    authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN)(user);

    const { questionId } = await params;
    const body = await request.json();
    const validated = updateFeatureMappingsSchema.parse(body);

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


    // FeatureMapping model has been removed - use AnswerBenefit instead
    return Response.json({
      success: false,
      error: {
        code: 'DEPRECATED_ENDPOINT',
        message: 'Feature mappings have been removed. Use AnswerBenefit mappings instead.',
      },
    }, { status: 410 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Validation failed',
            details: error.issues.map((issue) => ({
              path: issue.path.join('.'),
              message: issue.message,
            })),
          },
        },
        { status: 400 }
      );
    }
    return handleApiError(error);
  }
}

