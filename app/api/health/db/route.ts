import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/health/db - Database health check
export async function GET(request: NextRequest) {
  try {
    // Test connection with a simple query
    const storeCount = await prisma.store.count();
    
    return Response.json({
      success: true,
      data: {
        connected: true,
        queryTest: 'passed',
        storeCount,
        message: 'Database connection is healthy',
      },
    });
  } catch (error: any) {
    return Response.json(
      {
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: error.message || 'Database connection failed',
          details: {
            code: error.code,
            name: error.name,
            hint: error.message?.includes('timeout') 
              ? 'MongoDB Atlas cluster might be paused or IP not whitelisted'
              : 'Check database connection settings',
          },
        },
      },
      { status: 503 }
    );
  }
}

