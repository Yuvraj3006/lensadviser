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
    console.log(`[PUT /api/admin/questions/${questionId}] Options data:`, options?.map((opt: any) => ({
      id: opt.id,
      key: opt.key,
      textEn: opt.textEn,
      triggersSubQuestion: opt.triggersSubQuestion,
      subQuestionId: opt.subQuestionId,
      nextQuestionIds: opt.nextQuestionIds,
    })));

    // Fetch all benefits for the organization to map codes to IDs
    const benefits = await prisma.benefit.findMany({
      where: {
        organizationId: user.organizationId,
        isActive: true,
      },
    });
    const benefitMap = new Map(benefits.map((b) => [b.code, b.id]));

    // Get old answer options with their benefit mappings BEFORE deletion
    // We need to preserve mappings by matching option keys, since IDs will change
    const oldOptions = await prisma.answerOption.findMany({
      where: { questionId: questionId },
      include: {
        benefitMappings: {
          include: {
            benefit: {
              select: {
                code: true,
                id: true,
              },
            },
          },
        },
      },
    });
    
    // Create a map of old option key -> benefit mappings for preservation
    const oldMappingsByKey = new Map<string, Array<{ benefitCode: string; benefitId: string; points: number; categoryWeight: number }>>();
    oldOptions.forEach((opt: any) => {
      if (opt.key && opt.benefitMappings && opt.benefitMappings.length > 0) {
        const mappings = opt.benefitMappings.map((bm: any) => ({
          benefitCode: bm.benefit?.code,
          benefitId: bm.benefitId,
          points: bm.points || 0,
          categoryWeight: bm.categoryWeight || 1.0,
        })).filter((m: any) => m.benefitCode); // Only keep mappings with valid benefit codes
        if (mappings.length > 0) {
          oldMappingsByKey.set(opt.key, mappings);
        }
      }
    });

    const oldOptionIds = oldOptions.map((o) => o.id);

    // Delete old benefit mappings (will recreate them below)
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
          // Check if subQuestionId is provided (either directly or via triggersSubQuestion)
          // The condition should allow subQuestionId even if triggersSubQuestion is not explicitly set
          const hasSubQuestionId = opt.subQuestionId && String(opt.subQuestionId).trim() !== '';
          const subQuestionId = hasSubQuestionId 
            ? String(opt.subQuestionId).trim() 
            : null;
          
          // Auto-generate option key if not provided
          const optionKey = opt.key?.trim() || `option_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 9)}`;
          
          // Handle nextQuestionIds array (unlimited nesting support)
          const nextQuestionIds = opt.nextQuestionIds && Array.isArray(opt.nextQuestionIds) 
            ? opt.nextQuestionIds.filter((id: any) => id && String(id).trim() !== '')
            : (subQuestionId ? [subQuestionId] : []); // Fallback to legacy subQuestionId

          // Set triggersSubQuestion to true if subQuestionId exists OR if explicitly set to true
          const triggersSubQuestion = subQuestionId ? true : Boolean(opt.triggersSubQuestion || false);
          
          // Debug logging for subquestion linking
          if (subQuestionId || opt.triggersSubQuestion) {
            console.log(`[PUT /api/admin/questions/${questionId}] Option ${index} subquestion config:`, {
              optionKey,
              subQuestionId,
              triggersSubQuestion,
              nextQuestionIds,
              optSubQuestionId: opt.subQuestionId,
              optTriggersSubQuestion: opt.triggersSubQuestion,
            });
          }

          const optionData = {
            key: optionKey,
            text: opt.text || opt.textEn || null,
            textEn: String(opt.textEn).trim(),
            textHi: opt.textHi?.trim() || null,
            textHiEn: opt.textHiEn?.trim() || null,
            icon: opt.icon?.trim() || null,
            order: Number(index + 1),
            displayOrder: Number(opt.displayOrder || index + 1),
            triggersSubQuestion: triggersSubQuestion,
            subQuestionId: subQuestionId, // Keep for backward compatibility
            nextQuestionIds: nextQuestionIds, // New: array support
          };

          if (subQuestionId) {
            console.log(`[PUT /api/admin/questions/${questionId}] Creating option with subquestion:`, {
              optionKey,
              subQuestionId,
              triggersSubQuestion,
              nextQuestionIds,
            });
          }

          return optionData;
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
        
        if (!answerOption) continue;
        
        // Get category weight for this answer (applies to all benefits)
        const answerCategoryWeight = typeof opt.categoryWeight === 'number' ? opt.categoryWeight : 1.0;
        
        // Determine which benefit mappings to use:
        // 1. If opt.benefitMapping is provided and has entries, use it (explicit update)
        // 2. Otherwise, preserve existing mappings from oldMappingsByKey (by matching option key)
        let benefitMappingsToCreate: Array<{ answerId: string; benefitId: string; points: number; categoryWeight: number }> = [];
        
        if (opt.benefitMapping && Object.keys(opt.benefitMapping).length > 0) {
          // Use new benefitMapping from request
          const mappings = Object.entries(opt.benefitMapping)
            .filter(([_, points]: [string, unknown]) => typeof points === 'number' && points > 0) // Only create mappings with points > 0
            .map(([benefitCode, points]: [string, unknown]) => {
              const pointsValue = typeof points === 'number' ? points : 0;
              const benefitId = benefitMap.get(benefitCode);
              if (!benefitId) {
                console.warn(`[PUT /api/admin/questions] Benefit code ${benefitCode} not found`);
                return null;
              }
              return {
                answerId: answerOption.id,
                benefitId: benefitId,
                points: Math.max(0, Math.min(3, pointsValue)), // Clamp 0-3
                categoryWeight: answerCategoryWeight,
              };
            })
            .filter((mapping) => mapping !== null) as Array<{ answerId: string; benefitId: string; points: number; categoryWeight: number }>;
          
          benefitMappingsToCreate = mappings;
        } else {
          // Preserve existing mappings by matching option key
          const optionKey = opt.key || answerOption.key;
          const preservedMappings = oldMappingsByKey.get(optionKey);
          if (preservedMappings && preservedMappings.length > 0) {
            benefitMappingsToCreate = preservedMappings
              .filter((m) => {
                // Verify benefit still exists and is active
                const benefitId = benefitMap.get(m.benefitCode);
                return benefitId && m.points > 0;
              })
              .map((m) => {
                const benefitId = benefitMap.get(m.benefitCode);
                return {
                  answerId: answerOption.id,
                  benefitId: benefitId!,
                  points: Math.max(0, Math.min(3, m.points)),
                  categoryWeight: m.categoryWeight || answerCategoryWeight,
                };
              });
            
            console.log(`[PUT /api/admin/questions/${questionId}] Preserving ${benefitMappingsToCreate.length} benefit mappings for option key: ${optionKey}`);
          }
        }

        if (benefitMappingsToCreate.length > 0) {
          // MongoDB doesn't support skipDuplicates, so we create individually
          await Promise.all(
            benefitMappingsToCreate.map(mapping =>
              prisma.answerBenefit.upsert({
                where: {
                  answerId_benefitId: {
                    answerId: mapping.answerId,
                    benefitId: mapping.benefitId,
                  },
                },
                update: { 
                  points: mapping.points,
                  categoryWeight: mapping.categoryWeight || 1.0,
                },
                create: mapping,
              })
            )
          );
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

