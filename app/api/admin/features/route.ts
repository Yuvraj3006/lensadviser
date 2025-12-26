import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticate, authorize } from '@/middleware/auth.middleware';
import { handleApiError } from '@/lib/errors';
import { CreateFeatureSchema } from '@/lib/validation';
import { UserRole } from '@/lib/constants';
import { z } from 'zod';
import { getCachedValue, setCachedValue } from '@/lib/cache';
import { measureQuery } from '@/lib/performance';

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

    const cacheKey = `features:${category || 'all'}:${isActive ?? 'all'}`;
    let allFeatures = getCachedValue<any[]>(cacheKey);

    if (!allFeatures) {
      const fetchFeatures = async () => {
        try {
          return await measureQuery('features.findMany', () =>
            prisma.feature.findMany({
              where,
              orderBy: {
                displayOrder: 'asc',
              },
            })
          );
        } catch (error: any) {
          if (error.code === 'P2032' && error.meta?.field === 'displayOrder') {
            console.warn('[Features API] Null displayOrder detected, falling back to raw driver');
            const { MongoClient } = await import('mongodb');
            const databaseUrl = process.env.DATABASE_URL;
            if (!databaseUrl) {
              throw error;
            }
            const mongoClient = new MongoClient(databaseUrl);
            await mongoClient.connect();
            const db = mongoClient.db();
            const featuresCollection = db.collection('Feature');

            const featuresArray = await featuresCollection.find(where).toArray();
            await mongoClient.close();

            return featuresArray
              .map((f: any) => ({
                id: f._id.toString(),
                code: f.code,
                name: f.name,
                description: f.description,
                category: f.category,
                displayOrder: f.displayOrder || 999,
                isActive: f.isActive,
                createdAt: f.createdAt,
                updatedAt: f.updatedAt,
              }))
              .sort((a, b) => (a.displayOrder || 999) - (b.displayOrder || 999));
          }
          throw error;
        }
      };

      allFeatures = await fetchFeatures();
      setCachedValue(cacheKey, allFeatures, 60_000);
    }

    // Get product counts
    const featureIds = allFeatures.map(f => f.id);
    const productFeatureCounts = await measureQuery('productFeature.groupBy', () =>
      prisma.productFeature.groupBy({
        by: ['featureId'],
        where: { featureId: { in: featureIds } },
        _count: true,
      })
    );

    const productCountMap = new Map(productFeatureCounts.map(pf => [pf.featureId, pf._count]));

    const formattedFeatures = allFeatures.map((feature) => ({
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
      iconUrl: z.preprocess(
        (val) => {
          if (val === '' || val === undefined || val === null) return null;
          return val;
        },
        z.union([
          z.string().url(), // Full URL (http://, https://)
          z.string().regex(/^\/[^\/].*/, 'Relative URL must start with /'), // Relative URL (/feature-icons/...)
          z.null()
        ]).nullable().optional()
      ),
    });

    let validatedData;
    try {
      validatedData = createFeatureSchema.parse(body);
      console.log('[POST /api/admin/features] Validated data:', validatedData);
    } catch (error: any) {
      console.error('[POST /api/admin/features] Validation error:', error);
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
      throw error;
    }

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
        iconUrl: validatedData.iconUrl || null,
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

