import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticate, authorize } from '@/middleware/auth.middleware';
import { handleApiError } from '@/lib/errors';
import { UserRole } from '@/lib/constants';
import { z } from 'zod';

const createLensSchema = z.object({
  itCode: z.string().min(1),
  name: z.string().min(1),
  brandLine: z.enum(['DIGI360_ADVANCED', 'DIGI360_ESSENTIAL', 'DRIVEXPERT', 'DURASHIELD_NATURE', 'BLUEXPERT', 'BLUEXPERT_ADVANCED', 'CITYLIFE', 'VISIONX_ULTRA', 'VISIONX_NEO', 'PUREVIEW', 'HARDX', 'RELAX_PLUS', 'MYOCONTROL_INTRO', 'MYOCONTROL_ADVANCED', 'TINT_NEXT', 'TINT_PREMIUM', 'TINT_ESSENTIAL', 'IGNITE_BLUEBAN', 'IGNITE_NATURE', 'IGNITE_DRIVE', 'IGNITE_DIGITAL', 'IGNITE_GOLD', 'IGNITE_PLATINUM', 'PROGRESSIVE_PLUS', 'STANDARD', 'PREMIUM', 'OTHER']),
  visionType: z.enum(['MYOPIA', 'HYPEROPIA', 'ASTIGMATISM', 'PRESBYOPIA', 'MULTIFOCAL', 'OTHER']).optional().nullable(),
  lensIndex: z.enum(['INDEX_156', 'INDEX_160', 'INDEX_167', 'INDEX_174']),
  tintOption: z.enum(['CLEAR', 'TINT', 'PHOTOCHROMIC']).optional().default('CLEAR'),
  mrp: z.number().positive(),
  offerPrice: z.number().positive(),
  addOnPrice: z.number().optional(),
  sphMin: z.number(),
  sphMax: z.number(),
  cylMax: z.number(),
  addMin: z.number().optional().nullable(),
  addMax: z.number().optional().nullable(),
  deliveryDays: z.number().int().optional().default(4),
  warranty: z.string().optional().nullable(),
  yopoEligible: z.boolean().optional().default(true),
});

// POST /api/admin/products/lenses - Create lens product (matches backend spec)
export async function POST(request: NextRequest) {
  try {
    const user = await authenticate(request);
    authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN)(user);

    const body = await request.json();
    const validated = createLensSchema.parse(body);

    // Check if itCode already exists
    const existing = await prisma.lensProduct.findUnique({
      where: {
        itCode: validated.itCode,
      },
    });

    if (existing) {
      return Response.json(
        {
          success: false,
          error: {
            code: 'DUPLICATE_IT_CODE',
            message: 'IT Code already exists',
          },
        },
        { status: 400 }
      );
    }

    // This endpoint is deprecated - use /api/admin/lenses instead
    return Response.json(
      {
        success: false,
        error: {
          code: 'DEPRECATED_ENDPOINT',
          message: 'This endpoint is deprecated. Use /api/admin/lenses instead.',
        },
      },
      { status: 410 }
    );
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

