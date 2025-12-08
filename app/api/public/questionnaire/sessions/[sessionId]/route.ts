import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleApiError } from '@/lib/errors';

// GET /api/public/questionnaire/sessions/[sessionId] - Get session with questions
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      return Response.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Session not found',
          },
        },
        { status: 404 }
      );
    }

    // Get store to find organization
    const store = await prisma.store.findUnique({
      where: { id: session.storeId },
    });

    if (!store) {
      return Response.json(
        {
          success: false,
          error: {
            code: 'STORE_NOT_FOUND',
            message: 'Store not found',
          },
        },
        { status: 404 }
      );
    }

    // Get questions for category
    const questions = await prisma.question.findMany({
      where: {
        organizationId: store.organizationId,
        category: session.category,
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
        session,
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
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

