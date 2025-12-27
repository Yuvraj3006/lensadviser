import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleApiError } from '@/lib/errors';
import { CreateUserSchema } from '@/lib/validation';
import { hashPassword } from '@/lib/auth';
import { UserRole } from '@/lib/constants';
import { parsePaginationParams, getPaginationSkip, createPaginationResponse } from '@/lib/pagination';
import { logger } from '@/lib/logger';
import { z } from 'zod';

// GET /api/admin/users - List all users
export async function GET(request: NextRequest) {
  try {
    // Dummy auth bypass for development
    const user = {
      userId: '507f1f77bcf86cd799439011', // Valid MongoDB ObjectId
      organizationId: '507f1f77bcf86cd799439011', // Valid MongoDB ObjectId
      role: UserRole.ADMIN,
      storeId: null,
    };

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const role = searchParams.get('role');
    const storeId = searchParams.get('storeId');
    const isActive = searchParams.get('isActive');
    
    // Parse pagination parameters
    const { page, pageSize } = parsePaginationParams(searchParams);
    const skip = getPaginationSkip(page, pageSize);

    // Build base where clause
    // Note: Using dummy org ID - in production, filter by actual user.organizationId
    const baseWhere: any = {};

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

    const paginationResult = createPaginationResponse(formattedUsers, total, page, pageSize);

    return Response.json({
      success: true,
      data: paginationResult.data,
      pagination: paginationResult.pagination,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

// POST /api/admin/users - Create new user
export async function POST(request: NextRequest) {
  try {
    // Dummy auth bypass for development
    const currentUser = {
      userId: '507f1f77bcf86cd799439011', // Valid MongoDB ObjectId
      organizationId: '507f1f77bcf86cd799439011', // Valid MongoDB ObjectId
      role: UserRole.ADMIN,
      storeId: null,
    };

    const body = await request.json();
    const validatedData = CreateUserSchema.parse(body);

    // Dummy auth - role validation bypassed for development

    // Hash password
    const passwordHash = await hashPassword(validatedData.password);

    // Note: Using dummy org ID - in production, use actual currentUser.organizationId
    // First, get or create a dummy organization
    let org = await prisma.organization.findFirst({
      where: { code: 'DUMMY' },
    });
    if (!org) {
      org = await prisma.organization.create({
        data: {
          code: 'DUMMY',
          name: 'Dummy Organization',
          baseLensPrice: 0,
          isActive: true,
          settings: {},
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
    }

    const user = await prisma.user.create({
      data: {
        organizationId: org.id,
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
    logger.error('POST /api/admin/users error', {}, error as Error);
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

