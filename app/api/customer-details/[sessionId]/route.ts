import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleApiError } from '@/lib/errors';

/**
 * GET /api/customer-details/[sessionId]
 * Retrieve customer details by session ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;

    const customerSession = await prisma.customerDetailSession.findUnique({
      where: {
        id: sessionId,
        status: 'ACTIVE',
        expiresAt: {
          gt: new Date(), // Not expired
        },
      },
      select: {
        id: true,
        customerName: true,
        customerPhone: true,
        customerEmail: true,
        storeCode: true,
        createdAt: true,
      },
    });

    if (!customerSession) {
      return Response.json(
        { success: false, error: { code: 'SESSION_NOT_FOUND', message: 'Customer details session not found or expired' } },
        { status: 404 }
      );
    }

    return Response.json({
      success: true,
      data: {
        customerDetails: {
          name: customerSession.customerName,
          phone: customerSession.customerPhone,
          email: customerSession.customerEmail,
        }
      }
    });

  } catch (error) {
    console.error('[CustomerDetails API] Error:', error);
    return handleApiError(error);
  }
}
