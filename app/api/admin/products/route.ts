import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticate, authorize } from '@/middleware/auth.middleware';
import { handleApiError } from '@/lib/errors';
import { CreateProductSchema } from '@/lib/validation';
import { UserRole } from '@prisma/client';
import { z } from 'zod';

// GET /api/admin/products - List all products
export async function GET(request: NextRequest) {
  try {
    const user = await authenticate(request);

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category');
    const storeId = searchParams.get('storeId');
    const isActive = searchParams.get('isActive');

    const where: any = {
      organizationId: user.organizationId,
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
        { brand: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (category) {
      where.category = category;
    }

    if (isActive !== null && isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    const products = await prisma.product.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
    });

    const formattedProducts = products.map((product) => ({
      id: product.id,
      sku: product.sku,
      name: product.name,
      description: product.description,
      category: product.category,
      brand: product.brand,
      basePrice: Number(product.basePrice),
      imageUrl: product.imageUrl,
      isActive: product.isActive,
      brandLine: product.brandLine,
      visionType: product.visionType,
      lensIndex: product.lensIndex,
      itCode: product.itCode,
      yopoEligible: product.yopoEligible,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    }));

    return Response.json({
      success: true,
      data: formattedProducts,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

// POST /api/admin/products - Create new product
export async function POST(request: NextRequest) {
  try {
    const user = await authenticate(request);
    authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN)(user);

    const body = await request.json();
    const validatedData = CreateProductSchema.parse(body);

    const { features, ...productData } = validatedData;

    // Ensure basePrice is set (use mrp if basePrice not provided)
    const finalProductData = {
      ...productData,
      basePrice: productData.basePrice || productData.mrp || 0,
    };

    // Filter out fields that don't exist in Product model
    const allowedFields = [
      'sku', 'name', 'description', 'category', 'brand', 'basePrice', 'imageUrl',
      'itCode', 'brandLine', 'lensIndex', 'visionType', 'yopoEligible', 'isActive'
    ] as const;
    
    const filteredData = Object.fromEntries(
      Object.entries(finalProductData).filter(([key]) => allowedFields.includes(key as any))
    ) as any;

    // Create product
    const product = await prisma.product.create({
      data: {
        ...filteredData,
        organizationId: user.organizationId,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    // Create features separately if provided
    if (features && features.length > 0) {
      await Promise.all(
        features.map((f) =>
          prisma.productFeature.create({
            data: {
              productId: product.id,
              featureId: f.featureId,
              strength: f.strength,
            },
          })
        )
      );
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

