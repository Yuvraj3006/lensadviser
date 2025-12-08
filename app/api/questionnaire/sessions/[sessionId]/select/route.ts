import { NextRequest } from 'next/server';
import { authenticate } from '@/middleware/auth.middleware';
import { handleApiError } from '@/lib/errors';
import { SelectProductSchema } from '@/lib/validation';
import { recommendationService } from '@/services/recommendation.service';
import { z } from 'zod';

// POST /api/questionnaire/sessions/[sessionId]/select - Select product (conversion)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    await authenticate(request);
    const { sessionId } = await params;

    const body = await request.json();
    const validatedData = SelectProductSchema.parse(body);

    // Mark product as selected
    await recommendationService.selectProduct(sessionId, validatedData.productId);

    return Response.json({
      success: true,
      data: {
        message: 'Product selected successfully',
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

