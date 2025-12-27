/**
 * Rate Limiting Middleware
 * Prevents brute force and DDoS attacks
 */

import { NextRequest, NextResponse } from 'next/server';

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

// In-memory store (for production, use Redis)
const rateLimitMap = new Map<string, RateLimitRecord>();

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitMap.entries()) {
    if (now > record.resetTime) {
      rateLimitMap.delete(key);
    }
  }
}, 5 * 60 * 1000);

/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  message?: string;
}

/**
 * Default rate limit configurations
 * Reasonable limits for both dev and prod
 */
export const RATE_LIMITS = {
  LOGIN: {
    maxRequests: 10, // 10 attempts per window
    windowMs: 5 * 60 * 1000, // 5 minutes
    message: 'Too many login attempts. Please wait 5 minutes before trying again.'
  },
  PUBLIC_API: {
    maxRequests: 200, // 200 requests per minute
    windowMs: 60 * 1000,
    message: 'Too many requests. Please slow down.'
  },
  ADMIN_API: {
    maxRequests: 1000, // 1000 requests per minute
    windowMs: 60 * 1000,
    message: 'Rate limit exceeded. Please try again later.'
  },
  DEFAULT: {
    maxRequests: 200, // 200 requests per minute
    windowMs: 60 * 1000,
    message: 'Too many requests. Please try again later.'
  },
} as const;

/**
 * Get client IP address
 */
function getClientIP(request: NextRequest): string {
  // Check various headers for IP (for proxies/load balancers)
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  const realIP = request.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }

  // For development/localhost
  const host = request.headers.get('host');
  if (host && (host.includes('localhost') || host.includes('127.0.0.1'))) {
    return '127.0.0.1';
  }
  
  // Fallback (NextRequest doesn't have direct IP access)
  return 'unknown';
}

/**
 * Rate limit middleware
 */
export function rateLimit(config: RateLimitConfig = RATE_LIMITS.DEFAULT) {
  return (request: NextRequest): NextResponse | null => {
    // Completely disable rate limiting if environment variable is set
    if (process.env.DISABLE_RATE_LIMITING === 'true') {
      return null; // Allow request without rate limiting
    }

    const ip = getClientIP(request);
    const now = Date.now();

    // Skip rate limiting in development for localhost
    if (process.env.NODE_ENV === 'development' && (ip === '127.0.0.1' || ip === '::1' || ip === 'localhost')) {
      return null; // Allow request without rate limiting
    }

    const record = rateLimitMap.get(ip);

    // No record or window expired - create new record
    if (!record || now > record.resetTime) {
      rateLimitMap.set(ip, {
        count: 1,
        resetTime: now + config.windowMs,
      });
      return null; // Allow request
    }

    // Check if limit exceeded
    if (record.count >= config.maxRequests) {
      const retryAfter = Math.ceil((record.resetTime - now) / 1000);
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: config.message || 'Too many requests, please try again later',
            retryAfter,
          },
        },
        {
          status: 429,
          headers: {
            'Retry-After': retryAfter.toString(),
            'X-RateLimit-Limit': config.maxRequests.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(record.resetTime).toISOString(),
          },
        }
      );
    }

    // Increment count
    record.count++;
    return null; // Allow request
  };
}

/**
 * Get rate limit info for debugging
 */
export function getRateLimitInfo(ip: string): {
  count: number;
  remaining: number;
  resetTime: number;
} | null {
  const record = rateLimitMap.get(ip);
  if (!record) return null;

  return {
    count: record.count,
    remaining: Math.max(0, RATE_LIMITS.DEFAULT.maxRequests - record.count),
    resetTime: record.resetTime,
  };
}

/**
 * Clear rate limits for an IP (useful for development/testing)
 */
export function clearRateLimit(ip: string): boolean {
  return rateLimitMap.delete(ip);
}

/**
 * Clear all rate limits (useful for development/testing)
 */
export function clearAllRateLimits(): void {
  rateLimitMap.clear();
}

