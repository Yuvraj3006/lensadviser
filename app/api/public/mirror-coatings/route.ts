import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleApiError } from '@/lib/errors';

/**
 * GET /api/public/mirror-coatings
 * Public endpoint to get all active mirror coatings (no authentication required)
 */
export async function GET(request: NextRequest) {
  try {
    const coatings = await prisma.mirrorCoating.findMany({
      where: {
        isActive: true,
      },
      orderBy: [
        { displayOrder: 'asc' },
        { name: 'asc' },
      ],
    });

    return Response.json({
      success: true,
      data: coatings,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
