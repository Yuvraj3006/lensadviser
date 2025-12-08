import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticate, authorize } from '@/middleware/auth.middleware';
import { handleApiError } from '@/lib/errors';
import { CreateFeatureSchema } from '@/lib/validation';
import { UserRole } from '@prisma/client';
import { z } from 'zod';

// GET /api/admin/features - List all features
export async function GET(request: NextRequest) {
  try {
    const user = await authenticate(request);

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const isActive = searchParams.get('isActive');

    const where: any = {
      organizationId: user.organizationId,
    };

    if (category) {
      where.category = category;
    }

    if (isActive !== null && isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    const features = await prisma.feature.findMany({
      where,
      include: {
        _count: {
          select: {
            productFeatures: true,
            mappings: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    const formattedFeatures = features.map((feature) => ({
      id: feature.id,
      key: feature.key,
      name: feature.name,
      description: feature.description || null,
      category: feature.category,
      isActive: feature.isActive,
      productCount: feature._count.productFeatures || 0,
      mappingCount: feature._count.mappings || 0,
      createdAt: feature.createdAt?.toISOString() || new Date().toISOString(),
    }));

    return Response.json({
      success: true,
      data: formattedFeatures,
    });
  } catch (error: any) {
    console.error('[GET /api/admin/features] Error:', {
      message: error?.message,
      code: error?.code,
      stack: error?.stack,
    });
    return handleApiError(error);
  }
}

// POST /api/admin/features - Create new feature
export async function POST(request: NextRequest) {
  let body: any = null;
  try {
    const user = await authenticate(request);
    authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN)(user);

    body = await request.json();
    const validatedData = CreateFeatureSchema.parse(body);

    console.log('[POST /api/admin/features] Creating feature with data:', {
      ...validatedData,
      organizationId: user.organizationId,
    });

    const feature = await prisma.feature.create({
      data: {
        key: validatedData.key,
        name: validatedData.name,
        description: validatedData.description || null,
        category: validatedData.category,
        isActive: true,
        organizationId: user.organizationId,
        // createdAt and updatedAt will be set automatically by Prisma defaults
      },
    });

    console.log('[POST /api/admin/features] Feature created successfully:', feature.id);
    return Response.json({
      success: true,
      data: feature,
    });
  } catch (error: any) {
    console.error('[POST /api/admin/features] Error:', {
      message: error?.message,
      code: error?.code,
      meta: error?.meta,
      stack: error?.stack,
      body: body,
    });
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

