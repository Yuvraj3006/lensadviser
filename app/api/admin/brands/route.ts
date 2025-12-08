import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticate, authorize } from '@/middleware/auth.middleware';
import { handleApiError } from '@/lib/errors';
import { UserRole } from '@/lib/constants';
import { z } from 'zod';

const createBrandSchema = z.object({
  name: z.string().min(1, 'Brand name is required'),
  productTypes: z.array(z.enum(['FRAME', 'SUNGLASS', 'CONTACT_LENS', 'ACCESSORY'])).optional(),
});

// GET /api/admin/brands - List all brands (generic, not frame-specific)
export async function GET(request: NextRequest) {
  try {
    console.log('[GET /api/admin/brands] Starting request...');
    
    const user = await authenticate(request);
    console.log('[GET /api/admin/brands] User authenticated:', { userId: user.userId, organizationId: user.organizationId });
    
    authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN)(user);
    console.log('[GET /api/admin/brands] User authorized');

    console.log('[GET /api/admin/brands] Querying database...');
    console.log('[GET /api/admin/brands] Prisma client check:', {
      hasPrisma: !!prisma,
      hasProductBrand: !!prisma?.productBrand,
      prismaKeys: prisma ? Object.keys(prisma).filter(k => !k.startsWith('_') && !k.startsWith('$')).slice(0, 10) : [],
    });
    const brands = await prisma.productBrand.findMany({
      where: {
        isActive: true,
      },
      include: {
        subBrands: {
          where: { isActive: true },
          orderBy: { name: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    });

    console.log('[GET /api/admin/brands] Found brands:', brands.length);

    return Response.json({
      success: true,
      data: brands.map((brand) => ({
        id: brand.id,
        name: brand.name,
        isActive: brand.isActive,
        productTypes: brand.productTypes,
        subBrands: brand.subBrands.map((sb) => ({
          id: sb.id,
          name: sb.name,
          isActive: sb.isActive,
        })),
        createdAt: brand.createdAt,
        updatedAt: brand.updatedAt,
      })),
    }, { status: 200 });
  } catch (error: any) {
    console.error('[GET /api/admin/brands] Error details:', {
      message: error?.message,
      code: error?.code,
      name: error?.name,
      stack: error?.stack?.substring(0, 500),
    });
    return handleApiError(error);
  }
}

// POST /api/admin/brands - Create new brand
export async function POST(request: NextRequest) {
  try {
    const user = await authenticate(request);
    authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN)(user);

    const body = await request.json();
    const validated = createBrandSchema.parse(body);

    // Check if brand already exists (brands are global, no organizationId)
    const existing = await prisma.productBrand.findUnique({
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
            message: 'Brand with this name already exists',
          },
        },
        { status: 409 }
      );
    }

    const brand = await prisma.productBrand.create({
      data: {
        name: validated.name,
        productTypes: validated.productTypes || [],
      },
      include: {
        subBrands: true,
      },
    });

    return Response.json({
      success: true,
      data: {
        id: brand.id,
        name: brand.name,
        isActive: brand.isActive,
        productTypes: brand.productTypes,
        subBrands: brand.subBrands.map((sb) => ({
          id: sb.id,
          name: sb.name,
          isActive: sb.isActive,
        })),
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

