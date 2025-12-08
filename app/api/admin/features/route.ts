import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticate, authorize } from '@/middleware/auth.middleware';
import { handleApiError } from '@/lib/errors';
import { CreateFeatureSchema } from '@/lib/validation';
import { UserRole } from '@/lib/constants';
import { z } from 'zod';

// GET /api/admin/features - List all features (F01-F11 master list)
export async function GET(request: NextRequest) {
  try {
    const user = await authenticate(request);

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const isActive = searchParams.get('isActive');

    const where: any = {}; // Features are global (no organizationId)

    if (category) {
      where.category = category;
    }

    if (isActive !== null && isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    const features = await prisma.feature.findMany({
      where,
      orderBy: {
        displayOrder: 'asc', // Order by displayOrder (F01, F02, ...)
      },
    });

    // Get product counts
    const featureIds = features.map(f => f.id);
    const productFeatureCounts = await prisma.productFeature.groupBy({
      by: ['featureId'],
      where: { featureId: { in: featureIds } },
      _count: true,
    });

    const productCountMap = new Map(productFeatureCounts.map(pf => [pf.featureId, pf._count]));

    const formattedFeatures = features.map((feature) => ({
      id: feature.id,
      code: feature.code, // Use code instead of key
      name: feature.name,
      description: feature.description || null,
      category: feature.category,
      displayOrder: feature.displayOrder,
      isActive: feature.isActive,
      productCount: productCountMap.get(feature.id) || 0,
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

// POST /api/admin/features - Create new feature (F12+ only, F01-F11 are fixed)
export async function POST(request: NextRequest) {
  let body: any = null;
  try {
    const user = await authenticate(request);
    authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN)(user);

    body = await request.json();
    
    // New schema for Feature creation
    const createFeatureSchema = z.object({
      code: z.string().regex(/^F\d{2,}$/, 'Feature code must be F followed by 2+ digits (e.g., F12)'),
      name: z.string().min(1, 'Feature name is required'),
      description: z.string().optional(),
      category: z.enum(['DURABILITY', 'COATING', 'PROTECTION', 'LIFESTYLE', 'VISION']),
      displayOrder: z.number().int().min(1).optional(),
    });

    const validatedData = createFeatureSchema.parse(body);

    // Check if code already exists
    const existing = await prisma.feature.findUnique({
      where: { code: validatedData.code.toUpperCase() },
    });

    if (existing) {
      return Response.json(
        {
          success: false,
          error: {
            code: 'DUPLICATE_CODE',
            message: `Feature code "${validatedData.code.toUpperCase()}" already exists`,
          },
        },
        { status: 400 }
      );
    }

    // Get max displayOrder if not provided
    let displayOrder = validatedData.displayOrder;
    if (!displayOrder) {
      const maxOrder = await prisma.feature.findFirst({
        orderBy: { displayOrder: 'desc' },
        select: { displayOrder: true },
      });
      displayOrder = (maxOrder?.displayOrder || 0) + 1;
    }

    const feature = await prisma.feature.create({
      data: {
        code: validatedData.code.toUpperCase(),
        name: validatedData.name,
        description: validatedData.description || null,
        category: validatedData.category,
        displayOrder,
        isActive: true,
      },
    });

    return Response.json({
      success: true,
      data: {
        id: feature.id,
        code: feature.code,
        name: feature.name,
        description: feature.description,
        category: feature.category,
        displayOrder: feature.displayOrder,
        isActive: feature.isActive,
      },
    }, { status: 201 });
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

