import { NextRequest } from 'next/server';
import { authenticate, authorize } from '@/middleware/auth.middleware';
import { handleApiError } from '@/lib/errors';
import { UserRole } from '@/lib/constants';
import { recomputeBenefitStats } from '@/lib/benefit-stats';

export async function POST(request: NextRequest) {
  try {
    const user = await authenticate(request);
    authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN)(user);

    await recomputeBenefitStats(user.organizationId);

    return Response.json({
      success: true,
      data: { message: 'Benefit stats refreshed' },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
