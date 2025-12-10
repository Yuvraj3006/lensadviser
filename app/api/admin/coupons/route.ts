import { NextRequest } from 'next/server';
import { handleApiError, ValidationError } from '@/lib/errors';
import { prisma } from '@/lib/prisma';
import { authenticate } from '@/middleware/auth.middleware';
import { serializePrismaModels, serializePrismaModel } from '@/lib/serialization';
import { z } from 'zod';

const couponSchema = z.object({
  code: z.string().min(1),
  minCartValue: z.number().nullable().optional(),
  usageLimit: z.number().nullable().optional(),
  discountType: z.enum(['PERCENTAGE', 'FLAT_AMOUNT']),
  discountValue: z.number(),
  maxDiscount: z.number().nullable().optional(),
  isActive: z.boolean().default(true),
  validFrom: z.string().datetime().optional(),
  validUntil: z.string().datetime().nullable().optional(),
  // organizationId is not in schema - will be taken from authenticated user
});

/**
 * GET /api/admin/coupons
 * List all coupons
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate user first
    const user = await authenticate(request);
    
    if (!user || !user.organizationId) {
      throw new ValidationError('User organizationId is required');
    }

    const organizationId = user.organizationId;
    const { searchParams } = new URL(request.url);
    const isActive = searchParams.get('isActive');

    const where: any = {
      organizationId,
    };

    if (isActive !== null && isActive !== '') {
      where.isActive = isActive === 'true';
    }

    console.log('[GET /api/admin/coupons] Fetching coupons with where:', JSON.stringify(where));

    const coupons = await prisma.coupon.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
    });

    console.log('[GET /api/admin/coupons] Found coupons:', coupons.length);

    // Serialize BigInt and Date fields
    const serializedCoupons = serializePrismaModels(coupons, { 
      bigIntFields: ['usedCount'],
      dateFields: ['createdAt', 'updatedAt', 'validFrom', 'validUntil']
    });

    return Response.json({
      success: true,
      data: serializedCoupons || [],
    });
  } catch (error: any) {
    console.error('[GET /api/admin/coupons] Error:', {
      message: error?.message,
      stack: error?.stack,
      name: error?.name,
      code: error?.code,
    });
    return handleApiError(error);
  }
}

/**
 * POST /api/admin/coupons
 * Create a new coupon
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate user first
    const user = await authenticate(request);
    
    if (!user || !user.organizationId) {
      throw new ValidationError('User organizationId is required');
    }

    const organizationId = user.organizationId;

    const body = await request.json();

    const validationResult = couponSchema.safeParse(body);
    
    if (!validationResult.success) {
      throw new ValidationError('Invalid input', validationResult.error.issues);
    }

    const data = validationResult.data;

    // Check if coupon code already exists
    const existingCoupon = await prisma.coupon.findUnique({
      where: {
        organizationId_code: {
          organizationId,
          code: data.code,
        },
      },
    });

    if (existingCoupon) {
      throw new ValidationError(`Coupon code "${data.code}" already exists`);
    }

    const coupon = await prisma.coupon.create({
      data: {
        code: data.code,
        discountType: data.discountType,
        discountValue: data.discountValue,
        minCartValue: data.minCartValue ?? null,
        maxDiscount: data.maxDiscount ?? null,
        usageLimit: data.usageLimit ?? null,
        isActive: data.isActive ?? true,
        validFrom: data.validFrom ? new Date(data.validFrom) : new Date(),
        validUntil: data.validUntil ? new Date(data.validUntil) : null,
        organizationId,
      },
    });

    // Serialize BigInt and Date fields
    const serializedCoupon = serializePrismaModel(coupon, {
      bigIntFields: ['usedCount'],
      dateFields: ['createdAt', 'updatedAt', 'validFrom', 'validUntil']
    });

    return Response.json(
      {
        success: true,
        data: serializedCoupon,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('[POST /api/admin/coupons] Error:', {
      message: error?.message,
      stack: error?.stack,
      name: error?.name,
    });
    return handleApiError(error);
  }
}

