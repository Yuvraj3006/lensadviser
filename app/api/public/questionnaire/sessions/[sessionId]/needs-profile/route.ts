import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleApiError, NotFoundError } from '@/lib/errors';

/**
 * GET /api/public/questionnaire/sessions/[sessionId]/needs-profile
 * Get needs profile for a session
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> | { sessionId: string } }
) {
  try {
    const { sessionId } = await Promise.resolve(params);

    const needsProfile = await prisma.needsProfile.findUnique({
      where: { sessionId },
    });

    if (!needsProfile) {
      return Response.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Needs profile not found',
          },
        },
        { status: 404 }
      );
    }

    return Response.json({
      success: true,
      data: {
        primary_usage: needsProfile.primaryUsage,
        screen_time: needsProfile.screenTime,
        driving_night: needsProfile.drivingNight,
        outdoor_frequency: needsProfile.outdoorFrequency,
        backup_need: needsProfile.backupNeed,
        lens_complexity: needsProfile.lensComplexity,
        sensitivity_flags: needsProfile.sensitivityFlags,
        recommend_second_eyewear: needsProfile.recommendSecondEyewear,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

