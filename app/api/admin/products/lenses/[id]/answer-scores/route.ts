import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticate, authorize } from '@/middleware/auth.middleware';
import { handleApiError } from '@/lib/errors';
import { UserRole } from '@prisma/client';
import { z } from 'zod';

const updateAnswerScoresSchema = z.object({
  mappings: z.array(
    z.object({
      answerId: z.string(),
      score: z.number(),
    })
  ),
});

// PUT /api/admin/products/lenses/:id/answer-scores - Set answer → product boosts
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await authenticate(request);
    authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN)(user);

    const { id } = await params;
    const body = await request.json();
    const validated = updateAnswerScoresSchema.parse(body);

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

    // Verify all answer IDs exist
    const answerIds = validated.mappings.map((m) => m.answerId);
    const answers = await prisma.answerOption.findMany({
      where: {
        id: { in: answerIds },
      },
    });

    if (answers.length !== answerIds.length) {
      return Response.json(
        {
          success: false,
          error: {
            code: 'INVALID_ANSWERS',
            message: 'Some answer IDs not found',
          },
        },
        { status: 400 }
      );
    }

    // Delete existing answer scores
    await prisma.productAnswerScore.deleteMany({
      where: { productId: id },
    });

    // Create new answer scores
    const answerScores = await Promise.all(
      validated.mappings.map((mapping) =>
        prisma.productAnswerScore.create({
          data: {
            productId: id,
            answerId: mapping.answerId,
            score: mapping.score,
          },
        })
      )
    );

    // Return answer scores as-is (no date fields to serialize)
    const serialized = answerScores;

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

