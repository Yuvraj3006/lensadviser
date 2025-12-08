import { NextRequest } from 'next/server';
import { prisma, ensureConnection } from '@/lib/prisma';
import { handleApiError } from '@/lib/errors';

// GET /api/public/verify-store?code=STORE-CODE
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');

    if (!code) {
      return Response.json(
        {
          success: false,
          error: {
            code: 'MISSING_CODE',
            message: 'Store code is required',
          },
        },
        { status: 400 }
      );
    }

    // Ensure connection is established with retry
    try {
      await ensureConnection();
    } catch (connectionError: any) {
      return Response.json(
        {
          success: false,
          error: {
            code: 'DATABASE_CONNECTION_ERROR',
            message: 'Unable to connect to database. Please check MongoDB Atlas cluster status.',
            details: connectionError?.message || 'The database server is not reachable. Please ensure: 1) Cluster is running, 2) IP is whitelisted, 3) Network is accessible.',
          },
        },
        { status: 503 }
      );
    }

    const store = await prisma.store.findFirst({
      where: {
        code: code.toUpperCase(),
        isActive: true,
      },
      select: {
        id: true,
        code: true,
        name: true,
        city: true,
        state: true,
        organizationId: true,
      },
    });

    if (!store) {
      return Response.json(
        {
          success: false,
          error: {
            code: 'INVALID_CODE',
            message: 'Invalid or inactive store code',
          },
        },
        { status: 404 }
      );
    }

    return Response.json({
      success: true,
      data: store,
    });
  } catch (error) {
    console.error('Verify Store API Error:', error);
    if (error instanceof Error) {
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack?.substring(0, 500),
      });
    }
    return handleApiError(error);
  }
}

