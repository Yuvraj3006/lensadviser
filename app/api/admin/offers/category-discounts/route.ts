import { NextRequest } from 'next/server';
import { handleApiError, ValidationError } from '@/lib/errors';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const categoryDiscountSchema = z.object({
  customerCategory: z.enum([
    'STUDENT',
    'DOCTOR',
    'TEACHER',
    'ARMED_FORCES',
    'SENIOR_CITIZEN',
    'CORPORATE',
    'REGULAR',
  ]),
  brandCode: z.string(),
  discountPercent: z.number().min(0).max(100),
  maxDiscount: z.number().nullable().optional(),
  isActive: z.boolean().default(true),
  organizationId: z.string(),
});

/**
 * GET /api/admin/offers/category-discounts
 * List all category discounts
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId');
    const customerCategory = searchParams.get('customerCategory');

    if (!organizationId) {
      throw new ValidationError('organizationId is required');
    }

    const where: any = {
      organizationId,
    };

    if (customerCategory) {
      where.customerCategory = customerCategory;
    }

    const discounts = await prisma.categoryDiscount.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
    });

    return Response.json({
      success: true,
      data: discounts,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/admin/offers/category-discounts
 * Create a new category discount
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const validationResult = categoryDiscountSchema.safeParse(body);
    if (!validationResult.success) {
      throw new ValidationError('Invalid input', validationResult.error.issues);
    }

    const data = validationResult.data;

    const discount = await prisma.categoryDiscount.create({
      data: {
        customerCategory: data.customerCategory,
        brandCode: data.brandCode,
        discountPercent: data.discountPercent,
        maxDiscount: data.maxDiscount ?? null,
        isActive: data.isActive ?? true,
        organizationId: data.organizationId,
      },
    });

    return Response.json(
      {
        success: true,
        data: discount,
      },
      { status: 201 }
    );
  } catch (error) {
    return handleApiError(error);
  }
}

