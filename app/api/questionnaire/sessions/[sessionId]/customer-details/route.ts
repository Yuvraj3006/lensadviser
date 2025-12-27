import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleApiError } from '@/lib/errors';
import { z } from 'zod';

const CustomerDetailsSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  phone: z.string().min(10, 'Phone must be at least 10 digits').max(15),
  email: z.string().email().optional(),
  category: z.string().optional(),
});

/**
 * POST /api/questionnaire/sessions/[sessionId]/customer-details
 * Store customer details in the database session
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;

    // Check if session exists
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      select: { id: true, status: true },
    });

    if (!session) {
      return Response.json(
        { success: false, error: { code: 'SESSION_NOT_FOUND', message: 'Session not found' } },
        { status: 404 }
      );
    }

    // Parse and validate customer details
    const body = await request.json();
    const customerDetails = CustomerDetailsSchema.parse(body);

    // Update session with customer details
    const updatedSession = await prisma.session.update({
      where: { id: sessionId },
      data: {
        customerName: customerDetails.name,
        customerPhone: customerDetails.phone,
        customerEmail: customerDetails.email || null,
        customerCategory: customerDetails.category || null,
      },
      select: {
        id: true,
        customerName: true,
        customerPhone: true,
        customerEmail: true,
        customerCategory: true,
      },
    });

    return Response.json({
      success: true,
      data: {
        session: updatedSession,
        message: 'Customer details saved successfully'
      }
    });

  } catch (error) {
    console.error('[CustomerDetails] Error:', error);
    if (error instanceof z.ZodError) {
      return Response.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid customer details',
            details: error.issues,
          },
        },
        { status: 400 }
      );
    }
    return handleApiError(error);
  }
}

/**
 * GET /api/questionnaire/sessions/[sessionId]/customer-details
 * Retrieve customer details from the database session
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;

    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      select: {
        id: true,
        customerName: true,
        customerPhone: true,
        customerEmail: true,
        customerCategory: true,
      },
    });

    if (!session) {
      return Response.json(
        { success: false, error: { code: 'SESSION_NOT_FOUND', message: 'Session not found' } },
        { status: 404 }
      );
    }

    return Response.json({
      success: true,
      data: {
        customerDetails: {
          name: session.customerName,
          phone: session.customerPhone,
          email: session.customerEmail,
          category: session.customerCategory,
        }
      }
    });

  } catch (error) {
    console.error('[CustomerDetails] Error:', error);
    return handleApiError(error);
  }
}
