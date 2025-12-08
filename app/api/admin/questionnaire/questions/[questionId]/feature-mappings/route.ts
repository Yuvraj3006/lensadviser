import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticate, authorize } from '@/middleware/auth.middleware';
import { handleApiError } from '@/lib/errors';
import { UserRole } from '@prisma/client';
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

    // Get all feature mappings for this question
    const mappings = await prisma.featureMapping.findMany({
      where: {
        questionId,
      },
      include: {
        feature: {
          select: {
            id: true,
            key: true,
            name: true,
            category: true,
          },
        },
      },
    });

    // Format response
    const formattedMappings = mappings.map((m) => ({
      id: m.id,
      optionKey: m.optionKey,
      featureKey: m.feature.key,
      featureName: m.feature.name,
      featureCategory: m.feature.category,
      weight: m.weight,
    }));

    return Response.json({
      success: true,
      data: formattedMappings,
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

    // Get all feature keys
    const featureKeys = [...new Set(validated.mappings.map((m) => m.featureKey))];
    
    // Get features by keys
    const features = await prisma.feature.findMany({
      where: {
        organizationId: user.organizationId,
        key: { in: featureKeys },
        category: question.category, // Features must match question category
      },
    });

    const featureMap = new Map(features.map((f) => [f.key, f]));

    // Verify all features exist
    const missingFeatures = featureKeys.filter((key) => !featureMap.has(key));
    if (missingFeatures.length > 0) {
      return Response.json(
        {
          success: false,
          error: {
            code: 'INVALID_FEATURES',
            message: `Features not found: ${missingFeatures.join(', ')}`,
            details: missingFeatures,
          },
        },
        { status: 400 }
      );
    }

    // Verify all option keys exist for this question
    const optionKeys = [...new Set(validated.mappings.map((m) => m.optionKey))];
    const options = await prisma.answerOption.findMany({
      where: {
        questionId,
        key: { in: optionKeys },
      },
    });

    const optionMap = new Map(options.map((o) => [o.key, o]));
    const missingOptions = optionKeys.filter((key) => !optionMap.has(key));
    if (missingOptions.length > 0) {
      return Response.json(
        {
          success: false,
          error: {
            code: 'INVALID_OPTIONS',
            message: `Option keys not found for this question: ${missingOptions.join(', ')}`,
            details: missingOptions,
          },
        },
        { status: 400 }
      );
    }

    // Delete existing mappings for this question
    await prisma.featureMapping.deleteMany({
      where: { questionId },
    });

    // Create new mappings
    const newMappings = await Promise.all(
      validated.mappings.map((mapping) => {
        const feature = featureMap.get(mapping.featureKey);
        if (!feature) {
          throw new Error(`Feature not found: ${mapping.featureKey}`);
        }

        return prisma.featureMapping.create({
          data: {
            questionId,
            optionKey: mapping.optionKey,
            featureId: feature.id,
            weight: mapping.weight,
          },
        });
      })
    );

    return Response.json({
      success: true,
      data: {
        questionId,
        mappings: newMappings.map((m) => ({
          id: m.id,
          optionKey: m.optionKey,
          featureId: m.featureId,
          weight: m.weight,
        })),
        message: `Created ${newMappings.length} feature mappings`,
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

