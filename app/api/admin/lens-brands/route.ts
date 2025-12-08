import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticate, authorize } from '@/middleware/auth.middleware';
import { handleApiError } from '@/lib/errors';
import { UserRole } from '@/lib/constants';
import { z } from 'zod';

const createLensBrandSchema = z.object({
  name: z.string().min(1, 'Lens brand name is required'),
  description: z.string().optional().nullable(),
});

// GET /api/admin/lens-brands - List all lens brands
export async function GET(request: NextRequest) {
  try {
    const user = await authenticate(request);
    authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN)(user);

    const brands = await prisma.lensBrand.findMany({
      where: {
        isActive: true,
      },
      // LensProduct doesn't have lensBrandId relation - it uses brandLine string
      // So we can't include products here, need to count separately
      orderBy: { name: 'asc' },
    });

    // Count products for each brand by brandLine
    const brandNames = brands.map(b => b.name);
    const productCounts = await prisma.lensProduct.groupBy({
      by: ['brandLine'],
      where: {
        brandLine: { in: brandNames },
        isActive: true,
      },
      _count: true,
    });
    const countMap = new Map(productCounts.map(pc => [pc.brandLine, pc._count]));

    return Response.json({
      success: true,
      data: brands.map((brand) => ({
        id: brand.id,
        name: brand.name,
        description: brand.description,
        isActive: brand.isActive,
        productCount: countMap.get(brand.name) || 0,
        createdAt: brand.createdAt,
        updatedAt: brand.updatedAt,
      })),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

// POST /api/admin/lens-brands - Create new lens brand
export async function POST(request: NextRequest) {
  try {
    const user = await authenticate(request);
    authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN)(user);

    const body = await request.json();
    const validated = createLensBrandSchema.parse(body);

    // Check if brand already exists (lens brands are global)
    const existing = await prisma.lensBrand.findUnique({
      where: {
        name: validated.name,
      },
    });

    if (existing) {
      return Response.json(
        {
          success: false,
          error: {
            code: 'DUPLICATE_BRAND',
            message: 'Lens brand with this name already exists',
          },
        },
        { status: 409 }
      );
    }

    const brand = await prisma.lensBrand.create({
      data: {
        name: validated.name,
        description: validated.description || null,
      },
    });

    return Response.json({
      success: true,
      data: {
        id: brand.id,
        name: brand.name,
        description: brand.description,
        isActive: brand.isActive,
        createdAt: brand.createdAt,
        updatedAt: brand.updatedAt,
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


