import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticate, authorize } from '@/middleware/auth.middleware';
import { handleApiError, NotFoundError } from '@/lib/errors';
import { UpdateProductSchema } from '@/lib/validation';
import { UserRole } from '@prisma/client';
import { z } from 'zod';

// GET /api/admin/products/[id] - Get product details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await authenticate(request);
    const { id } = await params;

    const product = await prisma.product.findUnique({
      where: {
        id,
        organizationId: user.organizationId,
      },
    });

    if (!product) {
      throw new NotFoundError('Product');
    }

    // Fetch related data manually
    const features = await prisma.productFeature.findMany({
      where: { productId: id },
    });

    // Fetch features separately
    const featuresWithDetails = await Promise.all(
      features.map(async (pf) => {
        const feature = await prisma.feature.findUnique({
          where: { id: pf.featureId },
        });
        return {
          ...pf,
          feature,
        };
      })
    );

    const storeProducts = await prisma.storeProduct.findMany({
      where: { productId: id },
    });

    // Fetch stores separately
    const storeProductsWithDetails = await Promise.all(
      storeProducts.map(async (sp) => {
        const store = await prisma.store.findUnique({
          where: { id: sp.storeId },
          select: {
            name: true,
          },
        });
        return {
          ...sp,
          store,
        };
      })
    );

    return Response.json({
      success: true,
      data: {
        ...product,
        features: featuresWithDetails,
        storeProducts: storeProductsWithDetails,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

// PUT /api/admin/products/[id] - Update product
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await authenticate(request);
    authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN)(user);

    const { id } = await params;
    const body = await request.json();
    const validatedData = UpdateProductSchema.parse(body);

    const { features, ...productData } = validatedData;

    // Filter out fields that don't exist in Product model
    const allowedFields = [
      'sku', 'name', 'description', 'category', 'brand', 'basePrice', 'imageUrl',
      'itCode', 'brandLine', 'lensIndex', 'visionType', 'yopoEligible', 'isActive'
    ] as const;
    
    const filteredData = Object.fromEntries(
      Object.entries(productData).filter(([key]) => allowedFields.includes(key as any))
    ) as any;

    // Update product
    const product = await prisma.product.update({
      where: {
        id,
        organizationId: user.organizationId,
      },
      data: filteredData,
    });

    // Update features if provided
    if (features) {
      // Delete existing features
      await prisma.productFeature.deleteMany({
        where: { productId: id },
      });

      // Create new features
      await prisma.productFeature.createMany({
        data: features.map((f) => ({
          productId: id,
          featureId: f.featureId,
          strength: f.strength,
        })),
      });
    }

    return Response.json({
      success: true,
      data: product,
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

// DELETE /api/admin/products/[id] - Soft delete product
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await authenticate(request);
    authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN)(user);

    const { id } = await params;

    const product = await prisma.product.update({
      where: {
        id,
        organizationId: user.organizationId,
      },
      data: {
        isActive: false,
      },
    });

    return Response.json({
      success: true,
      data: product,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

