import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleApiError } from '@/lib/errors';

/**
 * GET /api/store/[id]/staff
 * Get list of active staff for a store
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Validate store exists
    const store = await prisma.store.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!store) {
      return Response.json(
        {
          success: false,
          error: {
            code: 'RESOURCE_NOT_FOUND',
            message: 'Store not found',
          },
        },
        { status: 404 }
      );
    }

    const staff = await prisma.staff.findMany({
      where: {
        storeId: id,
        status: 'ACTIVE',
      },
      select: {
        id: true,
        name: true,
        phone: true,
        role: true,
        status: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    return Response.json({
      success: true,
      data: staff,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

