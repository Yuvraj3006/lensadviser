import { NextRequest } from 'next/server';
import { handleApiError } from '@/lib/errors';
import { BenefitRecommendationService } from '@/services/benefit-recommendation.service';
import { RxValidationService } from '@/services/rx-validation.service';
import { z } from 'zod';

const recommendRequestSchema = z.object({
  prescription: z.object({
    rSph: z.number().optional().nullable(),
    rCyl: z.number().optional().nullable(),
    lSph: z.number().optional().nullable(),
    lCyl: z.number().optional().nullable(),
    add: z.number().optional().nullable(),
  }),
  frame: z
    .object({
      brand: z.string(),
      subCategory: z.string().optional().nullable(),
      mrp: z.number(),
      frameType: z.enum(['FULL_RIM', 'HALF_RIM', 'RIMLESS']).optional().nullable(),
    })
    .optional()
    .nullable(),
  answers: z.array(
    z.object({
      questionId: z.string(),
      answerIds: z.array(z.string()),
    })
  ),
  visionTypeOverride: z.enum(['MYOPIA', 'HYPEROPIA', 'ASTIGMATISM', 'PRESBYOPIA', 'MULTIFOCAL', 'OTHER']).optional().nullable(),
  budgetFilter: z.enum(['ECONOMY', 'STANDARD', 'PREMIUM', 'BEST']).optional().nullable(),
  category: z.enum(['EYEGLASSES', 'SUNGLASSES', 'ONLY_LENS', 'CONTACT_LENSES']).optional().nullable(),
  organizationId: z.string(),
});

/**
 * POST /api/questionnaire/recommend
 * Generate recommendations (matches backend spec exactly)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = recommendRequestSchema.parse(body);

    // Validate prescription
    const rxService = new RxValidationService();
    const rxValidation = rxService.validateRx(validated.prescription);
    if (!rxValidation.valid) {
      return Response.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid prescription',
            details: rxValidation.errors,
          },
        },
        { status: 400 }
      );
    }

    // Generate recommendations using benefit-based service
    const recommendationService = new BenefitRecommendationService();
    const result = await recommendationService.recommend({
      prescription: validated.prescription,
      frame: validated.frame || null,
      answers: validated.answers,
      visionTypeOverride: (validated.visionTypeOverride as any) || null,
      budgetFilter: validated.budgetFilter || null,
      category: validated.category || null,
      organizationId: validated.organizationId,
    });

    return Response.json({
      success: true,
      data: result,
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

