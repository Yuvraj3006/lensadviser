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
    });

    if (!user || !user.isActive) {
      throw new AuthError('User not found or inactive');
    }

    // Fetch store name separately
    let storeName: string | null = null;
    if (user.storeId) {
      try {
        const store = await prisma.store.findUnique({
          where: { id: user.storeId },
          select: { name: true },
        });
        storeName = store?.name || null;
      } catch (storeError) {
        console.warn(`Failed to fetch store for user ${user.id}:`, storeError);
      }
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
          storeName: storeName,
        },
        organizationId: user.organizationId,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

