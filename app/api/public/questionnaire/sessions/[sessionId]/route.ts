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

    // Get all questions to find sub-questions
    const allQuestionsMap = new Map(questions.map(q => [q.id, q]));

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
            triggersSubQuestion: opt.triggersSubQuestion || false,
            subQuestionId: opt.subQuestionId || null,
          })),
        })),
        // Include all questions map for sub-question lookup
        allQuestions: questions.map((q) => ({
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
            triggersSubQuestion: opt.triggersSubQuestion || false,
            subQuestionId: opt.subQuestionId || null,
          })),
        })),
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

// PATCH /api/public/questionnaire/sessions/[sessionId] - Update session (purchase context, etc.)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const body = await request.json();

    // Verify session exists
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

    // Update session fields
    const updateData: any = {};
    if (body.purchaseContext) {
      updateData.purchaseContext = body.purchaseContext;
    }
    if (body.selectedComboCode !== undefined) {
      updateData.selectedComboCode = body.selectedComboCode;
      
      // Fetch and store combo version when tier is selected
      if (body.selectedComboCode) {
        const comboTier = await prisma.comboTier.findUnique({
          where: { comboCode: body.selectedComboCode },
          select: { comboVersion: true },
        });
        if (comboTier) {
          updateData.comboVersionUsed = comboTier.comboVersion;
        }
      }
    }
    if (body.comboVersionUsed !== undefined) {
      updateData.comboVersionUsed = body.comboVersionUsed;
    }
    // Update customerCategory (for category discounts)
    if (body.customerCategory !== undefined) {
      updateData.customerCategory = body.customerCategory || null;
    }
    // Update secondPairData (for BOGO offers)
    if (body.secondPairData !== undefined) {
      updateData.secondPairData = body.secondPairData || null;
    }

    const updated = await prisma.session.update({
      where: { id: sessionId },
      data: updateData,
    });

    return Response.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

