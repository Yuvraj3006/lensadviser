import { NextRequest } from 'next/server';
import { handleApiError } from '@/lib/errors';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/questionnaire/questions
 * Get questions for questionnaire (matches spec)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get('category') || 'EYEGLASSES';
    const organizationId = searchParams.get('organizationId');

    if (!organizationId) {
      return Response.json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'organizationId is required' },
      }, { status: 400 });
    }

    const questions = await prisma.question.findMany({
      where: {
        organizationId,
        category: category as any,
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
      data: questions.map((q) => ({
        id: q.id,
        code: q.code || q.key,
        key: q.key,
        text: q.text || q.textEn,
        textEn: q.textEn,
        textHi: q.textHi,
        textHiEn: q.textHiEn,
        category: q.category,
        questionCategory: q.questionCategory,
        questionType: q.questionType || (q.allowMultiple ? 'MULTI_SELECT' : 'SINGLE_SELECT'),
        displayOrder: q.displayOrder || q.order,
        order: q.order,
        isRequired: q.isRequired,
        allowMultiple: q.allowMultiple,
        parentAnswerId: q.parentAnswerId,
        options: q.options.map((opt) => ({
          id: opt.id,
          key: opt.key,
          text: opt.text || opt.textEn,
          textEn: opt.textEn,
          textHi: opt.textHi,
          textHiEn: opt.textHiEn,
          icon: opt.icon,
          displayOrder: opt.displayOrder || opt.order,
          order: opt.order,
        })),
      })),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

