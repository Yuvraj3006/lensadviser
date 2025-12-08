import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticate, authorize } from '@/middleware/auth.middleware';
import { handleApiError } from '@/lib/errors';
import { UserRole } from '@/lib/constants';

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
          include: {
            benefitMappings: {
              include: {
                benefit: {
                  select: {
                    code: true,
                    name: true,
                  },
                },
              },
            },
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

    // Transform options to include benefitMapping object
    const transformedQuestion = {
      ...question,
      options: question.options.map((option) => {
        const benefitMapping: Record<string, number> = {};
        option.benefitMappings.forEach((bm) => {
          benefitMapping[bm.benefit.code] = bm.points;
        });
        return {
          ...option,
          benefitMapping,
          triggersSubQuestion: option.triggersSubQuestion || false,
          subQuestionId: option.subQuestionId || null,
        };
      }),
    };

    return Response.json({
      success: true,
      data: transformedQuestion,
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

    // Fetch all benefits for the organization to map codes to IDs
    const benefits = await prisma.benefit.findMany({
      where: {
        organizationId: user.organizationId,
        isActive: true,
      },
    });
    const benefitMap = new Map(benefits.map((b) => [b.code, b.id]));

    // Get old answer option IDs before deletion
    const oldOptions = await prisma.answerOption.findMany({
      where: { questionId: questionId },
      select: { id: true },
    });
    const oldOptionIds = oldOptions.map((o) => o.id);

    // Delete old benefit mappings
    if (oldOptionIds.length > 0) {
      await prisma.answerBenefit.deleteMany({
        where: { answerId: { in: oldOptionIds } },
      });
    }

    // Delete existing options and create new ones
    await prisma.answerOption.deleteMany({
      where: { questionId: questionId },
    });

    // Build update data
    const updateData: any = {
      key: String(questionData.key).trim(),
      text: questionData.text || questionData.textEn || null,
      textEn: String(questionData.textEn).trim(),
      textHi: questionData.textHi?.trim() || null,
      textHiEn: questionData.textHiEn?.trim() || null,
      category: String(questionData.category),
      order: Number(questionData.order) || 0,
      displayOrder: Number(questionData.displayOrder || questionData.order) || 0,
      isRequired: Boolean(questionData.isRequired ?? true),
      allowMultiple: Boolean(questionData.allowMultiple ?? false),
      isActive: Boolean(questionData.isActive ?? true),
      options: {
        create: (options || []).map((opt: any, index: number) => {
          const subQuestionId = (opt.triggersSubQuestion && opt.subQuestionId && String(opt.subQuestionId).trim() !== '') 
            ? String(opt.subQuestionId).trim() 
            : null;
          
          return {
            key: String(opt.key).trim(),
            text: opt.text || opt.textEn || null,
            textEn: String(opt.textEn).trim(),
            textHi: opt.textHi?.trim() || null,
            textHiEn: opt.textHiEn?.trim() || null,
            icon: opt.icon?.trim() || null,
            order: Number(index + 1),
            displayOrder: Number(opt.displayOrder || index + 1),
            triggersSubQuestion: Boolean(opt.triggersSubQuestion || false),
            subQuestionId: subQuestionId,
          };
        }),
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

    // Create benefit mappings for each answer option
    if (options && Array.isArray(options)) {
      for (let i = 0; i < options.length; i++) {
        const opt = options[i];
        const answerOption = question.options[i];
        
        if (opt.benefitMapping && answerOption) {
          // Create AnswerBenefit records for each benefit with points > 0
          const benefitMappings = Object.entries(opt.benefitMapping)
            .filter(([_, points]) => points > 0) // Only create mappings with points > 0
            .map(([benefitCode, points]) => {
              const benefitId = benefitMap.get(benefitCode);
              if (!benefitId) {
                console.warn(`[PUT /api/admin/questions] Benefit code ${benefitCode} not found`);
                return null;
              }
              return {
                answerId: answerOption.id,
                benefitId: benefitId,
                points: typeof points === 'number' ? points : 1, // Store points from benefitMapping
                points: typeof points === 'number' ? Math.max(0, Math.min(3, points)) : 0, // Clamp 0-3
              };
            })
            .filter((mapping) => mapping !== null);

          if (benefitMappings.length > 0) {
            await prisma.answerBenefit.createMany({
              data: benefitMappings,
              skipDuplicates: true,
            });
          }
        }
      }
    }

    console.log(`[PUT /api/admin/questions/${questionId}] Updated successfully`);
    return Response.json({
      success: true,
      data: question,
    });
  } catch (error: any) {
    const errorDetails = {
      message: error?.message,
      code: error?.code,
      meta: error?.meta,
      stack: error?.stack,
      body: body ? JSON.stringify(body, null, 2) : null,
      errorType: error?.constructor?.name,
      name: error?.name,
    };
    
    console.error('[PUT /api/admin/questions] Update error:', errorDetails);
    
    // Check for Prisma foreign key constraint errors
    if (error?.code === 'P2003') {
      return Response.json(
        {
          success: false,
          error: {
            code: 'FOREIGN_KEY_ERROR',
            message: `Invalid reference: ${error?.meta?.field_name || 'unknown field'}. Please ensure all referenced questions exist.`,
            details: error?.meta,
          },
        },
        { status: 400 }
      );
    }
    
    // Check for Prisma unique constraint errors
    if (error?.code === 'P2002') {
      return Response.json(
        {
          success: false,
          error: {
            code: 'DUPLICATE_ERROR',
            message: `A question with this key already exists for your organization.`,
            details: error?.meta,
          },
        },
        { status: 400 }
      );
    }
    
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

