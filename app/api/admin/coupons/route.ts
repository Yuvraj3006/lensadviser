import { NextRequest } from 'next/server';
import { handleApiError, ValidationError } from '@/lib/errors';
import { prisma } from '@/lib/prisma';
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
  organizationId: z.string(),
});

/**
 * GET /api/admin/coupons
 * List all coupons
 */
export async function GET(request: NextRequest) {
  try {
    // Try to get user from auth, fallback to query param
    let organizationId: string | null = null;
    try {
      const { authenticate } = await import('@/middleware/auth.middleware');
      const user = await authenticate(request);
      organizationId = user.organizationId;
    } catch {
      // Not authenticated, try query param
    }

    const { searchParams } = new URL(request.url);
    organizationId = organizationId || searchParams.get('organizationId');
    const isActive = searchParams.get('isActive');

    if (!organizationId || organizationId.trim() === '') {
      throw new ValidationError('organizationId is required');
    }

    // Validate organizationId is a valid ObjectID format
    if (!/^[0-9a-fA-F]{24}$/.test(organizationId)) {
      throw new ValidationError('Invalid organizationId format');
    }

    const where: any = {
      organizationId,
    };

    if (isActive !== null) {
      where.isActive = isActive === 'true';
    }

    const coupons = await prisma.coupon.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
    });

    return Response.json({
      success: true,
      data: coupons,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/admin/coupons
 * Create a new coupon
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const validationResult = couponSchema.safeParse(body);
    if (!validationResult.success) {
      throw new ValidationError('Invalid input', validationResult.error.issues);
    }

    const data = validationResult.data;

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
        organizationId: data.organizationId,
      },
    });

    return Response.json(
      {
        success: true,
        data: coupon,
      },
      { status: 201 }
    );
  } catch (error) {
    return handleApiError(error);
  }
}

