import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleApiError } from '@/lib/errors';

// GET /api/benefits - List all benefits (public/read-only)
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    let organizationId = searchParams.get('organizationId');

    // Try to get from auth if not in query
    if (!organizationId) {
      try {
        const { authenticate } = await import('@/middleware/auth.middleware');
        const user = await authenticate(request);
        organizationId = user.organizationId;
      } catch {
        // Not authenticated, return all benefits (they're global)
        organizationId = null;
      }
    }

    const where: any = {};
    if (organizationId) {
      where.organizationId = organizationId;
    }

    const benefits = await prisma.benefit.findMany({
      where,
      orderBy: {
        code: 'asc',
      },
    });

    // Serialize Date objects to strings
    const serializedBenefits = benefits.map((benefit) => ({
      ...benefit,
      createdAt: benefit.createdAt.toISOString(),
      updatedAt: benefit.updatedAt.toISOString(),
    }));

    return Response.json({
      success: true,
      data: serializedBenefits,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

