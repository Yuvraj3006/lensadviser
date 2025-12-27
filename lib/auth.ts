import jwt, { Secret } from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { UserRole } from '@/lib/constants';
import { AuthError } from '@/lib/errors';
import { getEnv } from '@/lib/env-validation';

// Use validated environment variables
const env = getEnv();
const JWT_SECRET = env.JWT_SECRET;
const JWT_EXPIRY = env.JWT_EXPIRY;

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
  try {
    // Ensure JWT_EXPIRY is a valid string for JWT library
    const expiresIn = JWT_EXPIRY && typeof JWT_EXPIRY === 'string' ? JWT_EXPIRY : '7d';
    console.log('[AUTH] Generating token with expiresIn:', expiresIn);

    // Explicitly type the options to avoid TypeScript overload confusion
    const options = { expiresIn } as jwt.SignOptions;
    return jwt.sign(payload, JWT_SECRET as string, options);
  } catch (error) {
    console.error('[AUTH] JWT generation error:', error);
    throw new Error('Failed to generate authentication token');
  }
}

export function verifyToken(token: string): TokenPayload {
  try {
    // Check if JWT_SECRET is set and not using default
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'your-secret-key-change-this') {
      console.error('[AUTH] WARNING: JWT_SECRET is not set or using default value. This will cause authentication failures.');
    }
    
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch (error: any) {
    // Provide more specific error messages
    if (error.name === 'TokenExpiredError') {
      throw new AuthError('Token has expired. Please log in again.');
    } else if (error.name === 'JsonWebTokenError') {
      throw new AuthError('Invalid token format or signature');
    } else if (error.name === 'NotBeforeError') {
      throw new AuthError('Token not yet valid');
    }
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

