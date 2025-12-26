import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticate, authorize, canManageRole } from '@/middleware/auth.middleware';
import { handleApiError, ForbiddenError } from '@/lib/errors';
import { CreateUserSchema } from '@/lib/validation';
import { hashPassword } from '@/lib/auth';
import { UserRole } from '@/lib/constants';
import { parsePaginationParams, getPaginationSkip, createPaginationResponse } from '@/lib/pagination';
import { logger } from '@/lib/logger';
import { z } from 'zod';

// GET /api/admin/users - List all users
export async function GET(request: NextRequest) {
  try {
    const user = await authenticate(request);
    authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.STORE_MANAGER)(user);

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const role = searchParams.get('role');
    const storeId = searchParams.get('storeId');
    const isActive = searchParams.get('isActive');
    
    // Parse pagination parameters
    const { page, pageSize } = parsePaginationParams(searchParams);
    const skip = getPaginationSkip(page, pageSize);

    // Build base where clause
    const baseWhere: any = {
      organizationId: user.organizationId,
    };

    // Store Manager can only see users from their store
    if (user.role === UserRole.STORE_MANAGER && user.storeId) {
      baseWhere.storeId = user.storeId;
    } else if (storeId) {
      baseWhere.storeId = storeId;
    }

    if (role) {
      baseWhere.role = role as UserRole;
    }

    if (isActive !== null && isActive !== undefined) {
      baseWhere.isActive = isActive === 'true';
    }

    // Add search filter if provided (MongoDB text search)
    if (search) {
      baseWhere.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { employeeId: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Get total count and users in parallel
    const [total, users] = await Promise.all([
      prisma.user.count({ where: baseWhere }),
      prisma.user.findMany({
        where: baseWhere,
        skip,
        take: pageSize,
        orderBy: {
          createdAt: 'desc',
        },
      }),
    ]);

    // Fetch store names in batch (fix N+1)
    const storeIds = users.filter(u => u.storeId).map(u => u.storeId!);
    const stores = storeIds.length > 0 ? await prisma.store.findMany({
      where: {
        id: { in: storeIds },
        organizationId: user.organizationId,
      },
      select: {
        id: true,
        name: true,
      },
    }) : [];
    const storeMap = new Map(stores.map(s => [s.id, s.name]));

    const formattedUsers = users.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      employeeId: u.employeeId,
      phone: u.phone,
      storeId: u.storeId,
      storeName: u.storeId ? storeMap.get(u.storeId) || null : null,
      isActive: u.isActive,
      lastLoginAt: u.lastLoginAt,
      createdAt: u.createdAt,
    }));

    logger.info('Users list fetched', { 
      userId: user.userId, 
      total, 
      page, 
      pageSize,
      returned: formattedUsers.length 
    });

    return Response.json({
      success: true,
      data: createPaginationResponse(formattedUsers, total, page, pageSize),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

// POST /api/admin/users - Create new user
export async function POST(request: NextRequest) {
  try {
    const currentUser = await authenticate(request);
    authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.STORE_MANAGER)(currentUser);

    const body = await request.json();
    const validatedData = CreateUserSchema.parse(body);

    // Role hierarchy validation
    if (!canManageRole(currentUser.role, validatedData.role as UserRole)) {
      throw new ForbiddenError('You cannot create users with this role');
    }

    // Store Managers can only create users in their store
    if (currentUser.role === UserRole.STORE_MANAGER) {
      if (validatedData.role !== UserRole.SALES_EXECUTIVE) {
        throw new ForbiddenError('Store Managers can only create Sales Executives');
      }
      if (validatedData.storeId !== currentUser.storeId) {
        throw new ForbiddenError('You can only create users for your store');
      }
    }

    // Hash password
    const passwordHash = await hashPassword(validatedData.password);

    const user = await prisma.user.create({
      data: {
        organizationId: currentUser.organizationId,
        email: validatedData.email,
        passwordHash,
        name: validatedData.name,
        role: validatedData.role,
        storeId: validatedData.storeId || null,
        employeeId: validatedData.employeeId || '',
        phone: validatedData.phone || null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    return Response.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    logger.error('POST /api/admin/users error', { userId: currentUser.userId }, error as Error);
    if (error instanceof z.ZodError) {
      console.error('Validation errors:', error.issues);
      return Response.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Validation failed',
            details: error.issues.map((issue) => ({
              path: issue.path.join('.'),
              message: issue.message,
            })),
          },
        },
        { status: 400 }
      );
    }
    return handleApiError(error);
  }
}

