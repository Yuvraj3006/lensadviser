import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticate, authorize } from '@/middleware/auth.middleware';
import { handleApiError, NotFoundError, BusinessRuleError } from '@/lib/errors';
import { UpdateStoreSchema } from '@/lib/validation';
import { UserRole } from '@prisma/client';
import { z } from 'zod';

// GET /api/admin/stores/[id] - Get store details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await authenticate(request);
    authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN)(user);

    const { id } = await params;

    const store = await prisma.store.findUnique({
      where: {
        id,
        organizationId: user.organizationId,
      },
      include: {
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        _count: {
          select: {
            users: true,
            staff: true,
            orders: true,
          },
        },
      },
    });

    if (!store) {
      throw new NotFoundError('Store');
    }

    // Serialize Date objects
    const serialized = {
      ...store,
      createdAt: store.createdAt.toISOString(),
      updatedAt: store.updatedAt.toISOString(),
      users: store.users,
    };

    return Response.json({
      success: true,
      data: serialized,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

// PUT /api/admin/stores/[id] - Update store
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await authenticate(request);
    authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN)(user);

    const { id } = await params;
    const body = await request.json();
    const validatedData = UpdateStoreSchema.parse(body);

    const store = await prisma.store.update({
      where: {
        id,
        organizationId: user.organizationId,
      },
      data: validatedData,
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

// DELETE /api/admin/stores/[id] - Soft delete store
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await authenticate(request);
    authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN)(user);

    const { id } = await params;

    // Check for active sessions
    const activeSessions = await prisma.session.count({
      where: {
        storeId: id,
        status: 'IN_PROGRESS',
      },
    });

    if (activeSessions > 0) {
      throw new BusinessRuleError(
        'Cannot delete store with active sessions. Please complete or abandon all sessions first.'
      );
    }

    // Soft delete (set isActive to false)
    const store = await prisma.store.update({
      where: {
        id,
        organizationId: user.organizationId,
      },
      data: {
        isActive: false,
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
    return handleApiError(error);
  }
}

