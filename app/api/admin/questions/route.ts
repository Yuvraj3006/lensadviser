import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticate, authorize } from '@/middleware/auth.middleware';
import { handleApiError } from '@/lib/errors';
import { UserRole } from '@prisma/client';
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

    const formattedQuestions = questions.map((q: any) => {
      const options = (q.options || []).map((opt: any) => ({
        id: opt.id || (opt._id ? opt._id.toString() : ''),
        key: opt.key,
        textEn: opt.textEn || opt.key,
      }));
      
      return {
        id: q.id || (q._id ? q._id.toString() : ''),
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
        answerCount: 0, // TODO: Add answers relation if needed
        mappingCount: 0, // TODO: Add mappings relation if needed
        createdAt: q.createdAt || new Date(), // Provide default for null createdAt
        parentQuestionId: q.parentAnswerId || null, // Map parentAnswerId to parentQuestionId for frontend
        parentAnswerId: q.parentAnswerId || null,
        options: options,
      };
    });

    console.log(`[GET /api/admin/questions] Returning ${formattedQuestions.length} questions`);
    formattedQuestions.forEach((q: any) => {
      console.log(`  - Question "${q.key}": ${q.options.length} options`);
    });
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
    const { options, ...questionData } = body;

    // Create question with options
    const question = await prisma.question.create({
      data: {
        organizationId: user.organizationId,
        code: questionData.code || questionData.key, // Support both code and key
        key: questionData.key,
        text: questionData.text || questionData.textEn, // Support both text and textEn
        textEn: questionData.textEn,
        textHi: questionData.textHi || null,
        textHiEn: questionData.textHiEn || null,
        category: questionData.category,
        questionCategory: questionData.questionCategory || null,
        questionType: questionData.questionType || null,
        order: questionData.order || 0,
        displayOrder: questionData.displayOrder || questionData.order || 0,
        isRequired: questionData.isRequired ?? true,
        allowMultiple: questionData.allowMultiple ?? false,
        parentAnswerId: questionData.parentAnswerId || null, // Support subquestions
        isActive: questionData.isActive ?? true,
        options: {
          create: options.map((opt: any, index: number) => ({
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
      },
      include: {
        options: true,
      },
    });

    console.log(`[POST /api/admin/questions] Created question: ${question.id}, key: ${question.key}`);
    return Response.json({
      success: true,
      data: question,
    });
  } catch (error: any) {
    console.error('Question creation error:', {
      message: error?.message,
      code: error?.code,
      meta: error?.meta,
      stack: error?.stack,
      body: body,
    });
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

