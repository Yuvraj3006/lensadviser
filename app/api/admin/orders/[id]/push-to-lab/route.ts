import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticate, authorize } from '@/middleware/auth.middleware';
import { handleApiError, ValidationError } from '@/lib/errors';
import { UserRole } from '@/lib/constants';
import { OrderStatus } from '@/lib/constants';

/**
 * POST /api/admin/orders/[id]/push-to-lab
 * Mark order as PUSHED_TO_LAB
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
    });

    if (!order) {
      throw new ValidationError('Order not found');
    }

    // Check permissions - store managers can only push orders from their store
    if (user.role === UserRole.STORE_MANAGER && user.storeId !== order.storeId) {
      throw new ValidationError('You can only push orders from your store to lab');
    }

    // Validate status transition - can only push printed orders
    if (order.status !== 'PRINTED') {
      throw new ValidationError(
        `Order cannot be pushed to lab from status: ${order.status}. Must be PRINTED.`
      );
    }

    const updated = await prisma.order.update({
      where: { id },
      data: { status: 'PUSHED_TO_LAB' },
    });

    return Response.json({
      success: true,
      data: updated,
      message: 'Order pushed to lab successfully',
    });
  } catch (error: any) {
    console.error('[admin/orders/[id]/push-to-lab] Error:', error);
    console.error('[admin/orders/[id]/push-to-lab] Error type:', typeof error);
    console.error('[admin/orders/[id]/push-to-lab] Error message:', error?.message);
    console.error('[admin/orders/[id]/push-to-lab] Error stack:', error?.stack);
    return handleApiError(error);
  }
}

