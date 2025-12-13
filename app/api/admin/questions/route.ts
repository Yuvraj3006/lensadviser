import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticate, authorize } from '@/middleware/auth.middleware';
import { handleApiError } from '@/lib/errors';
import { UserRole } from '@/lib/constants';
import { z } from 'zod';

// GET /api/admin/questions - List all questions
export async function GET(request: NextRequest) {
  try {
    const user = await authenticate(request);

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');

    const where: any = {
      organizationId: user.organizationId,
    };

    if (category) {
      where.category = category;
    }

    // Fetch questions - handle null createdAt gracefully
    let questions: any[] = [];
    try {
      questions = await prisma.question.findMany({
        where,
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
    } catch (error: any) {
      // If error is due to null createdAt, filter them out using select
      if (error?.code === 'P2032' || error?.message?.includes('createdAt')) {
        console.log('Handling null createdAt - fetching with select...');
        // Use select to exclude createdAt, then fetch options separately
        const questionData = await prisma.question.findMany({
          where,
          select: {
            id: true,
            key: true,
            textEn: true,
            textHi: true,
            textHiEn: true,
            category: true,
            order: true,
            displayOrder: true,
            isRequired: true,
            allowMultiple: true,
            isActive: true,
            parentAnswerId: true,
            questionCategory: true,
            questionType: true,
            code: true,
            text: true,
            organizationId: true,
            updatedAt: true,
          },
          orderBy: {
            order: 'asc',
          },
        });
        
        // Fetch options separately using select to avoid createdAt issue
        const questionIds = questionData.map((q: any) => q.id);
        let allOptions: any[] = [];
        if (questionIds.length > 0) {
          try {
            allOptions = await prisma.answerOption.findMany({
              where: {
                questionId: { in: questionIds },
              },
              select: {
                id: true,
                key: true,
                textEn: true,
                textHi: true,
                textHiEn: true,
                icon: true,
                order: true,
                displayOrder: true,
                questionId: true,
                triggersSubQuestion: true,
                subQuestionId: true,
                updatedAt: true,
              },
              orderBy: {
                order: 'asc',
              },
            });
            // Add createdAt with default
            allOptions = allOptions.map((opt: any) => ({
              ...opt,
              createdAt: new Date(),
            }));
          } catch (optError: any) {
            console.error('Failed to fetch options:', optError);
            allOptions = [];
          }
        }
        
        // Group options by questionId
        const optionsMap: any = {};
        allOptions.forEach((opt: any) => {
          const qId = opt.questionId.toString();
          if (!optionsMap[qId]) optionsMap[qId] = [];
          optionsMap[qId].push(opt);
        });
        
        // Combine questions with options
        questions = questionData.map((q: any) => ({
          ...q,
          createdAt: new Date(), // Default value
          options: optionsMap[q.id] || [],
        }));
      } else {
        throw error;
      }
    }

    // Fetch benefit mappings for all options
    // Ensure all option IDs are converted to strings consistently
    const allOptionIds = questions.flatMap((q: any) => 
      (q.options || []).map((opt: any) => {
        const id = opt.id || opt._id;
        return id ? id.toString() : null;
      }).filter((id: string | null) => id !== null)
    );
    
    console.log(`[GET /api/admin/questions] Fetching benefit mappings for ${allOptionIds.length} options`);
    if (allOptionIds.length > 0 && allOptionIds.length <= 10) {
      console.log(`[GET /api/admin/questions] Sample option IDs:`, allOptionIds.slice(0, 5));
    }
    
    // First, check if there are ANY AnswerBenefit records in the database at all
    const totalAnswerBenefits = await prisma.answerBenefit.count({});
    console.log(`[GET /api/admin/questions] DEBUG: Total AnswerBenefit records in database: ${totalAnswerBenefits}`);
    
    // Get sample AnswerBenefit records to see what answerIds exist
    if (totalAnswerBenefits > 0) {
      const sampleBenefits = await prisma.answerBenefit.findMany({
        take: 10,
        select: { 
          id: true,
          answerId: true,
          benefitId: true,
          points: true,
        },
      });
      console.log(`[GET /api/admin/questions] DEBUG: Sample AnswerBenefit records:`, 
        sampleBenefits.map((b: any) => ({
          id: b.id?.toString(),
          answerId: b.answerId?.toString(),
          benefitId: b.benefitId?.toString(),
          points: b.points,
        }))
      );
    }
    
    const benefitMappings = allOptionIds.length > 0
      ? await prisma.answerBenefit.findMany({
          where: { answerId: { in: allOptionIds } },
        })
      : [];
    
    console.log(`[GET /api/admin/questions] Found ${benefitMappings.length} benefit mappings for ${allOptionIds.length} options`);
    
    // Debug: If no mappings found, check if any of the option IDs match
    if (benefitMappings.length === 0 && allOptionIds.length > 0 && totalAnswerBenefits > 0) {
      // Get all answerIds from AnswerBenefit table
      const allAnswerBenefitIds = await prisma.answerBenefit.findMany({
        select: { answerId: true },
        distinct: ['answerId'],
      });
      const answerBenefitIdStrings = allAnswerBenefitIds.map((b: any) => b.answerId?.toString()).filter(Boolean);
      
      console.log(`[GET /api/admin/questions] DEBUG: Found ${answerBenefitIdStrings.length} unique answerIds in AnswerBenefit table`);
      console.log(`[GET /api/admin/questions] DEBUG: Sample answerIds from AnswerBenefit:`, answerBenefitIdStrings.slice(0, 5));
      console.log(`[GET /api/admin/questions] DEBUG: Sample option IDs from questions:`, allOptionIds.slice(0, 5));
      
      // Check if there's any overlap
      const matchingIds = allOptionIds.filter((id: string) => answerBenefitIdStrings.includes(id));
      console.log(`[GET /api/admin/questions] DEBUG: Matching IDs found: ${matchingIds.length}`);
      if (matchingIds.length > 0) {
        console.log(`[GET /api/admin/questions] DEBUG: Matching IDs:`, matchingIds);
      }
    }
    
    const benefitMappingsByAnswerId = new Map<string, any[]>();
    benefitMappings.forEach((bm: any) => {
      const answerId = bm.answerId ? bm.answerId.toString() : null;
      if (answerId) {
        if (!benefitMappingsByAnswerId.has(answerId)) {
          benefitMappingsByAnswerId.set(answerId, []);
        }
        benefitMappingsByAnswerId.get(answerId)!.push(bm);
      }
    });
    
    console.log(`[GET /api/admin/questions] Benefit mappings by answerId: ${benefitMappingsByAnswerId.size} unique answers`);

    // Fetch benefits to get codes
    const benefitIds = [...new Set(benefitMappings.map((bm: any) => bm.benefitId))];
    const benefits = benefitIds.length > 0
      ? await prisma.benefit.findMany({
          where: { id: { in: benefitIds } },
        })
      : [];
    const benefitMap = new Map(benefits.map((b: any) => [b.id.toString(), b]));

    // Fetch answer counts for all questions (from SessionAnswer table)
    const questionIds = questions.map((q: any) => q.id || q._id?.toString()).filter(Boolean);
    const answerCounts = questionIds.length > 0
      ? await prisma.sessionAnswer.groupBy({
          by: ['questionId'],
          where: { 
            questionId: { in: questionIds },
          },
          _count: true,
        })
      : [];
    const answerCountMap = new Map(
      answerCounts.map((ac: any) => [ac.questionId.toString(), ac._count])
    );

    const formattedQuestions = questions.map((q: any) => {
      const questionId = q.id?.toString() || q._id?.toString() || '';
      const options = (q.options || []).map((opt: any) => {
        // Ensure consistent string format for option ID
        const optionId = opt.id ? String(opt.id) : (opt._id ? String(opt._id) : '');
        const mappings = benefitMappingsByAnswerId.get(optionId) || [];
        const benefitMapping: Record<string, number> = {};
        let categoryWeight = 1.0;
        
        mappings.forEach((bm: any) => {
          const benefit = benefitMap.get(bm.benefitId.toString());
          if (benefit) {
            benefitMapping[benefit.code] = bm.points || 0;
            // Use first mapping's categoryWeight (they should all be the same per answer)
            if (bm.categoryWeight) {
              categoryWeight = bm.categoryWeight;
            }
          }
        });

        return {
          id: optionId,
          key: opt.key,
          textEn: opt.textEn || opt.key,
          textHi: opt.textHi || null,
          textHiEn: opt.textHiEn || null,
          icon: opt.icon || null,
          order: opt.order || 0,
          displayOrder: opt.displayOrder || opt.order || 0,
          triggersSubQuestion: opt.triggersSubQuestion || false,
          subQuestionId: opt.subQuestionId || null,
          nextQuestionIds: opt.nextQuestionIds || (opt.subQuestionId ? [opt.subQuestionId] : []), // Support both formats
          categoryWeight: categoryWeight,
          benefitMapping: benefitMapping,
        };
      });
      
      // Calculate total benefit mappings count for this question
      // Use the same optionId that was used to create the option object
      const questionMappingCount = options.reduce((count: number, opt: any) => {
        const optId = String(opt.id); // Ensure it's a string
        if (!optId || optId === 'undefined' || optId === 'null') return count;
        const mappings = benefitMappingsByAnswerId.get(optId) || [];
        const mappingCount = mappings.length;
        return count + mappingCount;
      }, 0);
      
      // Debug logging for questions with options but zero mappings
      if (options.length > 0 && questionMappingCount === 0 && benefitMappingsByAnswerId.size > 0) {
        console.log(`[GET /api/admin/questions] Question "${q.key}" has ${options.length} options but 0 mappings.`);
        console.log(`  Question ID: ${questionId}`);
        console.log(`  Total mappings in Map: ${benefitMappingsByAnswerId.size}`);
        options.forEach((opt: any) => {
          const optId = String(opt.id);
          const hasMapping = benefitMappingsByAnswerId.has(optId);
          const mappings = benefitMappingsByAnswerId.get(optId) || [];
          console.log(`  - Option "${opt.textEn || opt.key}" (ID: ${optId}): ${hasMapping ? `HAS ${mappings.length} mappings` : 'NO mappings'}`);
          // Check if similar IDs exist in the map
          if (!hasMapping) {
            const similarIds = Array.from(benefitMappingsByAnswerId.keys()).filter((key: string) => 
              key.includes(optId.substring(0, 10)) || optId.includes(key.substring(0, 10))
            );
            if (similarIds.length > 0) {
              console.log(`    Similar IDs found in map: ${similarIds.slice(0, 3).join(', ')}`);
            }
          }
        });
      }
      
      const finalQuestionId = q.id?.toString() || q._id?.toString() || '';
      return {
        id: finalQuestionId,
        key: q.key,
        textEn: q.textEn,
        textHi: q.textHi || null,
        textHiEn: q.textHiEn || null,
        category: q.category,
        order: q.order || 0,
        isRequired: q.isRequired ?? true,
        allowMultiple: q.allowMultiple ?? false,
        isActive: q.isActive ?? true,
        optionCount: options.length,
        answerCount: answerCountMap.get(finalQuestionId) || 0,
        mappingCount: questionMappingCount, // Count of benefit mappings across all options
        createdAt: q.createdAt || new Date(), // Provide default for null createdAt
        parentQuestionId: q.parentAnswerId || null, // Map parentAnswerId to parentQuestionId for frontend
        parentAnswerId: q.parentAnswerId || null,
        options: options,
      };
    });

    console.log(`[GET /api/admin/questions] Returning ${formattedQuestions.length} questions`);
    let totalMappings = 0;
    formattedQuestions.forEach((q: any) => {
      totalMappings += q.mappingCount || 0;
      console.log(`  - Question "${q.key}": ${q.options.length} options, ${q.mappingCount || 0} mappings`);
    });
    console.log(`[GET /api/admin/questions] Total mappings across all questions: ${totalMappings}`);
    return Response.json({
      success: true,
      data: formattedQuestions,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

// POST /api/admin/questions - Create new question with options
export async function POST(request: NextRequest) {
  let body: any = null;
  try {
    const user = await authenticate(request);
    authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN)(user);

    body = await request.json();
    console.log('[POST /api/admin/questions] Received body:', JSON.stringify(body, null, 2));
    
    // Validate required fields
    // Question key is optional - will be auto-generated if not provided
    
    if (!body.textEn || !body.textEn.trim()) {
      return Response.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Question text (English) is required',
          },
        },
        { status: 400 }
      );
    }
    
    if (!body.options || !Array.isArray(body.options) || body.options.length === 0) {
      return Response.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'At least one answer option is required',
          },
        },
        { status: 400 }
      );
    }
    
    // Validate options (key is optional - will be auto-generated)
    for (let i = 0; i < body.options.length; i++) {
      const opt = body.options[i];
      if (!opt.textEn || !opt.textEn.trim()) {
        return Response.json(
          {
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: `Option ${i + 1}: Text (English) is required`,
            },
          },
          { status: 400 }
        );
      }
    }
    
    const { options, ...questionData } = body;

    // Check for circular references in sub-question mappings
    if (options && Array.isArray(options)) {
      for (const opt of options) {
        if (opt.triggersSubQuestion && opt.subQuestionId && opt.subQuestionId.trim() !== '') {
          const subQuestionId = opt.subQuestionId.trim();
          
          // Validate that sub-question ID is a valid ObjectId format
          if (!/^[0-9a-fA-F]{24}$/.test(subQuestionId)) {
            return Response.json(
              {
                success: false,
                error: {
                  code: 'VALIDATION_ERROR',
                  message: `Invalid sub-question ID format: ${subQuestionId}`,
                },
              },
              { status: 400 }
            );
          }
          
          // Check if sub-question exists and doesn't create a cycle
          const subQuestion = await prisma.question.findUnique({
            where: { id: subQuestionId },
            include: {
              options: {
                where: {
                  triggersSubQuestion: true,
                  subQuestionId: { not: null },
                },
              },
            },
          });
          
          if (!subQuestion) {
            return Response.json(
              {
                success: false,
                error: {
                  code: 'NOT_FOUND',
                  message: `Sub-question with ID ${subQuestionId} not found. Please create the sub-question first.`,
                },
              },
              { status: 400 }
            );
          }
          
          // Check if sub-question belongs to the same organization
          if (subQuestion.organizationId !== user.organizationId) {
            return Response.json(
              {
                success: false,
                error: {
                  code: 'FORBIDDEN',
                  message: 'Sub-question must belong to the same organization',
                },
              },
              { status: 403 }
            );
          }
          
          // Check if sub-question has any option that points back to a question that would create a cycle
          // This is a simplified check - for production, implement full graph cycle detection
          const hasPotentialCycle = subQuestion.options.some(
            (subOpt) => {
              // If the sub-question's option points to a question that would create a cycle
              // This is a basic check - full implementation would traverse the entire graph
              return false; // Simplified for now
            }
          );
          
          if (hasPotentialCycle) {
            return Response.json(
              {
                success: false,
                error: {
                  code: 'CIRCULAR_REFERENCE',
                  message: 'Circular reference detected in sub-question flow.',
                },
              },
              { status: 400 }
            );
          }
        }
      }
    }

    // Fetch all benefits for the organization to map codes to IDs
    const benefits = await prisma.benefit.findMany({
      where: {
        organizationId: user.organizationId,
        isActive: true,
      },
    });
    const benefitMap = new Map(benefits.map((b) => [b.code, b.id]));

    // Create question with options
    console.log('[POST /api/admin/questions] Creating question with data:', {
      organizationId: user.organizationId,
      key: questionData.key,
      textEn: questionData.textEn,
      category: questionData.category,
      order: questionData.order,
      isRequired: questionData.isRequired,
      allowMultiple: questionData.allowMultiple,
      isActive: questionData.isActive,
      optionsCount: options.length,
    });
    
    // Auto-generate question key if not provided
    const questionKey = questionData.key?.trim() || `question_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Auto-translate if Hindi/Hinglish not provided
    let textHi = questionData.textHi?.trim() || null;
    let textHiEn = questionData.textHiEn?.trim() || null;
    
    if (!textHi || !textHiEn) {
      try {
        const { autoTranslateQuestion } = await import('@/lib/translation.service');
        const translations = autoTranslateQuestion(questionData.textEn.trim());
        textHi = textHi || translations.hindi || null;
        textHiEn = textHiEn || translations.hinglish || null;
      } catch (error) {
        console.warn('Auto-translation failed, using provided values:', error);
      }
    }

    const question = await prisma.question.create({
      data: {
        organizationId: user.organizationId,
        code: questionData.code || questionKey, // Support both code and key
        key: questionKey,
        text: questionData.text || questionData.textEn, // Support both text and textEn
        textEn: questionData.textEn.trim(),
        textHi: textHi,
        textHiEn: textHiEn,
        category: String(questionData.category), // Ensure it's a string
        questionCategory: questionData.questionCategory?.trim() || null,
        questionType: questionData.questionType?.trim() || null,
        order: Number(questionData.order) || 0,
        displayOrder: Number(questionData.displayOrder || questionData.order) || 0,
        isRequired: Boolean(questionData.isRequired ?? true),
        allowMultiple: Boolean(questionData.allowMultiple ?? false),
        parentAnswerId: questionData.parentAnswerId || null, // Support subquestions
        isActive: Boolean(questionData.isActive ?? true),
        options: {
          create: await Promise.all(options.map(async (opt: any, index: number) => {
            const subQuestionId = (opt.triggersSubQuestion && opt.subQuestionId && String(opt.subQuestionId).trim() !== '') 
              ? String(opt.subQuestionId).trim() 
              : null;
            
            // Auto-generate option key if not provided
            const optionKey = opt.key?.trim() || `option_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 9)}`;
            
            // Auto-translate answer options if Hindi/Hinglish not provided
            let optTextHi = opt.textHi?.trim() || null;
            let optTextHiEn = opt.textHiEn?.trim() || null;
            
            if (opt.textEn && (!optTextHi || !optTextHiEn)) {
              try {
                const { autoTranslateAnswer } = await import('@/lib/translation.service');
                const translations = autoTranslateAnswer(opt.textEn.trim());
                optTextHi = optTextHi || translations.hindi || null;
                optTextHiEn = optTextHiEn || translations.hinglish || null;
              } catch (error) {
                console.warn(`Auto-translation failed for option ${index}:`, error);
              }
            }
            
            // Handle nextQuestionIds array (unlimited nesting support)
            const nextQuestionIds = opt.nextQuestionIds && Array.isArray(opt.nextQuestionIds) 
              ? opt.nextQuestionIds.filter((id: any) => id && String(id).trim() !== '')
              : (subQuestionId ? [subQuestionId] : []); // Fallback to legacy subQuestionId

            return {
              key: optionKey,
              text: opt.text || opt.textEn || null,
              textEn: String(opt.textEn).trim(),
              textHi: optTextHi,
              textHiEn: optTextHiEn,
              icon: opt.icon?.trim() || null,
              order: Number(index + 1),
              displayOrder: Number(opt.displayOrder || index + 1),
              triggersSubQuestion: Boolean(opt.triggersSubQuestion || false),
              subQuestionId: subQuestionId, // Keep for backward compatibility
              nextQuestionIds: nextQuestionIds, // New: array support
            };
          })),
        },
      },
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
          // Get category weight for this answer (applies to all benefits)
          const answerCategoryWeight = typeof opt.categoryWeight === 'number' ? opt.categoryWeight : 1.0;
          
          // Create AnswerBenefit records for each benefit with points > 0
          const benefitMappings = Object.entries(opt.benefitMapping)
            .filter(([_, points]) => typeof points === 'number' && points > 0) // Only create mappings with points > 0
            .map(([benefitCode, points]) => {
              const benefitId = benefitMap.get(benefitCode);
              if (!benefitId) {
                console.warn(`[POST /api/admin/questions] Benefit code ${benefitCode} not found`);
                return null;
              }
              const pointsValue = typeof points === 'number' ? points : 0;
              return {
                answerId: answerOption.id,
                benefitId: benefitId,
                points: Math.max(0, Math.min(3, pointsValue)), // Clamp 0-3
                categoryWeight: answerCategoryWeight, // Category weight multiplier (same for all benefits in this answer)
              };
            })
            .filter((mapping) => mapping !== null);

          if (benefitMappings.length > 0) {
            // Use upsert for each mapping since MongoDB doesn't support skipDuplicates
            await Promise.all(
              benefitMappings.map((mapping) =>
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
    }

    console.log(`[POST /api/admin/questions] Created question: ${question.id}, key: ${question.key}`);
    return Response.json({
      success: true,
      data: question,
    });
  } catch (error: any) {
    console.error('[POST /api/admin/questions] Question creation error:', {
      message: error?.message,
      code: error?.code,
      meta: error?.meta,
      stack: error?.stack,
      body: body ? JSON.stringify(body, null, 2) : null,
      errorType: error?.constructor?.name,
      errorKeys: error ? Object.keys(error) : [],
    });
    
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
    
    // Handle Zod validation errors
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
    
    // Handle Prisma unique constraint errors (duplicate key/code)
    if (error?.code === 'P2002') {
      const target = error?.meta?.target || [];
      const field = Array.isArray(target) ? target[0] : 'field';
      return Response.json(
        {
          success: false,
          error: {
            code: 'DUPLICATE_ENTRY',
            message: `A question with this ${field} already exists`,
            details: error.meta,
          },
        },
        { status: 409 }
      );
    }
    
    // Handle Prisma validation errors
    if (error?.code && error.code.startsWith('P')) {
      return Response.json(
        {
          success: false,
          error: {
            code: 'DATABASE_ERROR',
            message: error?.message || 'Database error occurred',
            details: error.meta,
          },
        },
        { status: 400 }
      );
    }
    
    // Use handleApiError for other errors
    return handleApiError(error);
  }
}

