import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticate } from '@/middleware/auth.middleware';
import { handleApiError } from '@/lib/errors';
import { UserRole } from '@prisma/client';

// GET /api/admin/sessions - List all sessions
export async function GET(request: NextRequest) {
  try {
    const user = await authenticate(request);

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const storeId = searchParams.get('storeId');
    const category = searchParams.get('category');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const where: any = {};

    // Store Managers can only see their store's sessions
    if (user.role === UserRole.STORE_MANAGER && user.storeId) {
      where.storeId = user.storeId;
    } else if (user.role === UserRole.SALES_EXECUTIVE && user.storeId) {
      // Sales Executives see only their own sessions
      where.userId = user.userId;
    } else if (storeId) {
      where.storeId = storeId;
    }

    if (status) {
      where.status = status;
    }

    if (category) {
      where.category = category;
    }

    if (startDate || endDate) {
      where.startedAt = {};
      if (startDate) {
        where.startedAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.startedAt.lte = new Date(endDate);
      }
    }

    const sessions = await prisma.session.findMany({
      where,
      orderBy: {
        startedAt: 'desc',
      },
      take: 100, // Limit to 100 sessions
    });

    // Get store and user IDs
    const storeIds = [...new Set(sessions.map((s) => s.storeId))];
    const userIds = [...new Set(sessions.map((s) => s.userId))];
    const sessionIds = sessions.map((s) => s.id);

    // Get stores and users separately
    const stores = await prisma.store.findMany({
      where: { id: { in: storeIds } },
      select: {
        id: true,
        name: true,
      },
    });

    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: {
        id: true,
        name: true,
      },
    });

    // Get answer and recommendation counts separately
    const answerCounts = await prisma.sessionAnswer.groupBy({
      by: ['sessionId'],
      where: { sessionId: { in: sessionIds } },
      _count: true,
    });

    const recommendationCounts = await prisma.sessionRecommendation.groupBy({
      by: ['sessionId'],
      where: { sessionId: { in: sessionIds } },
      _count: true,
    });

    // Create maps for lookup
    const storeMap = new Map(stores.map((s) => [s.id, s]));
    const userMap = new Map(users.map((u) => [u.id, u]));
    const answerCountMap = new Map(answerCounts.map((a) => [a.sessionId, a._count]));
    const recommendationCountMap = new Map(recommendationCounts.map((r) => [r.sessionId, r._count]));

    const formattedSessions = sessions.map((session) => ({
      id: session.id,
      customerName: session.customerName,
      customerPhone: session.customerPhone,
      customerEmail: session.customerEmail,
      category: session.category,
      status: session.status,
      storeId: session.storeId,
      storeName: storeMap.get(session.storeId)?.name || null,
      userId: session.userId,
      userName: userMap.get(session.userId)?.name || null,
      answerCount: answerCountMap.get(session.id) || 0,
      recommendationCount: recommendationCountMap.get(session.id) || 0,
      startedAt: session.startedAt,
      completedAt: session.completedAt,
    }));

    return Response.json({
      success: true,
      data: formattedSessions,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

