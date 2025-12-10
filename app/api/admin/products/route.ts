import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticate, authorize } from '@/middleware/auth.middleware';
import { handleApiError } from '@/lib/errors';
import { UserRole } from '@/lib/constants';
import { RetailProductType } from '@prisma/client';
import { z } from 'zod';

// NOTE: 
// - FRAME and SUNGLASS: Manual entry only (not SKU products)
// - CONTACT_LENS: Use ContactLensProduct model (/admin/contact-lens-products)
// - ACCESSORY: Only type allowed in RetailProduct
const createProductSchema = z.object({
  type: z.enum(['ACCESSORY']), // Only ACCESSORY allowed - CONTACT_LENS uses ContactLensProduct model
  brandId: z.string().min(1, 'Brand ID is required'),
  subBrandId: z.string().optional().nullable(),
  name: z.string().optional().nullable(),
  sku: z.string().optional().nullable(),
  mrp: z.number().min(0, 'MRP must be positive'),
  hsnCode: z.string().optional().nullable(),
});

// GET /api/admin/products - List products, optionally filtered by type
export async function GET(request: NextRequest) {
  try {
    console.log('[GET /api/admin/products] Starting request...');
    
    const user = await authenticate(request);
    console.log('[GET /api/admin/products] User authenticated:', { userId: user.userId, organizationId: user.organizationId });
    
    authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN)(user);
    console.log('[GET /api/admin/products] User authorized');

    const { searchParams } = new URL(request.url);
    const typeParam = searchParams.get('type');
    console.log('[GET /api/admin/products] Type filter:', typeParam);

    const where: any = {};

    // Validate type against enum values
    // NOTE: 
    // - FRAME and SUNGLASS: Manual entry only (not SKU products)
    // - CONTACT_LENS: Use ContactLensProduct model (/admin/contact-lens-products)
    // - ACCESSORY: Only type allowed in RetailProduct
    if (typeParam && (typeParam === 'FRAME' || typeParam === 'SUNGLASS' || typeParam === 'CONTACT_LENS')) {
      // Return empty array for FRAME/SUNGLASS/CONTACT_LENS requests
      return Response.json({
        success: true,
        data: [],
        message: typeParam === 'CONTACT_LENS' 
          ? 'Contact lens products are managed in /admin/contact-lens-products. Use ContactLensProduct model.'
          : 'Frame and Sunglass products are not managed here. Use manual entry in customer flow.',
      });
    }
    
    const validTypes: RetailProductType[] = ['ACCESSORY'];
    if (typeParam && validTypes.includes(typeParam as RetailProductType)) {
      where.type = typeParam as RetailProductType;
    }

    console.log('[GET /api/admin/products] Querying database with where:', where);
    console.log('[GET /api/admin/products] Prisma client check:', {
      hasPrisma: !!prisma,
      hasRetailProduct: !!prisma?.retailProduct,
      prismaKeys: prisma ? Object.keys(prisma).filter(k => !k.startsWith('_') && !k.startsWith('$')).slice(0, 10) : [],
    });
    const products = await prisma.retailProduct.findMany({
      where,
      include: {
        brand: {
          select: {
            id: true,
            name: true,
          },
        },
        subBrand: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [
        { createdAt: 'desc' },
      ],
    });

    console.log('[GET /api/admin/products] Found products:', products.length);

    return Response.json({
      success: true,
      data: products.map((product) => ({
        id: product.id,
        type: product.type,
        brand: {
          id: product.brand.id,
          name: product.brand.name,
        },
        subBrand: product.subBrand
          ? {
              id: product.subBrand.id,
              name: product.subBrand.name,
            }
          : null,
        name: product.name,
        sku: product.sku,
        mrp: product.mrp,
        hsnCode: product.hsnCode,
        isActive: product.isActive,
        createdAt: product.createdAt,
        updatedAt: product.updatedAt,
      })),
    });
  } catch (error: any) {
    console.error('[GET /api/admin/products] Error details:', {
      message: error?.message,
      code: error?.code,
      name: error?.name,
      stack: error?.stack?.substring(0, 500),
    });
    return handleApiError(error);
  }
}

// POST /api/admin/products - Create new retail product
export async function POST(request: NextRequest) {
  try {
    const user = await authenticate(request);
    authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN)(user);

    const body = await request.json();
    const validated = createProductSchema.parse(body);

    // Note: Schema validation already restricts type to ACCESSORY only
    // CONTACT_LENS should use ContactLensProduct model (/admin/contact-lens-products)
    // FRAME and SUNGLASS are rejected - they should only be entered manually in customer flow

    // Verify brand exists (brands are global)
    const brand = await prisma.productBrand.findUnique({
      where: { id: validated.brandId },
    });

    if (!brand) {
      return Response.json(
        {
          success: false,
          error: {
            code: 'INVALID_BRAND',
            message: 'Brand not found',
          },
        },
        { status: 400 }
      );
    }

    // Verify sub-brand if provided
    if (validated.subBrandId) {
      const subBrand = await prisma.productSubBrand.findFirst({
        where: {
          id: validated.subBrandId,
          brandId: validated.brandId,
        },
      });

      if (!subBrand) {
        return Response.json(
          {
            success: false,
            error: {
              code: 'INVALID_SUBBRAND',
              message: 'Sub-brand not found or does not belong to this brand',
            },
          },
          { status: 400 }
        );
      }
    }

    // Check for duplicate SKU if provided (only if SKU is not empty)
    // Note: SKU uniqueness is per brand+subBrand+name+type combination
    // We check if exact combination exists
    if (validated.sku && validated.sku.trim() !== '') {
      const existing = await prisma.retailProduct.findFirst({
        where: {
          sku: validated.sku.trim(),
          type: validated.type,
        },
      });

      if (existing) {
        return Response.json(
          {
            success: false,
            error: {
              code: 'DUPLICATE_SKU',
              message: 'Product with this SKU already exists',
            },
          },
          { status: 409 }
        );
      }
    }

    const product = await prisma.retailProduct.create({
      data: {
        type: validated.type,
        brandId: validated.brandId,
        subBrandId: validated.subBrandId && validated.subBrandId.trim() !== '' ? validated.subBrandId : null,
        name: validated.name && validated.name.trim() !== '' ? validated.name.trim() : null,
        sku: validated.sku && validated.sku.trim() !== '' ? validated.sku.trim() : null,
        mrp: validated.mrp,
        hsnCode: validated.hsnCode && validated.hsnCode.trim() !== '' ? validated.hsnCode.trim() : null,
      },
      include: {
        brand: {
          select: {
            id: true,
            name: true,
          },
        },
        subBrand: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return Response.json({
      success: true,
      data: {
        id: product.id,
        type: product.type,
        brand: {
          id: product.brand.id,
          name: product.brand.name,
        },
        subBrand: product.subBrand
          ? {
              id: product.subBrand.id,
              name: product.subBrand.name,
            }
          : null,
        name: product.name,
        sku: product.sku,
        mrp: product.mrp,
        hsnCode: product.hsnCode,
        isActive: product.isActive,
        createdAt: product.createdAt,
        updatedAt: product.updatedAt,
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
