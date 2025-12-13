import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticate, authorize } from '@/middleware/auth.middleware';
import { handleApiError } from '@/lib/errors';
import { UserRole } from '@/lib/constants';

/**
 * GET /api/admin/config
 * Get all configuration settings
 */
export async function GET(request: NextRequest) {
  try {
    const user = await authenticate(request);
    authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN)(user);

    const configs = await prisma.config.findMany({
      orderBy: {
        key: 'asc',
      },
    });

    return Response.json({
      success: true,
      data: configs,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

