import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleApiError } from '@/lib/errors';
import { z } from 'zod';

// POST /api/public/questionnaire/sessions - Public endpoint for starting sessions
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      storeCode,
      category,
      customerName,
      customerPhone,
      customerEmail,
      customerCategory,
      prescription,
      frame,
      parentSessionId: parentSessionIdRaw,
      bogoParentFirstPairProductId: bogoParentFirstPairProductIdRaw,
    } = body;

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

    const isBogoSecondPersonChild =
      typeof parentSessionIdRaw === 'string' && parentSessionIdRaw.trim().length > 0;

    // REQUIRED: prescription — except BOGO 2nd-person sub-session (captured in child flow, starts with 0/0)
    if (!isBogoSecondPersonChild) {
      const hasPrescription =
        prescription &&
        ((prescription.odSphere !== undefined && prescription.odSphere !== null) ||
          (prescription.osSphere !== undefined && prescription.osSphere !== null));

      if (!hasPrescription) {
        return Response.json(
          {
            success: false,
            error: {
              code: 'MISSING_PRESCRIPTION',
              message: 'Prescription is required. Please enter at least one eye power (SPH).',
            },
          },
          { status: 400 }
        );
      }
    }

    // Create prescription if provided
    // NOTE: Prescription model schema is incomplete, so we'll skip creating prescription for now
    let prescriptionId: string | null = null;

    const prescriptionForNotes = isBogoSecondPersonChild
      ? (prescription || { odSphere: 0, osSphere: 0, odCylinder: 0, osCylinder: 0 })
      : prescription;

    if (
      prescriptionForNotes &&
      (prescriptionForNotes.odSphere !== undefined || prescriptionForNotes.osSphere !== undefined)
    ) {
      console.log('[PublicSessionAPI] Prescription in session notes (no separate prescription row).');
    }

    let bogoParent: {
      id: string;
      storeId: string;
      purchaseContext: string | null;
      selectedComboCode: string | null;
      comboVersionUsed: number | null;
    } | null = null;
    if (isBogoSecondPersonChild) {
      const pid = String(parentSessionIdRaw).trim();
      const parent = await prisma.session.findUnique({
        where: { id: pid },
        select: {
          id: true,
          storeId: true,
          purchaseContext: true,
          selectedComboCode: true,
          comboVersionUsed: true,
        },
      });
      if (!parent) {
        return Response.json(
          {
            success: false,
            error: { code: 'PARENT_NOT_FOUND', message: 'Parent session not found' },
          },
          { status: 404 }
        );
      }
      if (parent.storeId !== store.id) {
        return Response.json(
          {
            success: false,
            error: { code: 'STORE_MISMATCH', message: 'Store does not match the parent session' },
          },
          { status: 400 }
        );
      }
      bogoParent = parent;
    }

    // Create session with error handling
    let session;
    try {
      const now = new Date();
      
    // Prepare session data
    // Store frame data in customerEmail field as JSON (since Session model doesn't have notes field)
    // For "Only Lens" flow, frame will be null/undefined
    const sessionNotes: any = {};
    if (frame && frame.brand && frame.mrp > 0) {
      sessionNotes.frame = {
        brand: frame.brand,
        subCategory: frame.subCategory || null,
        mrp: frame.mrp,
        frameType: frame.frameType || null,
      };
    }
    if (prescriptionForNotes) {
      sessionNotes.prescription = prescriptionForNotes;
    }

    const bogoLink =
      bogoParent && isBogoSecondPersonChild
        ? {
            parentSessionId: bogoParent.id,
            bogoParentFirstPairProductId:
              typeof bogoParentFirstPairProductIdRaw === 'string' && bogoParentFirstPairProductIdRaw.trim()
                ? bogoParentFirstPairProductIdRaw.trim()
                : null,
            purchaseContext: bogoParent.purchaseContext,
            selectedComboCode: bogoParent.selectedComboCode,
            comboVersionUsed: bogoParent.comboVersionUsed,
          }
        : null;
    
    const sessionData: any = {
      storeId: store.id,
      userId: defaultUser.id,
      category,
      customerName: customerName || 'Guest', // Required field - use default if not provided
      customerPhone: customerPhone || '0000000000', // Required field - use default if not provided
      customerEmail: Object.keys(sessionNotes).length > 0 ? sessionNotes : null, // Store frame/prescription data here
      customerCategory: customerCategory || null,
      status: 'IN_PROGRESS',
      startedAt: now,
      completedAt: now, // Set to current date, will be updated when session completes
      ...(bogoLink
        ? {
            parentSessionId: bogoLink.parentSessionId,
            bogoParentFirstPairProductId: bogoLink.bogoParentFirstPairProductId,
            purchaseContext: bogoLink.purchaseContext,
            selectedComboCode: bogoLink.selectedComboCode,
            comboVersionUsed: bogoLink.comboVersionUsed,
          }
        : {}),
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

