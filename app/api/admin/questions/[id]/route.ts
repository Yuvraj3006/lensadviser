import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticate, authorize } from '@/middleware/auth.middleware';
import { handleApiError } from '@/lib/errors';
import { UserRole } from '@prisma/client';

// GET /api/admin/questions/[id] - Get single question with full details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const user = await authenticate(request);
    authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN)(user);

    // Handle both Promise and direct params (Next.js 15+ uses Promise)
    const resolvedParams = params instanceof Promise ? await params : params;
    const questionId = resolvedParams.id;

    const question = await prisma.question.findFirst({
      where: {
        id: questionId,
        organizationId: user.organizationId,
      },
      include: {
        options: {
          orderBy: {
            order: 'asc',
          },
        },
      },
    });

    if (!question) {
      return Response.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Question not found',
          },
        },
        { status: 404 }
      );
    }

    return Response.json({
      success: true,
      data: question,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

// PUT /api/admin/questions/[id] - Update question and options
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  let body: any = null;
  try {
    const user = await authenticate(request);
    authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN)(user);

    // Handle both Promise and direct params (Next.js 15+ uses Promise)
    const resolvedParams = params instanceof Promise ? await params : params;
    const questionId = resolvedParams.id;

    if (!questionId) {
      return Response.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Question ID is required',
          },
        },
        { status: 400 }
      );
    }

    body = await request.json();
    const { options, ...questionData } = body;

    console.log(`[PUT /api/admin/questions/${questionId}] Updating question with ${options?.length || 0} options`);

    // Delete existing options and create new ones
    await prisma.answerOption.deleteMany({
      where: { questionId: questionId },
    });

    // Build update data
    const updateData: any = {
      key: questionData.key,
      text: questionData.text || questionData.textEn,
      textEn: questionData.textEn,
      textHi: questionData.textHi || null,
      textHiEn: questionData.textHiEn || null,
      category: questionData.category,
      order: questionData.order || 0,
      displayOrder: questionData.displayOrder || questionData.order || 0,
      isRequired: questionData.isRequired ?? true,
      allowMultiple: questionData.allowMultiple ?? false,
      isActive: questionData.isActive ?? true,
      options: {
        create: (options || []).map((opt: any, index: number) => ({
          key: opt.key,
          text: opt.text || opt.textEn,
          textEn: opt.textEn,
          textHi: opt.textHi || null,
          textHiEn: opt.textHiEn || null,
          icon: opt.icon || null,
          order: index + 1,
          displayOrder: opt.displayOrder || index + 1,
        })),
      },
    };

    // Handle parentAnswerId if provided (for drag-drop functionality)
    if (questionData.parentAnswerId !== undefined) {
      updateData.parentAnswerId = questionData.parentAnswerId || null;
    }

    const question = await prisma.question.update({
      where: { id: questionId },
      data: updateData,
      include: {
        options: true,
      },
    });

    console.log(`[PUT /api/admin/questions/${questionId}] Updated successfully`);
    return Response.json({
      success: true,
      data: question,
    });
  } catch (error: any) {
    console.error('[PUT /api/admin/questions] Update error:', {
      message: error?.message,
      code: error?.code,
      meta: error?.meta,
      body: body,
    });
    return handleApiError(error);
  }
}

// DELETE /api/admin/questions/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const user = await authenticate(request);
    authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN)(user);

    // Handle both Promise and direct params (Next.js 15+ uses Promise)
    const resolvedParams = params instanceof Promise ? await params : params;
    const questionId = resolvedParams.id;

    // Delete options first (cascade should handle this, but being explicit)
    await prisma.answerOption.deleteMany({
      where: { questionId: questionId },
    });

    // Delete question
    await prisma.question.delete({
      where: { id: questionId },
    });

    return Response.json({
      success: true,
      data: { deleted: true },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

