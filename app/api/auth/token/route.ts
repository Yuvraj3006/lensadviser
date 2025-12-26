import { NextRequest } from 'next/server';
import { extractTokenFromCookie } from '@/lib/auth';
import { handleApiError, AuthError } from '@/lib/errors';

/**
 * GET /api/auth/token
 * Returns the current authentication token from httpOnly cookie
 * This endpoint allows client-side code to get the token without storing it in localStorage
 */
export async function GET(request: NextRequest) {
  try {
    const cookieHeader = request.headers.get('Cookie');
    const token = extractTokenFromCookie(cookieHeader);

    if (!token) {
      return Response.json({
        success: false,
        error: {
          code: 'NO_TOKEN',
          message: 'No token found in cookies',
        },
      }, { status: 401 });
    }

    return Response.json({
      success: true,
      data: {
        token,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

