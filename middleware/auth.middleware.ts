import { NextRequest } from 'next/server';
import { verifyToken, extractTokenFromHeader, extractTokenFromCookie, TokenPayload } from '@/lib/auth';
import { AuthError, ForbiddenError } from '@/lib/errors';
import { UserRole } from '@/lib/constants';

export async function authenticate(request: NextRequest): Promise<TokenPayload> {
  // Try to get token from Authorization header first
  const authHeader = request.headers.get('Authorization');
  let token = extractTokenFromHeader(authHeader);

  // If no token in header, try to get from cookie
  if (!token) {
    const cookieHeader = request.headers.get('Cookie');
    token = extractTokenFromCookie(cookieHeader);
  }

  if (!token) {
    throw new AuthError('No token provided. Please ensure you are logged in and the token is included in the Authorization header or cookie.');
  }

  try {
    const payload = verifyToken(token);
    return payload;
  } catch (error) {
    throw new AuthError('Invalid or expired token');
  }
}

export function authorize(...allowedRoles: UserRole[]) {
  return (user: TokenPayload) => {
    if (!allowedRoles.includes(user.role)) {
      throw new ForbiddenError('Insufficient permissions');
    }
  };
}

// Role hierarchy helper
export function canManageRole(currentRole: UserRole, targetRole: UserRole): boolean {
  const hierarchy = {
    [UserRole.SUPER_ADMIN]: 4,
    [UserRole.ADMIN]: 3,
    [UserRole.STORE_MANAGER]: 2,
    [UserRole.SALES_EXECUTIVE]: 1,
  };

  return hierarchy[currentRole] > hierarchy[targetRole];
}

