import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleApiError } from '@/lib/errors';
import { z } from 'zod';

const CustomerDetailsSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  phone: z.string().min(10, 'Phone must be at least 10 digits').max(15),
  email: z.string().email().optional(),
  storeId: z.string().min(1, 'Store ID is required'),
  storeCode: z.string().min(1, 'Store code is required'),
});


/**
 * POST /api/customer-details
 * Create a temporary customer details session
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = CustomerDetailsSchema.parse(body);

    // Create a temporary customer details session
    const customerSession = await prisma.customerDetailSession.create({
      data: {
        storeId: validatedData.storeId,
        storeCode: validatedData.storeCode,
        customerName: validatedData.name,
        customerPhone: validatedData.phone,
        customerEmail: validatedData.email || null,
        status: 'ACTIVE',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      },
    });

    return Response.json({
      success: true,
      data: {
        sessionId: customerSession.id,
        message: 'Customer details saved successfully',
      },
    });

  } catch (error) {
    console.error('[CustomerDetails API] Error:', error);
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
