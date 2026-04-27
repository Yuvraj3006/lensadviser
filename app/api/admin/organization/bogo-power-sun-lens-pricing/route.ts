import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { authenticate, authorize } from '@/middleware/auth.middleware';
import { handleApiError } from '@/lib/errors';
import { UserRole } from '@/lib/constants';

const bodySchema = z.object({
  bogoPowerSunSecondPairLensBasePrice: z.number().positive().nullable(),
});

// GET: current org — BOGO power-sun 2nd-pair lens base (optional override)
export async function GET(request: NextRequest) {
  try {
    const user = await authenticate(request);
    authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.STORE_MANAGER)(user);

    const org = await prisma.organization.findUnique({
      where: { id: user.organizationId },
      select: { bogoPowerSunSecondPairLensBasePrice: true },
    });

    return Response.json({
      success: true,
      data: {
        bogoPowerSunSecondPairLensBasePrice: org?.bogoPowerSunSecondPairLensBasePrice ?? null,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

// PATCH: set or clear (null) the override for 2nd-pair power-sun lens base
export async function PATCH(request: NextRequest) {
  try {
    const user = await authenticate(request);
    authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN)(user);

    const body = await request.json();
    const parsed = bodySchema.parse(body);

    const updated = await prisma.organization.update({
      where: { id: user.organizationId },
      data: {
        bogoPowerSunSecondPairLensBasePrice: parsed.bogoPowerSunSecondPairLensBasePrice,
      },
      select: { bogoPowerSunSecondPairLensBasePrice: true },
    });

    return Response.json({
      success: true,
      data: {
        bogoPowerSunSecondPairLensBasePrice: updated.bogoPowerSunSecondPairLensBasePrice,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
