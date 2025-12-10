import { NextRequest } from 'next/server';
import { handleApiError, ValidationError } from '@/lib/errors';
import { prisma } from '@/lib/prisma';
import { authenticate, authorize } from '@/middleware/auth.middleware';
import { UserRole } from '@/lib/constants';
import { serializePrismaModel } from '@/lib/serialization';
import { z } from 'zod';

const updateCouponSchema = z.object({
  code: z.string().min(1).optional(),
  minCartValue: z.number().nullable().optional(),
  usageLimit: z.number().nullable().optional(),
  discountType: z.enum(['PERCENTAGE', 'FLAT_AMOUNT']).optional(),
  discountValue: z.number().optional(),
  maxDiscount: z.number().nullable().optional(),
  isActive: z.boolean().optional(),
  validFrom: z.string().datetime().optional(),
  validUntil: z.string().datetime().nullable().optional(),
});

/**
 * PUT /api/admin/coupons/[id]
 * Update a coupon
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

    const validationResult = updateCouponSchema.safeParse(body);
    
    if (!validationResult.success) {
      throw new ValidationError('Invalid input', validationResult.error.issues);
    }

    const data = validationResult.data;

    // Check if coupon exists
    const existing = await prisma.coupon.findUnique({
      where: { id },
    });

    if (!existing) {
      return Response.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Coupon not found',
          },
        },
        { status: 404 }
      );
    }

    // Verify the coupon belongs to the user's organization
    if (existing.organizationId !== user.organizationId) {
      return Response.json(
        {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'You do not have permission to update this coupon',
          },
        },
        { status: 403 }
      );
    }

    // If updating code, check for duplicates (excluding current record)
    if (data.code && data.code !== existing.code) {
      const duplicate = await prisma.coupon.findUnique({
        where: {
          organizationId_code: {
            organizationId: user.organizationId,
            code: data.code,
          },
        },
      });

      if (duplicate) {
        return Response.json(
          {
            success: false,
            error: {
              code: 'DUPLICATE_COUPON',
              message: `Coupon code "${data.code}" already exists`,
            },
          },
          { status: 409 }
        );
      }
    }

    // Update the coupon
    const updated = await prisma.coupon.update({
      where: { id },
      data: {
        ...(data.code && { code: data.code }),
        ...(data.discountType && { discountType: data.discountType }),
        ...(data.discountValue !== undefined && { discountValue: data.discountValue }),
        ...(data.minCartValue !== undefined && { minCartValue: data.minCartValue ?? null }),
        ...(data.maxDiscount !== undefined && { maxDiscount: data.maxDiscount ?? null }),
        ...(data.usageLimit !== undefined && { usageLimit: data.usageLimit ?? null }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        ...(data.validFrom && { validFrom: new Date(data.validFrom) }),
        ...(data.validUntil !== undefined && { validUntil: data.validUntil ? new Date(data.validUntil) : null }),
      },
    });

    // Serialize BigInt and Date fields
    const serializedCoupon = serializePrismaModel(updated, {
      bigIntFields: ['usedCount'],
      dateFields: ['createdAt', 'updatedAt', 'validFrom', 'validUntil']
    });

    return Response.json({
      success: true,
      data: serializedCoupon,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * DELETE /api/admin/coupons/[id]
 * Delete a coupon
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await authenticate(request);
    authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN)(user);

    const { id } = await params;

    // Check if coupon exists
    const existing = await prisma.coupon.findUnique({
      where: { id },
    });

    if (!existing) {
      return Response.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Coupon not found',
          },
        },
        { status: 404 }
      );
    }

    // Verify the coupon belongs to the user's organization
    if (existing.organizationId !== user.organizationId) {
      return Response.json(
        {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'You do not have permission to delete this coupon',
          },
        },
        { status: 403 }
      );
    }

    // Delete the coupon
    await prisma.coupon.delete({
      where: { id },
    });

    return Response.json({
      success: true,
      message: 'Coupon deleted successfully',
    });
  } catch (error) {
    return handleApiError(error);
  }
}
