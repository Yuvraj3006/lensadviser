import { NextRequest } from 'next/server';
import { clearAllRateLimits } from '@/middleware/rate-limit';
import { handleApiError } from '@/lib/errors';

/**
 * POST /api/admin/clear-rate-limits
 * Clear all rate limits (development only)
 */
export async function POST(request: NextRequest) {
  try {
    // Only allow in development
    if (process.env.NODE_ENV !== 'development') {
      return Response.json({
        success: false,
        error: {
          code: 'NOT_ALLOWED',
          message: 'This endpoint is only available in development mode',
        },
      }, { status: 403 });
    }

    // Clear all rate limits
    clearAllRateLimits();

    return Response.json({
      success: true,
      data: {
        message: 'All rate limits cleared successfully',
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
