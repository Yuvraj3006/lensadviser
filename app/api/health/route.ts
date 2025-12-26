import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/health
 * Comprehensive health check endpoint for load balancers and monitoring
 * Returns 200 if healthy, 503 if unhealthy
 */
export async function GET(request: NextRequest) {
  const health = {
    status: 'ok' as 'ok' | 'error',
    timestamp: new Date().toISOString(),
    checks: {} as Record<string, 'ok' | 'error' | { status: 'ok' | 'error'; message?: string }>,
  };

  // Check database connectivity
  try {
    await prisma.$queryRaw`SELECT 1`;
    health.checks.database = 'ok';
  } catch (error: any) {
    health.checks.database = {
      status: 'error',
      message: error.message || 'Database connection failed',
    };
    health.status = 'error';
  }

  // Check environment variables
  const requiredEnvVars = ['DATABASE_URL', 'JWT_SECRET'];
  const missingEnvVars: string[] = [];
  
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      missingEnvVars.push(envVar);
    }
  }

  if (missingEnvVars.length > 0) {
    health.checks.environment = {
      status: 'error',
      message: `Missing required environment variables: ${missingEnvVars.join(', ')}`,
    };
    health.status = 'error';
  } else {
    health.checks.environment = 'ok';
  }

  // Check JWT_SECRET strength
  const jwtSecret = process.env.JWT_SECRET;
  if (jwtSecret && (jwtSecret.length < 32 || jwtSecret === 'your-secret-key-change-this')) {
    health.checks.jwtSecret = {
      status: 'error',
      message: 'JWT_SECRET is too weak or using default value',
    };
    health.status = 'error';
  } else if (jwtSecret) {
    health.checks.jwtSecret = 'ok';
  }

  // Return appropriate status code
  const statusCode = health.status === 'ok' ? 200 : 503;
  
  return Response.json(health, { status: statusCode });
}

