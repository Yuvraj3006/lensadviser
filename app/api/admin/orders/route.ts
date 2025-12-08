import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticate, authorize } from '@/middleware/auth.middleware';
import { handleApiError } from '@/lib/errors';
import { UserRole, OrderStatus } from '@prisma/client';

/**
 * GET /api/admin/orders
 * List all orders with filters
 */
export async function GET(request: NextRequest) {
  try {
    const user = await authenticate(request);
    authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.STORE_MANAGER)(user);

    // Validate user has organizationId
    if (!user.organizationId) {
      return Response.json({
        success: false,
        error: {
          code: 'MISSING_ORGANIZATION',
          message: 'User organization not found',
        },
      }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as OrderStatus | null;
    const storeId = searchParams.get('storeId');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const where: any = {};

    // Filter by organization (for multi-store HQ view)
    if (user.role === UserRole.SUPER_ADMIN || user.role === UserRole.ADMIN) {
      // HQ can see all stores in their organization
      const stores = await prisma.store.findMany({
        where: { organizationId: user.organizationId },
        select: { id: true },
      });
      
      // Only filter by stores if stores exist, otherwise return empty result
      if (stores.length > 0) {
        // If specific store filter is provided, use it (must be in organization)
        if (storeId) {
          const storeExists = stores.some((s) => s.id === storeId);
          if (storeExists) {
            where.storeId = storeId;
          } else {
            // Store not in organization, return empty result
            return Response.json({
              success: true,
              data: [],
              pagination: {
                total: 0,
                limit,
                offset,
                hasMore: false,
              },
            });
          }
        } else {
          where.storeId = { in: stores.map((s) => s.id) };
        }
      } else {
        // No stores in organization, return empty result
        return Response.json({
          success: true,
          data: [],
          pagination: {
            total: 0,
            limit,
            offset,
            hasMore: false,
          },
        });
      }
    } else if (user.storeId) {
      // Store manager can only see their store's orders
      // If storeId filter is provided but doesn't match user's store, return empty
      if (storeId && storeId !== user.storeId) {
        return Response.json({
          success: true,
          data: [],
          pagination: {
            total: 0,
            limit,
            offset,
            hasMore: false,
          },
        });
      }
      where.storeId = user.storeId;
    } else {
      // User has no store assigned, return empty result
      return Response.json({
        success: true,
        data: [],
        pagination: {
          total: 0,
          limit,
          offset,
          hasMore: false,
        },
      });
    }

    // Filter by status
    if (status) {
      where.status = status;
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          store: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
          staff: {
            select: {
              id: true,
              name: true,
              role: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: limit,
        skip: offset,
      }),
      prisma.order.count({ where }),
    ]);

    const formattedOrders = orders
      .filter((order) => {
        // Filter out orders with missing store (shouldn't happen, but safety check)
        if (!order.store) {
          console.error('[admin/orders] Order missing store:', order.id);
          return false;
        }
        return true;
      })
      .map((order) => ({
        id: order.id,
        orderId: order.id.length >= 8 ? order.id.substring(0, 8).toUpperCase() : order.id.toUpperCase(),
        time: order.createdAt.toISOString(),
        customerName: order.customerName || null,
        customerPhone: order.customerPhone || null,
        store: {
          id: order.store.id,
          name: order.store.name,
          code: order.store.code,
        },
        status: order.status,
        staff: order.staff
          ? {
              id: order.staff.id,
              name: order.staff.name,
              role: order.staff.role,
            }
          : order.assistedByName
          ? {
              id: null,
              name: order.assistedByName,
              role: null,
            }
          : null,
        finalAmount: order.finalPrice,
        salesMode: order.salesMode,
        createdAt: order.createdAt.toISOString(),
        updatedAt: order.updatedAt.toISOString(),
      }));

    return Response.json({
      success: true,
      data: formattedOrders,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });
  } catch (error: any) {
    console.error('[admin/orders] Error:', error);
    console.error('[admin/orders] Error type:', typeof error);
    console.error('[admin/orders] Error message:', error?.message);
    console.error('[admin/orders] Error stack:', error?.stack);
    
    // Log Prisma-specific errors
    if (error && typeof error === 'object' && 'code' in error) {
      const prismaError = error as { code: string; meta?: unknown; message?: string };
      console.error('[admin/orders] Prisma error code:', prismaError.code);
      console.error('[admin/orders] Prisma error message:', prismaError.message);
      console.error('[admin/orders] Prisma error meta:', JSON.stringify(prismaError.meta, null, 2));
    }
    
    return handleApiError(error);
  }
}

