import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleApiError } from '@/lib/errors';

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

/**
 * GET /api/order/[orderId]
 * Get order by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params;

    if (!orderId) {
      return Response.json(
        { success: false, error: { message: 'Order ID is required' } },
        { status: 400 }
      );
    }

    // Fetch order from database
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        offerAudits: {
          orderBy: {
            appliedAt: 'desc',
          },
        },
      },
    });

    if (!order) {
      return Response.json(
        { success: false, error: { message: 'Order not found' } },
        { status: 404 }
      );
    }

    // Serialize the order to handle BigInt and Date fields
    const serializedOrder = deepSerialize(order);

    return Response.json({
      success: true,
      data: serializedOrder,
    });
  } catch (error: any) {
    console.error('[order/[orderId]] Error fetching order:', error);
    return handleApiError(error);
  }
}

