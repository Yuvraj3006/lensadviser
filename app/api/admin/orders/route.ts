import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticate, authorize } from '@/middleware/auth.middleware';
import { handleApiError } from '@/lib/errors';
import { UserRole } from '@/lib/constants';
import { OrderStatus } from '@/lib/constants';

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
        orderBy: {
          createdAt: 'desc',
        },
        take: limit,
        skip: offset,
      }),
      prisma.order.count({ where }),
    ]);

    // Fetch store and staff data separately (Order model doesn't have relations)
    const storeIds = [...new Set(orders.map(o => o.storeId))];
    const stores = await prisma.store.findMany({
      where: { id: { in: storeIds } },
      select: { id: true, name: true, code: true },
    });
    const storeMap = new Map(stores.map(s => [s.id, s]));

    // Fetch staff data if assistedByStaffId exists
    const staffIds = orders
      .map(o => {
        const staffId = o.assistedByStaffId;
        if (staffId && typeof staffId === 'string') return staffId;
        if (staffId && typeof staffId === 'object' && 'value' in staffId) {
          return String(staffId.value);
        }
        return null;
      })
      .filter((id): id is string => id !== null);
    
    const staffMap = new Map();
    if (staffIds.length > 0) {
      try {
        const staff = await prisma.user.findMany({
          where: { id: { in: staffIds } },
          select: { id: true, name: true, role: true },
        });
        staff.forEach(s => staffMap.set(s.id, s));
      } catch (staffError) {
        console.warn('[admin/orders] Failed to fetch staff:', staffError);
      }
    }

    const formattedOrders = orders
      .map((order) => {
        const store = storeMap.get(order.storeId);
        if (!store) {
          console.error('[admin/orders] Order missing store:', order.id);
          return null;
        }

        // Handle staff data
        let staff = null;
        const staffId = order.assistedByStaffId;
        if (staffId) {
          const staffIdStr = typeof staffId === 'string' 
            ? staffId 
            : (typeof staffId === 'object' && 'value' in staffId) 
              ? String(staffId.value) 
              : null;
          
          if (staffIdStr && staffMap.has(staffIdStr)) {
            const staffData = staffMap.get(staffIdStr);
            staff = {
              id: staffData.id,
              name: staffData.name,
              role: staffData.role,
            };
          } else if (order.assistedByName) {
            // Fallback to assistedByName if staff not found
            const assistedByName = typeof order.assistedByName === 'string'
              ? order.assistedByName
              : (typeof order.assistedByName === 'object' && 'value' in order.assistedByName)
                ? String(order.assistedByName.value)
                : null;
            
            if (assistedByName) {
              staff = {
                id: null,
                name: assistedByName,
                role: null,
              };
            }
          }
        }

        return {
          id: order.id,
          orderId: order.id.length >= 8 ? order.id.substring(0, 8).toUpperCase() : order.id.toUpperCase(),
          time: order.createdAt.toISOString(),
          customerName: order.customerName || null,
          customerPhone: order.customerPhone || null,
          store: {
            id: store.id,
            name: store.name,
            code: store.code,
          },
          status: order.status,
          staff: staff,
          finalAmount: order.finalPrice,
          salesMode: order.salesMode,
          createdAt: order.createdAt.toISOString(),
          updatedAt: order.updatedAt.toISOString(),
        };
      })
      .filter((order): order is NonNullable<typeof order> => order !== null);

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

