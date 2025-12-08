import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticate, authorize, canManageRole } from '@/middleware/auth.middleware';
import { handleApiError, NotFoundError, ForbiddenError, BusinessRuleError } from '@/lib/errors';
import { UpdateUserSchema } from '@/lib/validation';
import { hashPassword } from '@/lib/auth';
import { UserRole } from '@/lib/constants';
import { z } from 'zod';

// PUT /api/admin/users/[id] - Update user
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await authenticate(request);
    authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.STORE_MANAGER)(currentUser);

    const { id } = await params;
    const body = await request.json();
    const validatedData = UpdateUserSchema.parse(body);

    // Get the user being updated
    const existingUser = await prisma.user.findUnique({
      where: {
        id,
        organizationId: currentUser.organizationId,
      },
    });

    if (!existingUser) {
      throw new NotFoundError('User');
    }

    // Role hierarchy validation
    if (validatedData.role && !canManageRole(currentUser.role, validatedData.role)) {
      throw new ForbiddenError('You cannot update users to this role');
    }

    // Store Managers can only update users in their store
    if (currentUser.role === UserRole.STORE_MANAGER) {
      if (existingUser.storeId !== currentUser.storeId) {
        throw new ForbiddenError('You can only update users in your store');
      }
    }

    // Prepare update data
    const updateData: any = {
      ...validatedData,
    };

    // Hash password if provided
    if (validatedData.password) {
      updateData.passwordHash = await hashPassword(validatedData.password);
      delete updateData.password;
    }

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
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

// DELETE /api/admin/users/[id] - Soft delete user
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await authenticate(request);
    authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.STORE_MANAGER)(currentUser);

    const { id } = await params;

    // Cannot delete self
    if (id === currentUser.userId) {
      throw new BusinessRuleError('You cannot delete your own account');
    }

    const existingUser = await prisma.user.findUnique({
      where: {
        id,
        organizationId: currentUser.organizationId,
      },
    });

    if (!existingUser) {
      throw new NotFoundError('User');
    }

    // Role hierarchy validation
    if (!canManageRole(currentUser.role, existingUser.role)) {
      throw new ForbiddenError('You cannot delete users with this role');
    }

    // Store Managers can only delete users in their store
    if (currentUser.role === UserRole.STORE_MANAGER) {
      if (existingUser.storeId !== currentUser.storeId) {
        throw new ForbiddenError('You can only delete users in your store');
      }
    }

    // Soft delete (set isActive to false)
    const user = await prisma.user.update({
      where: { id },
      data: {
        isActive: false,
      },
    });

    return Response.json({
      success: true,
      data: user,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

