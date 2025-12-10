import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleApiError } from '@/lib/errors';

/**
 * GET /api/public/tint-colors
 * Public endpoint to get all active tint colors (no authentication required)
 */
export async function GET(request: NextRequest) {
  try {
    const colors = await prisma.tintColor.findMany({
      where: {
        isActive: true,
      },
      orderBy: [
        { category: 'asc' },
        { displayOrder: 'asc' },
        { name: 'asc' },
      ],
    });

    return Response.json({
      success: true,
      data: colors,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
