import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleApiError } from '@/lib/errors';
import { CreateStoreSchema } from '@/lib/validation';
import { UserRole } from '@/lib/constants';
import { parsePaginationParams, getPaginationSkip, createPaginationResponse } from '@/lib/pagination';
import { logger } from '@/lib/logger';
import { z } from 'zod';

// GET /api/admin/stores - List all stores
export async function GET(request: NextRequest) {
  try {
    // Dummy auth bypass for development
    const user = {
      userId: 'dummy-user-id',
      organizationId: 'dummy-org-id',
      role: UserRole.ADMIN,
      storeId: null,
    };

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const isActive = searchParams.get('isActive');
    
    // Parse pagination parameters
    const { page, pageSize } = parsePaginationParams(searchParams);
    const skip = getPaginationSkip(page, pageSize);

    // Build where clause - MongoDB compatible
    // Note: Using dummy org ID - in production, filter by actual user.organizationId
    const where: any = {};

    if (isActive !== null && isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    // Add search filter if provided
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
        { city: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Get total count and stores in parallel
    const [total, stores] = await Promise.all([
      prisma.store.count({ where }),
      prisma.store.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: {
          createdAt: 'desc',
        },
      }),
    ]);

    // Batch count users and orders for all stores (fix N+1)
    const storeIds = stores.map((s) => s.id);
    const [users, orders] = storeIds.length > 0
      ? await Promise.all([
          prisma.user.findMany({
            where: { storeId: { in: storeIds } },
            select: { storeId: true },
          }),
          prisma.order.findMany({
            where: { storeId: { in: storeIds } },
            select: { storeId: true },
          }),
        ])
      : [[], []];

    // Create count maps
    const userCountMap = new Map<string, number>();
    const orderCountMap = new Map<string, number>();

    users.forEach((u) => {
      if (u.storeId) {
        userCountMap.set(u.storeId, (userCountMap.get(u.storeId) || 0) + 1);
      }
    });

    orders.forEach((o) => {
      orderCountMap.set(o.storeId, (orderCountMap.get(o.storeId) || 0) + 1);
    });

    // Format stores with counts
    const formattedStores = stores.map((store) => ({
      id: store.id,
      code: store.code,
      name: store.name,
      city: store.city,
      state: store.state,
      phone: store.phone,
      email: store.email,
      gstNumber: store.gstNumber,
      isActive: store.isActive,
      staffCount: userCountMap.get(store.id) || 0,
      sessionCount: orderCountMap.get(store.id) || 0,
      orderCount: orderCountMap.get(store.id) || 0,
      createdAt: store.createdAt instanceof Date 
        ? store.createdAt.toISOString() 
        : new Date(store.createdAt).toISOString(),
    }));

    logger.info('Stores list fetched', { 
      userId: user.userId, 
      total, 
      page, 
      pageSize,
      returned: formattedStores.length 
    });

    return Response.json({
      success: true,
      data: createPaginationResponse(formattedStores, total, page, pageSize),
    });
  } catch (error) {
    logger.error('GET /api/admin/stores error', {}, error as Error);
    return handleApiError(error);
  }
}

// POST /api/admin/stores - Create new store
export async function POST(request: NextRequest) {
  try {
    // Dummy auth bypass for development
    const user = {
      userId: 'dummy-user-id',
      organizationId: 'dummy-org-id',
      role: UserRole.ADMIN,
      storeId: null,
    };

    const body = await request.json();
    const validatedData = CreateStoreSchema.parse(body);

    // Note: Using dummy org ID - in production, use actual user.organizationId
    const store = await prisma.store.create({
      data: {
        code: validatedData.code,
        name: validatedData.name,
        address: validatedData.address || '',
        city: validatedData.city || '',
        state: validatedData.state || '',
        pincode: validatedData.pincode || '',
        phone: validatedData.phone || '',
        email: validatedData.email || '',
        gstNumber: validatedData.gstNumber || '',
        organizationId: 'dummy-org-id',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    // Serialize Date objects
    const serialized = {
      ...store,
      createdAt: store.createdAt.toISOString(),
      updatedAt: store.updatedAt.toISOString(),
    };

    return Response.json({
      success: true,
      data: serialized,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Validation failed',
            details: error.issues,
          },
        },
        { status: 400 }
      );
    }
    return handleApiError(error);
  }
}

