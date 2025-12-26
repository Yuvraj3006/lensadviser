import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, RATE_LIMITS } from './middleware/rate-limit';
import { cors, handleCorsPreflight } from './middleware/cors';

/**
 * Next.js Middleware
 * Handles rate limiting, CORS, and security headers
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Handle CORS preflight requests
  if (request.method === 'OPTIONS') {
    const preflightResponse = handleCorsPreflight(request);
    if (preflightResponse) {
      return preflightResponse;
    }
  }

  // Apply rate limiting based on route
  let rateLimitConfig = RATE_LIMITS.DEFAULT;

  // Login endpoint - strict rate limiting
  if (pathname === '/api/auth/login') {
    rateLimitConfig = RATE_LIMITS.LOGIN;
  }
  // Admin APIs - higher limit
  else if (pathname.startsWith('/api/admin/')) {
    rateLimitConfig = RATE_LIMITS.ADMIN_API;
  }
  // Public APIs - moderate limit
  else if (pathname.startsWith('/api/public/') || pathname.startsWith('/api/')) {
    rateLimitConfig = RATE_LIMITS.PUBLIC_API;
  }

  // Apply rate limiting
  const rateLimitResponse = rateLimit(rateLimitConfig)(request);
  if (rateLimitResponse) {
    // Add CORS headers to rate limit response
    const corsHeaders = cors(request);
    Object.entries(corsHeaders).forEach(([key, value]) => {
      rateLimitResponse.headers.set(key, value);
    });
    return rateLimitResponse;
  }

  // Add CORS headers to response
  const response = NextResponse.next();
  const corsHeaders = cors(request);
  Object.entries(corsHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  return response;
}

// Configure which routes to run middleware on
export const config = {
  matcher: [
    '/api/:path*', // All API routes
  ],
};

