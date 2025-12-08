import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticate, authorize } from '@/middleware/auth.middleware';
import { handleApiError, NotFoundError } from '@/lib/errors';
import { UserRole } from '@/lib/constants';
import { z } from 'zod';

const updateProductSchema = z.object({
  type: z.enum(['FRAME', 'SUNGLASS', 'CONTACT_LENS', 'ACCESSORY']).optional(),
  brandId: z.string().optional(),
  subBrandId: z.string().optional().nullable(),
  name: z.string().optional().nullable(),
  sku: z.string().optional().nullable(),
  mrp: z.number().min(0).optional(),
  hsnCode: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

// GET /api/admin/products/[id] - Get retail product details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await authenticate(request);
    authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN)(user);

    const { id } = await params;

    const product = await prisma.retailProduct.findUnique({
      where: { id },
      include: {
        brand: {
          select: {
            id: true,
            name: true,
            productTypes: true,
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

    if (!product) {
      throw new NotFoundError('Product');
    }

    return Response.json({
      success: true,
      data: {
        id: product.id,
        type: product.type,
        brand: {
          id: product.brand.id,
          name: product.brand.name,
          productTypes: product.brand.productTypes,
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
    return handleApiError(error);
  }
}

// PUT /api/admin/products/[id] - Update retail product
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await authenticate(request);
    authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN)(user);

    const { id } = await params;
    const body = await request.json();
    const validated = updateProductSchema.parse(body);

    // Verify product exists
    const existing = await prisma.retailProduct.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundError('Product');
    }

    // Verify brand if updating
    if (validated.brandId) {
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
    }

    // Verify sub-brand if updating
    if (validated.subBrandId && validated.brandId) {
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

    const updated = await prisma.retailProduct.update({
      where: { id },
      data: {
        ...(validated.type && { type: validated.type }),
        ...(validated.brandId && { brandId: validated.brandId }),
        ...(validated.subBrandId !== undefined && {
          subBrandId: validated.subBrandId && validated.subBrandId.trim() !== '' ? validated.subBrandId : null,
        }),
        ...(validated.name !== undefined && {
          name: validated.name && validated.name.trim() !== '' ? validated.name.trim() : null,
        }),
        ...(validated.sku !== undefined && {
          sku: validated.sku && validated.sku.trim() !== '' ? validated.sku.trim() : null,
        }),
        ...(validated.mrp !== undefined && { mrp: validated.mrp }),
        ...(validated.hsnCode !== undefined && {
          hsnCode: validated.hsnCode && validated.hsnCode.trim() !== '' ? validated.hsnCode.trim() : null,
        }),
        ...(validated.isActive !== undefined && { isActive: validated.isActive }),
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
        id: updated.id,
        type: updated.type,
        brand: {
          id: updated.brand.id,
          name: updated.brand.name,
        },
        subBrand: updated.subBrand
          ? {
              id: updated.subBrand.id,
              name: updated.subBrand.name,
            }
          : null,
        name: updated.name,
        sku: updated.sku,
        mrp: updated.mrp,
        hsnCode: updated.hsnCode,
        isActive: updated.isActive,
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt,
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

// DELETE /api/admin/products/[id] - Soft delete retail product
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await authenticate(request);
    authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN)(user);

    const { id } = await params;

    const product = await prisma.retailProduct.update({
      where: { id },
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
