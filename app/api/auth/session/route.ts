import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken, extractTokenFromHeader } from '@/lib/auth';
import { handleApiError, AuthError } from '@/lib/errors';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      throw new AuthError('No token provided');
    }

    // Verify token
    const payload = verifyToken(token);

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: {
        store: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!user || !user.isActive) {
      throw new AuthError('User not found or inactive');
    }

    return Response.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          storeId: user.storeId,
          storeName: user.store?.name || null,
        },
        organizationId: user.organizationId,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

