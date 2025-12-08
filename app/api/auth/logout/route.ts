import { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  // In a JWT-based system, logout is handled client-side
  // This endpoint can be used for logging or token blacklisting if needed

  return Response.json({
    success: true,
    data: {
      message: 'Logged out successfully',
    },
  });
}

