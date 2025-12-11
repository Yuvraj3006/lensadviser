import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticate, authorize } from '@/middleware/auth.middleware';
import { handleApiError } from '@/lib/errors';
import { UserRole } from '@/lib/constants';

/**
 * GET /api/admin/benefits/all
 * Get all benefits (including inactive) for admin management
 */
export async function GET(request: NextRequest) {
  try {
    const user = await authenticate(request);
    authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN)(user);

    const benefits = await prisma.benefit.findMany({
      where: {
        organizationId: user.organizationId,
      },
      orderBy: {
        code: 'asc',
      },
    });

    return Response.json({
      success: true,
      data: benefits.map((b) => ({
        id: b.id,
        code: b.code,
        name: b.name || b.code,
        description: b.description,
        isActive: b.isActive,
        createdAt: b.createdAt.toISOString(),
        updatedAt: b.updatedAt.toISOString(),
      })),
    });
  } catch (error) {
    return handleApiError(error);
  }
}


