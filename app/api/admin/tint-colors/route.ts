import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticate, authorize } from '@/middleware/auth.middleware';
import { handleApiError, ValidationError } from '@/lib/errors';
import { UserRole } from '@/lib/constants';
import { z } from 'zod';

const createTintColorSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  hexColor: z.string().optional(),
  imageUrl: z.string().optional(),
  category: z.enum(['SOLID', 'GRADIENT', 'FASHION']),
  darknessPercent: z.number().min(0).max(100),
  isPolarized: z.boolean().default(false),
  isMirror: z.boolean().default(false),
  isActive: z.boolean().default(true),
  displayOrder: z.number().default(0),
});

/**
 * GET /api/admin/tint-colors
 * List all tint colors
 */
export async function GET(request: NextRequest) {
  try {
    const user = await authenticate(request);
    authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN)(user);

    const colors = await prisma.tintColor.findMany({
      orderBy: [
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

/**
 * POST /api/admin/tint-colors
 * Create a new tint color
 */
export async function POST(request: NextRequest) {
  try {
    const user = await authenticate(request);
    authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN)(user);

    const body = await request.json();
    const validated = createTintColorSchema.parse(body);

    // Check if code already exists
    const existing = await prisma.tintColor.findUnique({
      where: { code: validated.code },
    });

    if (existing) {
      throw new ValidationError('Tint color code already exists');
    }

    const color = await prisma.tintColor.create({
      data: validated,
    });

    return Response.json({
      success: true,
      data: color,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

