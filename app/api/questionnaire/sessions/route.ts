import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticate } from '@/middleware/auth.middleware';
import { handleApiError } from '@/lib/errors';
import { CreateSessionSchema } from '@/lib/validation';
import { z } from 'zod';

// POST /api/questionnaire/sessions - Start new session
export async function POST(request: NextRequest) {
  try {
    const user = await authenticate(request);
    
    const body = await request.json();
    const validatedData = CreateSessionSchema.parse(body);

    // Get user's store or use first available store
    let storeId = user.storeId;
    if (!storeId) {
      const firstStore = await prisma.store.findFirst({
        where: { organizationId: user.organizationId, isActive: true },
      });
      storeId = firstStore?.id || null;
    }

    if (!storeId) {
      return Response.json(
        {
          success: false,
          error: {
            code: 'NO_STORE_FOUND',
            message: 'No active store found for your organization',
          },
        },
        { status: 400 }
      );
    }

    // Create session
    const now = new Date();
    const session = await prisma.session.create({
      data: {
        storeId,
        userId: user.userId,
        category: validatedData.category,
        customerName: validatedData.customerName || '',
        customerPhone: validatedData.customerPhone || '',
        customerEmail: validatedData.customerEmail ? { email: validatedData.customerEmail } : null,
        status: 'IN_PROGRESS',
        startedAt: now,
        completedAt: now, // Set to current date, will be updated when session completes
      },
    });

    // Get questions for this category
    const questions = await prisma.question.findMany({
      where: {
        organizationId: user.organizationId,
        category: validatedData.category,
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
  } catch (error) {
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
    return handleApiError(error);
  }
}

