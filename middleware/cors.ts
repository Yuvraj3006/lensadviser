/**
 * CORS (Cross-Origin Resource Sharing) Middleware
 * Restricts API access to authorized origins
 */

import { NextRequest, NextResponse } from 'next/server';

/**
 * Get allowed origins from environment variable
 */
function getAllowedOrigins(): string[] {
  const envOrigins = process.env.ALLOWED_ORIGINS;
  if (envOrigins) {
    return envOrigins.split(',').map(origin => origin.trim());
  }

  // Default: allow localhost in development
  if (process.env.NODE_ENV === 'development') {
    return ['http://localhost:3000', 'http://127.0.0.1:3000'];
  }

  // Production: no default (must be set)
  return [];
}

/**
 * CORS middleware
 */
export function cors(request: NextRequest): {
  'Access-Control-Allow-Origin'?: string;
  'Access-Control-Allow-Methods'?: string;
  'Access-Control-Allow-Headers'?: string;
  'Access-Control-Allow-Credentials'?: string;
} {
  const allowedOrigins = getAllowedOrigins();
  const origin = request.headers.get('origin');

  // No origin header (same-origin request) - allow
  if (!origin) {
    return {};
  }

  // Check if origin is allowed
  if (allowedOrigins.length > 0 && allowedOrigins.includes(origin)) {
    return {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-CSRF-Token',
      'Access-Control-Allow-Credentials': 'true',
    };
  }

  // Origin not allowed - return empty (will be blocked)
  return {};
}

/**
 * Handle CORS preflight (OPTIONS) request
 */
export function handleCorsPreflight(request: NextRequest): NextResponse | null {
  const corsHeaders = cors(request);
  
  // If no CORS headers, origin not allowed
  if (Object.keys(corsHeaders).length === 0) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'CORS_NOT_ALLOWED',
          message: 'Origin not allowed',
        },
      },
      { status: 403 }
    );
  }

  // Return preflight response
  return NextResponse.json({}, {
    status: 200,
    headers: corsHeaders,
  });
}

