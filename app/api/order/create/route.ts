import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleApiError, ValidationError } from '@/lib/errors';
import { z } from 'zod';

/**
 * Deep serialize an object to remove BigInt, Date, and other non-serializable types
 */
function deepSerialize(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (typeof obj === 'bigint') {
    return Number(obj);
  }
  
  if (obj instanceof Date) {
    return obj.toISOString();
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => deepSerialize(item));
  }
  
  if (typeof obj === 'object') {
    const serialized: any = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        serialized[key] = deepSerialize(obj[key]);
      }
    }
    return serialized;
  }
  
  return obj;
}

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
  orderType: z.enum(['EYEGLASSES', 'LENS_ONLY', 'POWER_SUNGLASS', 'CONTACT_LENS_ONLY']).optional(),
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

    // Business Rule: Staff selection is mandatory for STAFF_ASSISTED mode
    if (validated.salesMode === 'STAFF_ASSISTED') {
      if (!validated.assistedByStaffId && !validated.assistedByName) {
        throw new ValidationError('Staff selection is required for STAFF_ASSISTED mode. Please provide either assistedByStaffId or assistedByName.');
      }
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

    // Serialize data to remove BigInt, Date, and other non-serializable types
    const serializedFrameData = deepSerialize(validated.frameData);
    const serializedLensData = deepSerialize(validated.lensData);
    const serializedOfferData = deepSerialize(validated.offerData);
    
    // Handle assistedByStaffId and assistedByName - schema expects Json type
    const assistedByStaffIdJson = validated.assistedByStaffId 
      ? (typeof validated.assistedByStaffId === 'string' ? validated.assistedByStaffId : JSON.stringify(validated.assistedByStaffId))
      : null;
    const assistedByNameJson = validated.assistedByName 
      ? (typeof validated.assistedByName === 'string' ? validated.assistedByName : JSON.stringify(validated.assistedByName))
      : null;

    const now = new Date();
    const order = await prisma.order.create({
      data: {
        storeId: validated.storeId,
        salesMode: validated.salesMode,
        assistedByStaffId: assistedByStaffIdJson as any,
        assistedByName: assistedByNameJson as any,
        customerName: validated.customerName || null,
        customerPhone: validated.customerPhone || null,
        frameData: serializedFrameData as any,
        lensData: serializedLensData as any,
        offerData: serializedOfferData as any,
        orderType: validated.orderType || 'EYEGLASSES',
        finalPrice: validated.finalPrice,
        status: 'DRAFT',
        createdAt: now,
        updatedAt: now,
      },
    });

    // Serialize the order response to handle BigInt and Date fields
    const serializedOrder = deepSerialize(order);

    return Response.json({
      success: true,
      data: serializedOrder,
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

