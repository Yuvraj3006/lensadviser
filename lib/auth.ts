import jwt, { Secret } from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { UserRole } from '@/lib/constants';
import { AuthError } from '@/lib/errors';

const JWT_SECRET: Secret = (process.env.JWT_SECRET || 'your-secret-key-change-this') as Secret;
const JWT_EXPIRY = process.env.JWT_EXPIRY || '7d';

export interface TokenPayload {
  userId: string;
  email: string;
  role: UserRole;
  organizationId: string;
  storeId: string | null;
  iat?: number;
  exp?: number;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateToken(payload: Omit<TokenPayload, 'iat' | 'exp'>): string {
  // @ts-ignore - JWT type compatibility
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRY });
}

export function verifyToken(token: string): TokenPayload {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch (error) {
    throw new AuthError('Invalid or expired token');
  }
}

export function extractTokenFromHeader(authHeader: string | null): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
}

export function extractTokenFromCookie(cookieHeader: string | null): string | null {
  if (!cookieHeader) {
    return null;
  }
  const cookies = cookieHeader.split(';').map(c => c.trim());
  const tokenCookie = cookies.find(c => c.startsWith('lenstrack_token='));
  if (!tokenCookie) {
    return null;
  }
  return tokenCookie.substring('lenstrack_token='.length);
}

