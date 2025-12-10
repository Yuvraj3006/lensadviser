import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticate, authorize } from '@/middleware/auth.middleware';
import { handleApiError, ValidationError } from '@/lib/errors';
import { UserRole } from '@/lib/constants';
import { z } from 'zod';

const createMirrorCoatingSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  imageUrl: z.string().optional(),
  addOnPrice: z.number().min(0).default(0),
  isActive: z.boolean().default(true),
  displayOrder: z.number().default(0),
});

/**
 * GET /api/admin/mirror-coatings
 * List all mirror coatings
 */
export async function GET(request: NextRequest) {
  try {
    const user = await authenticate(request);
    authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN)(user);

    const coatings = await prisma.mirrorCoating.findMany({
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

/**
 * POST /api/admin/mirror-coatings
 * Create a new mirror coating
 */
export async function POST(request: NextRequest) {
  try {
    const user = await authenticate(request);
    authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN)(user);

    const body = await request.json();
    const validated = createMirrorCoatingSchema.parse(body);

    // Check if code already exists
    const existing = await prisma.mirrorCoating.findUnique({
      where: { code: validated.code },
    });

    if (existing) {
      throw new ValidationError('Mirror coating code already exists');
    }

    const coating = await prisma.mirrorCoating.create({
      data: validated,
    });

    return Response.json({
      success: true,
      data: coating,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

