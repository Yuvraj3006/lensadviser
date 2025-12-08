import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleApiError, ValidationError } from '@/lib/errors';
import { z } from 'zod';

const createOrderSchema = z.object({
  storeId: z.string(),
  salesMode: z.enum(['SELF_SERVICE', 'STAFF_ASSISTED']),
  assistedByStaffId: z.string().nullable().optional(),
  assistedByName: z.string().nullable().optional(),
  customerName: z.string().nullable().optional(),
  customerPhone: z.string().nullable().optional(),
  frameData: z.any(),
  lensData: z.any(),
  offerData: z.any(),
  finalPrice: z.number().positive(),
});

/**
 * POST /api/order/create
 * Create a new order
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate request body
    if (!body) {
      throw new ValidationError('Request body is required');
    }

    const validated = createOrderSchema.parse(body);

    // Validate store exists
    const store = await prisma.store.findUnique({
      where: { id: validated.storeId },
    });

    if (!store) {
      throw new ValidationError('Store not found');
    }

    // Validate staff if provided
    if (validated.assistedByStaffId) {
      const staff = await prisma.staff.findUnique({
        where: { id: validated.assistedByStaffId },
      });

      if (!staff || staff.storeId !== validated.storeId) {
        throw new ValidationError('Invalid staff member');
      }
    }

    // Validate JSON fields are objects
    if (typeof validated.frameData !== 'object' || validated.frameData === null) {
      throw new ValidationError('frameData must be a valid object');
    }
    if (typeof validated.lensData !== 'object' || validated.lensData === null) {
      throw new ValidationError('lensData must be a valid object');
    }
    if (typeof validated.offerData !== 'object' || validated.offerData === null) {
      throw new ValidationError('offerData must be a valid object');
    }

    // Validate finalPrice is positive
    if (validated.finalPrice <= 0) {
      throw new ValidationError('finalPrice must be greater than 0');
    }

    const order = await prisma.order.create({
      data: {
        storeId: validated.storeId,
        salesMode: validated.salesMode,
        assistedByStaffId: validated.assistedByStaffId || null,
        assistedByName: validated.assistedByName || null,
        customerName: validated.customerName || null,
        customerPhone: validated.customerPhone || null,
        frameData: validated.frameData,
        lensData: validated.lensData,
        offerData: validated.offerData,
        finalPrice: validated.finalPrice,
        status: 'DRAFT',
      },
    });

    return Response.json({
      success: true,
      data: order,
    });
  } catch (error: any) {
    console.error('[order/create] Error:', error);
    console.error('[order/create] Error type:', typeof error);
    console.error('[order/create] Error message:', error?.message);
    console.error('[order/create] Error stack:', error?.stack);
    
    // Log Prisma-specific errors
    if (error && typeof error === 'object' && 'code' in error) {
      const prismaError = error as { code: string; meta?: unknown; message?: string };
      console.error('[order/create] Prisma error code:', prismaError.code);
      console.error('[order/create] Prisma error message:', prismaError.message);
      console.error('[order/create] Prisma error meta:', JSON.stringify(prismaError.meta, null, 2));
    }
    
    return handleApiError(error);
  }
}

