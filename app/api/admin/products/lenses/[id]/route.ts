import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticate, authorize } from '@/middleware/auth.middleware';
import { handleApiError } from '@/lib/errors';
import { UserRole } from '@/lib/constants';
import { z } from 'zod';

const updateLensSchema = z.object({
  itCode: z.string().min(1).optional(),
  name: z.string().min(1).optional(),
  brandLine: z.enum(['DIGI360_ADVANCED', 'DIGI360_ESSENTIAL', 'DRIVEXPERT', 'DURASHIELD_NATURE', 'BLUEXPERT', 'BLUEXPERT_ADVANCED', 'CITYLIFE', 'VISIONX_ULTRA', 'VISIONX_NEO', 'PUREVIEW', 'HARDX', 'RELAX_PLUS', 'MYOCONTROL_INTRO', 'MYOCONTROL_ADVANCED', 'TINT_NEXT', 'TINT_PREMIUM', 'TINT_ESSENTIAL', 'IGNITE_BLUEBAN', 'IGNITE_NATURE', 'IGNITE_DRIVE', 'IGNITE_DIGITAL', 'IGNITE_GOLD', 'IGNITE_PLATINUM', 'PROGRESSIVE_PLUS', 'STANDARD', 'PREMIUM', 'OTHER']).optional(),
  visionType: z.enum(['SINGLE_VISION', 'PROGRESSIVE', 'BIFOCAL', 'ANTI_FATIGUE', 'MYOPIA_CONTROL']).optional(),
  lensIndex: z.enum(['INDEX_156', 'INDEX_160', 'INDEX_167', 'INDEX_174']).optional(),
  tintOption: z.enum(['CLEAR', 'TINT', 'PHOTOCHROMIC']).optional(),
  mrp: z.number().positive().optional(),
  offerPrice: z.number().positive().optional(),
  addOnPrice: z.number().optional(),
  sphMin: z.number().optional(),
  sphMax: z.number().optional(),
  cylMax: z.number().optional(),
  addMin: z.number().optional().nullable(),
  addMax: z.number().optional().nullable(),
  deliveryDays: z.number().int().optional(),
  warranty: z.string().optional().nullable(),
  yopoEligible: z.boolean().optional(),
}).partial();

// PUT /api/admin/products/lenses/:id - Update lens product (matches backend spec)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await authenticate(request);
    authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN)(user);

    const { id } = await params;
    const body = await request.json();
    const validated = updateLensSchema.parse(body);

    // This endpoint is deprecated - use /api/admin/lenses/[id] instead
    return Response.json(
      {
        success: false,
        error: {
          code: 'DEPRECATED_ENDPOINT',
          message: 'This endpoint is deprecated. Use /api/admin/lenses/[id] instead.',
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

