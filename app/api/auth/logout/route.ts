import { NextRequest } from 'next/server';
import { handleApiError } from '@/lib/errors';

export async function POST(request: NextRequest) {
  try {
    // In a JWT-based system, logout is handled client-side
    // This endpoint can be used for logging or token blacklisting if needed

    const response = Response.json({
      success: true,
      data: {
        message: 'Logged out successfully',
      },
    });

    // Clear the authentication cookie
    response.headers.set(
      'Set-Cookie',
      'lenstrack_token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0'
    );

    return response;
  } catch (error) {
    return handleApiError(error);
  }
}

