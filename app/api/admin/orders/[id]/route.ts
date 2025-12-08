import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticate, authorize } from '@/middleware/auth.middleware';
import { handleApiError, NotFoundError } from '@/lib/errors';
import { UserRole } from '@prisma/client';

/**
 * GET /api/admin/orders/[id]
 * Get order details
 */
export async function GET(
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
        store: {
          select: {
            id: true,
            name: true,
            code: true,
            city: true,
            state: true,
            phone: true,
            email: true,
          },
        },
        staff: {
          select: {
            id: true,
            name: true,
            role: true,
            phone: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundError('Order');
    }

    // Check permissions - store managers can only view orders from their store
    if (user.role === UserRole.STORE_MANAGER && user.storeId !== order.storeId) {
      throw new NotFoundError('Order');
    }

    return Response.json({
      success: true,
      data: {
        ...order,
        createdAt: order.createdAt.toISOString(),
        updatedAt: order.updatedAt.toISOString(),
      },
    });
  } catch (error: any) {
    console.error('[admin/orders/[id]] Error:', error);
    console.error('[admin/orders/[id]] Error type:', typeof error);
    console.error('[admin/orders/[id]] Error message:', error?.message);
    console.error('[admin/orders/[id]] Error stack:', error?.stack);
    
    // Log Prisma-specific errors
    if (error && typeof error === 'object' && 'code' in error) {
      const prismaError = error as { code: string; meta?: unknown; message?: string };
      console.error('[admin/orders/[id]] Prisma error code:', prismaError.code);
      console.error('[admin/orders/[id]] Prisma error message:', prismaError.message);
      console.error('[admin/orders/[id]] Prisma error meta:', JSON.stringify(prismaError.meta, null, 2));
    }
    
    return handleApiError(error);
  }
}

