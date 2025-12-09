import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticate, authorize } from '@/middleware/auth.middleware';
import { handleApiError, ValidationError } from '@/lib/errors';
import { UserRole } from '@/lib/constants';
import { OrderStatus } from '@/lib/constants';

/**
 * POST /api/admin/orders/[id]/print
 * Mark order as PRINTED
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await authenticate(request);
    authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.STORE_MANAGER)(user);

    const { id } = await params;

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        store: true,
      },
    });

    if (!order) {
      throw new ValidationError('Order not found');
    }

    // Check permissions - store managers can only print orders from their store
    if (user.role === UserRole.STORE_MANAGER && user.storeId !== order.storeId) {
      throw new ValidationError('You can only print orders from your store');
    }

    // Validate status transition
    if (order.status !== 'STORE_ACCEPTED' && order.status !== 'CUSTOMER_CONFIRMED') {
      throw new ValidationError(
        `Order cannot be printed from status: ${order.status}. Must be STORE_ACCEPTED or CUSTOMER_CONFIRMED.`
      );
    }

    const updated = await prisma.order.update({
      where: { id },
      data: { status: 'PRINTED' },
    });

    return Response.json({
      success: true,
      data: updated,
      message: 'Order marked as printed',
    });
  } catch (error: any) {
    console.error('[admin/orders/[id]/print] Error:', error);
    console.error('[admin/orders/[id]/print] Error type:', typeof error);
    console.error('[admin/orders/[id]/print] Error message:', error?.message);
    console.error('[admin/orders/[id]/print] Error stack:', error?.stack);
    return handleApiError(error);
  }
}

