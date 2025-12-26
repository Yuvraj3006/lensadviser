/**
 * CSRF (Cross-Site Request Forgery) Protection
 * Generates and validates CSRF tokens
 */

import { randomBytes, createHash } from 'crypto';

/**
 * Generate a CSRF token
 */
export function generateCSRFToken(): string {
  return randomBytes(32).toString('hex');
}

/**
 * Generate CSRF token hash (for server-side validation)
 */
export function hashCSRFToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Validate CSRF token
 * In a real implementation, you'd store tokens in session/Redis
 */
export function validateCSRFToken(
  token: string,
  sessionToken: string | null
): boolean {
  if (!token || !sessionToken) {
    return false;
  }

  // For now, simple comparison (in production, use session-based validation)
  // TODO: Implement proper session-based CSRF token storage
  return token === sessionToken;
}

/**
 * Get CSRF token from request
 */
export function getCSRFTokenFromRequest(request: Request): string | null {
  // Check header first
  const headerToken = request.headers.get('X-CSRF-Token');
  if (headerToken) {
    return headerToken;
  }

  // Check body (for form submissions)
  // Note: This requires async body parsing
  return null;
}

