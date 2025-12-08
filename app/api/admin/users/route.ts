import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticate, authorize, canManageRole } from '@/middleware/auth.middleware';
import { handleApiError, ForbiddenError } from '@/lib/errors';
import { CreateUserSchema } from '@/lib/validation';
import { hashPassword } from '@/lib/auth';
import { UserRole } from '@prisma/client';
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

    // Fetch users first, then filter by search in memory for case-insensitive search
    let users = await prisma.user.findMany({
      where: baseWhere,
      include: {
        store: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Filter by search term in memory (case-insensitive)
    if (search) {
      const searchLower = search.toLowerCase();
      users = users.filter(
        (u) =>
          u.name.toLowerCase().includes(searchLower) ||
          u.email.toLowerCase().includes(searchLower) ||
          u.employeeId.toLowerCase().includes(searchLower)
      );
    }

    const formattedUsers = users.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      employeeId: u.employeeId,
      phone: u.phone,
      storeId: u.storeId,
      storeName: u.store?.name || null,
      isActive: u.isActive,
      lastLoginAt: u.lastLoginAt,
      createdAt: u.createdAt,
    }));

    return Response.json({
      success: true,
      data: formattedUsers,
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
    if (!canManageRole(currentUser.role, validatedData.role)) {
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
    console.error('POST /api/admin/users error:', error);
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

