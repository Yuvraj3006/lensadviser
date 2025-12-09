import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticate } from '@/middleware/auth.middleware';
import { handleApiError, NotFoundError } from '@/lib/errors';

// GET /api/admin/sessions/[id] - Get session details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await authenticate(request);
    const { id } = await params;

    const session = await prisma.session.findUnique({
      where: { id },
    });

    if (!session) {
      throw new NotFoundError('Session');
    }

    // Get related data separately (no relations in schema)
    const store = await prisma.store.findUnique({
      where: { id: session.storeId },
      select: {
        name: true,
      },
    });

    const sessionUser = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        name: true,
      },
    });

    // Get answers separately
    const sessionAnswers = await prisma.sessionAnswer.findMany({
      where: { sessionId: id },
      orderBy: {
        answeredAt: 'asc',
      },
    });

    // Get question and option IDs
    const questionIds = [...new Set(sessionAnswers.map((a) => a.questionId))];
    const optionIds = [...new Set(sessionAnswers.map((a) => a.optionId))];

    // Get questions and options
    const questions = await prisma.question.findMany({
      where: { id: { in: questionIds } },
      select: {
        id: true,
        textEn: true,
        key: true,
      },
    });

    const options = await prisma.answerOption.findMany({
      where: { id: { in: optionIds } },
      select: {
        id: true,
        textEn: true,
        key: true,
      },
    });

    // Create maps for lookup
    const questionMap = new Map(questions.map((q) => [q.id, q]));
    const optionMap = new Map(options.map((o) => [o.id, o]));

    // Format answers with question and option data
    const answers = sessionAnswers.map((answer) => ({
      ...answer,
      question: questionMap.get(answer.questionId) || null,
      option: optionMap.get(answer.optionId) || null,
    }));

    // Get recommendations separately
    const sessionRecommendations = await prisma.sessionRecommendation.findMany({
      where: { sessionId: id },
      orderBy: {
        rank: 'asc',
      },
    });

    // Get product IDs
    const productIds = sessionRecommendations.map((rec) => rec.productId);

    // Get lens products and retail products separately
    const lensProducts = await prisma.lensProduct.findMany({
      where: { id: { in: productIds } },
      select: {
        id: true,
        name: true,
        itCode: true,
        brandLine: true,
        baseOfferPrice: true,
      },
    });
    
    const retailProducts = await prisma.retailProduct.findMany({
      where: { id: { in: productIds } },
      include: {
        brand: true,
      },
    });
    
    // Combine both types into common format
    const products = [
      ...lensProducts.map(p => ({
        id: p.id,
        name: p.name,
        sku: p.itCode,
        brand: p.brandLine,
        basePrice: p.baseOfferPrice,
        imageUrl: null,
      })),
      ...retailProducts.map(p => ({
        id: p.id,
        name: p.name || '',
        sku: p.sku || p.id,
        brand: p.brand.name,
        basePrice: p.mrp,
        imageUrl: null,
      })),
    ];

    // Create product map
    const productMap = new Map(products.map((p) => [p.id, p]));

    // Format recommendations with product data
    const recommendations = sessionRecommendations.map((rec) => ({
      ...rec,
      product: productMap.get(rec.productId) || null,
    }));

    return Response.json({
      success: true,
      data: {
        ...session,
        store: store || null,
        user: sessionUser || null,
        answers,
        recommendations,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

