import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleApiError } from '@/lib/errors';

// GET /api/benefits - List all benefits (public/read-only)
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const organizationId = searchParams.get('organizationId');

    if (!organizationId) {
      return Response.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'organizationId is required',
          },
        },
        { status: 400 }
      );
    }

    const benefits = await prisma.benefit.findMany({
      where: {
        organizationId,
      },
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

