import { NextRequest } from 'next/server';
import { handleApiError } from '@/lib/errors';

/**
 * POST /api/auth/logout
 * Logout user and clear httpOnly cookie
 */
export async function POST(request: NextRequest) {
  try {
    // Clear the httpOnly cookie
    const response = Response.json({
      success: true,
      data: {
        message: 'Logged out successfully',
      },
    });

    // Clear cookie by setting it to expire in the past
    response.headers.set(
      'Set-Cookie',
      `lenstrack_token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`
    );

    return response;
  } catch (error) {
    return handleApiError(error);
  }
}
