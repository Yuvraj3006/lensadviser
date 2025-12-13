import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticate, authorize } from '@/middleware/auth.middleware';
import { handleApiError, ValidationError } from '@/lib/errors';
import { UserRole } from '@/lib/constants';
import { z } from 'zod';

const updateConfigSchema = z.object({
  value: z.string().min(1, 'Value is required'),
});

/**
 * PUT /api/admin/config/[id]
 * Update a configuration setting
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const user = await authenticate(request);
    authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN)(user);

    const { id } = await Promise.resolve(params);
    const body = await request.json();

    const validated = updateConfigSchema.parse(body);

    // Validate combo_offer_status value
    const config = await prisma.config.findUnique({
      where: { id },
    });

    if (!config) {
      throw new ValidationError('Configuration not found');
    }

    if (config.key === 'combo_offer_status' && !['ON', 'OFF'].includes(validated.value)) {
      throw new ValidationError('combo_offer_status must be either ON or OFF');
    }

    const updated = await prisma.config.update({
      where: { id },
      data: {
        value: validated.value,
      },
    });

    return Response.json({
      success: true,
      data: updated,
    });
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

