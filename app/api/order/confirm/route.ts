import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleApiError, ValidationError } from '@/lib/errors';
import { z } from 'zod';

const confirmOrderSchema = z.object({
  orderId: z.string(),
});

/**
 * POST /api/order/confirm
 * Confirm order (DRAFT → CUSTOMER_CONFIRMED)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderId } = confirmOrderSchema.parse(body);

    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new ValidationError('Order not found');
    }

    if (order.status !== 'DRAFT') {
      throw new ValidationError(`Order cannot be confirmed from status: ${order.status}`);
    }

    const updated = await prisma.order.update({
      where: { id: orderId },
      data: { status: 'CUSTOMER_CONFIRMED' },
    });

    return Response.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

