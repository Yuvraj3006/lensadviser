import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticate, authorize } from '@/middleware/auth.middleware';
import { handleApiError } from '@/lib/errors';
import { CreateStoreSchema } from '@/lib/validation';
import { UserRole } from '@/lib/constants';
import { z } from 'zod';

// GET /api/admin/stores - List all stores
export async function GET(request: NextRequest) {
  try {
    let user;
    try {
      user = await authenticate(request);
      authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN)(user);
    } catch (authError) {
      console.error('Authentication error:', authError);
      throw authError;
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const isActive = searchParams.get('isActive');

    // Build where clause - MongoDB compatible
    const where: any = {
      organizationId: user.organizationId,
    };

    if (isActive !== null && isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    // Fetch all stores first, then filter by search if needed
    let stores;
    try {
      stores = await prisma.store.findMany({
        where,
        orderBy: {
          createdAt: 'desc',
        },
      });
      console.log(`Found ${stores.length} stores`);
    } catch (dbError) {
      console.error('Database query error:', dbError);
      throw dbError;
    }

    // Filter by search term in memory (MongoDB compatible approach)
    if (search) {
      const searchLower = search.toLowerCase();
      stores = stores.filter(
        (store) =>
          store.name.toLowerCase().includes(searchLower) ||
          store.code.toLowerCase().includes(searchLower) ||
          store.city.toLowerCase().includes(searchLower)
      );
    }

    // Get all store IDs for batch counting
    const storeIds = stores.map((s) => s.id);

    // Batch count users and orders for all stores (only if we have stores)
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
      orderCount: orderCountMap.get(store.id) || 0,
      createdAt: store.createdAt instanceof Date 
        ? store.createdAt.toISOString() 
        : new Date(store.createdAt).toISOString(),
    }));

    return Response.json({
      success: true,
      data: formattedStores,
    });
  } catch (error) {
    console.error('GET /api/admin/stores error:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      console.error('Error name:', error.name);
    }
    return handleApiError(error);
  }
}

// POST /api/admin/stores - Create new store
export async function POST(request: NextRequest) {
  try {
    const user = await authenticate(request);
    authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN)(user);

    const body = await request.json();
    const validatedData = CreateStoreSchema.parse(body);

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
        organizationId: user.organizationId,
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

