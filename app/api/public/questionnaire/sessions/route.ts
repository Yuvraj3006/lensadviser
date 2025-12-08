import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleApiError } from '@/lib/errors';
import { z } from 'zod';

// POST /api/public/questionnaire/sessions - Public endpoint for starting sessions
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { storeCode, category, customerName, customerPhone, customerEmail, customerCategory, prescription, frame } = body;

    // Validate required fields
    if (!storeCode || typeof storeCode !== 'string' || !storeCode.trim()) {
      return Response.json(
        {
          success: false,
          error: {
            code: 'MISSING_STORE_CODE',
            message: 'Store code is required',
          },
        },
        { status: 400 }
      );
    }

    if (!category || typeof category !== 'string' || !category.trim()) {
      return Response.json(
        {
          success: false,
          error: {
            code: 'MISSING_CATEGORY',
            message: 'Lens category is required',
          },
        },
        { status: 400 }
      );
    }

    // Verify store code
    const store = await prisma.store.findFirst({
      where: {
        code: storeCode.toUpperCase().trim(),
        isActive: true,
      },
    });

    if (!store) {
      return Response.json(
        {
          success: false,
          error: {
            code: 'INVALID_STORE',
            message: 'Invalid or inactive store code',
          },
        },
        { status: 400 }
      );
    }

    // Get a default user for the store (sales executive or first active user)
    const defaultUser = await prisma.user.findFirst({
      where: {
        storeId: store.id,
        isActive: true,
      },
      orderBy: [
        { role: 'asc' }, // SALES_EXECUTIVE first
        { createdAt: 'asc' },
      ],
    });

    if (!defaultUser) {
      return Response.json(
        {
          success: false,
          error: {
            code: 'NO_USER_FOUND',
            message: 'No active user found for this store',
          },
        },
        { status: 400 }
      );
    }

    // Create prescription if provided
    // NOTE: Prescription model schema is incomplete, so we'll skip creating prescription for now
    // Prescription data will be stored in session notes or handled separately
    let prescriptionId: string | null = null;
    
    // Skip prescription creation until schema is updated
    // The prescription data can be stored in session notes or retrieved from the request later
    if (prescription && (prescription.odSphere !== undefined || prescription.osSphere !== undefined)) {
      console.log('[PublicSessionAPI] Prescription data received but skipping creation due to incomplete schema');
      console.log('[PublicSessionAPI] Prescription data:', JSON.stringify(prescription, null, 2));
      // prescriptionId will remain null
      // Prescription data is available in the request and can be stored elsewhere if needed
    }

    // Create session with error handling
    let session;
    try {
      const now = new Date();
      
      // Prepare session data
      const sessionData: any = {
        storeId: store.id,
        userId: defaultUser.id,
        category,
        customerName: customerName || null,
        customerPhone: customerPhone || null,
        customerEmail: customerEmail || null,
        customerCategory: customerCategory || null,
        status: 'IN_PROGRESS',
        startedAt: now,
        completedAt: now, // Set to current date, will be updated when session completes
      };
      
      // prescriptionId is Json? type in schema, so we need to handle it carefully
      // Since it's Json?, we can pass it as a string (MongoDB ObjectId) or null
      // Prisma will handle the conversion
      if (prescriptionId) {
        sessionData.prescriptionId = prescriptionId;
      } else {
        // Explicitly set to null if no prescription
        sessionData.prescriptionId = null;
      }
      
      console.log('[PublicSessionAPI] Creating session with data:', {
        ...sessionData,
        prescriptionId: prescriptionId || 'null',
      });
      
      session = await prisma.session.create({
        data: sessionData,
      });
      
      console.log('[PublicSessionAPI] Session created successfully:', session.id);
    } catch (sessionError: any) {
      console.error('[PublicSessionAPI] Failed to create session:', sessionError);
      console.error('[PublicSessionAPI] Error code:', sessionError?.code);
      console.error('[PublicSessionAPI] Error message:', sessionError?.message);
      console.error('[PublicSessionAPI] Session data attempted:', {
        storeId: store.id,
        userId: defaultUser.id,
        category,
        customerName,
        customerPhone,
        customerEmail,
        customerCategory,
        prescriptionId: prescriptionId || 'null',
      });
      // Re-throw to be caught by outer catch block
      throw sessionError;
    }

    // Get questions for this category
    const questions = await prisma.question.findMany({
      where: {
        organizationId: store.organizationId,
        category,
        isActive: true,
      },
      include: {
        options: {
          orderBy: {
            order: 'asc',
          },
        },
      },
      orderBy: {
        order: 'asc',
      },
    });

    return Response.json({
      success: true,
      data: {
        sessionId: session.id,
        questions: questions.map((q) => ({
          id: q.id,
          key: q.key,
          textEn: q.textEn,
          textHi: q.textHi,
          textHiEn: q.textHiEn,
          isRequired: q.isRequired,
          allowMultiple: q.allowMultiple,
          options: q.options.map((opt) => ({
            id: opt.id,
            key: opt.key,
            textEn: opt.textEn,
            textHi: opt.textHi,
            textHiEn: opt.textHiEn,
            icon: opt.icon,
          })),
        })),
        totalQuestions: questions.length,
      },
    });
  } catch (error: any) {
    console.error('[PublicSessionAPI] Error creating session:', error);
    console.error('[PublicSessionAPI] Error type:', typeof error);
    console.error('[PublicSessionAPI] Error constructor:', error?.constructor?.name);
    console.error('[PublicSessionAPI] Error stack:', error?.stack);
    
    // Log Prisma-specific errors
    if (error && typeof error === 'object' && 'code' in error) {
      const prismaError = error as { code: string; meta?: unknown; message?: string };
      console.error('[PublicSessionAPI] Prisma error code:', prismaError.code);
      console.error('[PublicSessionAPI] Prisma error message:', prismaError.message);
      console.error('[PublicSessionAPI] Prisma error meta:', JSON.stringify(prismaError.meta, null, 2));
    }
    
    if (error instanceof z.ZodError) {
      return Response.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Validation failed',
            details: error.issues,
          },
        },
        { status: 400 }
      );
    }
    
    // Ensure we always return a proper error response
    try {
      const errorResponse = handleApiError(error);
      
      // Log what handleApiError is returning (for debugging)
      console.log('[PublicSessionAPI] handleApiError returned response');
      
      return errorResponse;
    } catch (handleError: any) {
      // Fallback if handleApiError itself fails
      console.error('[PublicSessionAPI] handleApiError failed:', handleError);
      console.error('[PublicSessionAPI] Original error:', error);
      
      // Extract error message safely
      let errorMessage = 'An unexpected error occurred';
      let errorCode = 'INTERNAL_ERROR';
      
      if (error instanceof Error) {
        errorMessage = error.message || errorMessage;
        errorCode = error.name || errorCode;
      } else if (typeof error === 'string') {
        errorMessage = error;
      } else if (error && typeof error === 'object') {
        if ('message' in error && typeof error.message === 'string') {
          errorMessage = error.message;
        }
        if ('code' in error && typeof error.code === 'string') {
          errorCode = error.code;
        }
      }
      
      // Always return a properly structured error response
      return Response.json(
        {
          success: false,
          error: {
            code: errorCode,
            message: errorMessage,
            ...(process.env.NODE_ENV === 'development' && {
              details: {
                originalError: String(error),
                originalErrorType: typeof error,
                handleError: String(handleError),
                stack: error?.stack,
              },
            }),
          },
        },
        { status: 500 }
      );
    }
  }
}

