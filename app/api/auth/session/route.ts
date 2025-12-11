import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken, extractTokenFromHeader, extractTokenFromCookie } from '@/lib/auth';
import { handleApiError, AuthError } from '@/lib/errors';

export async function GET(request: NextRequest) {
  // #region agent log
  console.log('[DEBUG] GET /api/auth/session entry', { timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'C' });
  // #endregion
  try {
    // Try to get token from Authorization header first
    const authHeader = request.headers.get('Authorization');
    let token = extractTokenFromHeader(authHeader);

    // If no token in header, try to get from cookie
    if (!token) {
      const cookieHeader = request.headers.get('Cookie');
      token = extractTokenFromCookie(cookieHeader);
    }

    // #region agent log
    console.log('[DEBUG] GET /api/auth/session token extracted', { hasToken: !!token, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'C' });
    // #endregion

    if (!token) {
      throw new AuthError('No token provided');
    }

    // Verify token
    // #region agent log
    console.log('[DEBUG] GET /api/auth/session before verifyToken', { timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'C' });
    // #endregion
    const payload = verifyToken(token);
    // #region agent log
    console.log('[DEBUG] GET /api/auth/session after verifyToken', { userId: payload?.userId, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'C' });
    // #endregion

    // Get user from database
    // #region agent log
    console.log('[DEBUG] GET /api/auth/session before prisma query', { timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'B' });
    // #endregion
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    });
    // #region agent log
    console.log('[DEBUG] GET /api/auth/session after prisma query', { userFound: !!user, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'B' });
    // #endregion

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
  } catch (error: any) {
    // #region agent log
    console.error('[DEBUG] GET /api/auth/session error', { error: error?.message, code: error?.code, stack: error?.stack, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'A' });
    // #endregion
    return handleApiError(error);
  }
}

