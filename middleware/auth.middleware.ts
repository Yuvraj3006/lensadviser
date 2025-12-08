import { NextRequest } from 'next/server';
import { verifyToken, extractTokenFromHeader, TokenPayload } from '@/lib/auth';
import { AuthError, ForbiddenError } from '@/lib/errors';
import { UserRole } from '@/lib/constants';

export async function authenticate(request: NextRequest): Promise<TokenPayload> {
  const authHeader = request.headers.get('Authorization');
  const token = extractTokenFromHeader(authHeader);

  if (!token) {
    throw new AuthError('No token provided');
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

