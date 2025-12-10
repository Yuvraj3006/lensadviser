import { NextRequest } from 'next/server';
import { handleApiError, ValidationError } from '@/lib/errors';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { authenticate, authorize } from '@/middleware/auth.middleware';
import { UserRole } from '@/lib/constants';

const updateCategoryDiscountSchema = z.object({
  customerCategory: z.enum([
    'STUDENT',
    'DOCTOR',
    'TEACHER',
    'ARMED_FORCES',
    'SENIOR_CITIZEN',
    'CORPORATE',
    'REGULAR',
  ]).optional(),
  brandCode: z.string().optional(),
  discountPercent: z.number().min(0).max(100).optional(),
  maxDiscount: z.number().nullable().optional(),
  isActive: z.boolean().optional(),
  categoryVerificationRequired: z.boolean().optional(),
  allowedIdTypes: z.array(z.string()).optional(),
});

/**
 * PUT /api/admin/offers/category-discounts/[id]
 * Update a category discount
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await authenticate(request);
    authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN)(user);

    const { id } = await params;
    const body = await request.json();

    const validationResult = updateCategoryDiscountSchema.safeParse(body);
    if (!validationResult.success) {
      throw new ValidationError('Invalid input', validationResult.error.issues);
    }

    const data = validationResult.data;

    // Check if discount exists
    const existing = await prisma.categoryDiscount.findUnique({
      where: { id },
    });

    if (!existing) {
      return Response.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Category discount not found',
          },
        },
        { status: 404 }
      );
    }

    // If updating customerCategory, brandCode, or organizationId, check for duplicates
    // But we can't change organizationId, so only check customerCategory and brandCode
    if (data.customerCategory || data.brandCode) {
      const checkCustomerCategory = data.customerCategory ?? existing.customerCategory;
      const checkBrandCode = data.brandCode ?? existing.brandCode;

      const duplicate = await prisma.categoryDiscount.findFirst({
        where: {
          organizationId: existing.organizationId,
          customerCategory: checkCustomerCategory,
          brandCode: checkBrandCode,
          id: { not: id }, // Exclude current record
        },
      });

      if (duplicate) {
        return Response.json(
          {
            success: false,
            error: {
              code: 'DUPLICATE_DISCOUNT',
              message: 'A discount with this customer category and brand code already exists',
            },
          },
          { status: 409 }
        );
      }
    }

    // Update the discount
    const updated = await prisma.categoryDiscount.update({
      where: { id },
      data: {
        ...(data.customerCategory && { customerCategory: data.customerCategory }),
        ...(data.brandCode && { brandCode: data.brandCode }),
        ...(data.discountPercent !== undefined && { discountPercent: data.discountPercent }),
        ...(data.maxDiscount !== undefined && { maxDiscount: data.maxDiscount ?? 0 }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        ...(data.categoryVerificationRequired !== undefined && { 
          categoryVerificationRequired: data.categoryVerificationRequired 
        }),
        ...(data.allowedIdTypes !== undefined && { allowedIdTypes: data.allowedIdTypes }),
        updatedAt: new Date(),
      },
    });

    return Response.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * DELETE /api/admin/offers/category-discounts/[id]
 * Delete a category discount
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await authenticate(request);
    authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN)(user);

    const { id } = await params;

    // Check if discount exists
    const existing = await prisma.categoryDiscount.findUnique({
      where: { id },
    });

    if (!existing) {
      return Response.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Category discount not found',
          },
        },
        { status: 404 }
      );
    }

    // Delete the discount
    await prisma.categoryDiscount.delete({
      where: { id },
    });

    return Response.json({
      success: true,
      message: 'Category discount deleted successfully',
    });
  } catch (error) {
    return handleApiError(error);
  }
}
