import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticate } from '@/middleware/auth.middleware';
import { handleApiError, NotFoundError } from '@/lib/errors';

// GET /api/admin/stores/[id]/stats - Get store statistics
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await authenticate(request);
    const { id } = await params;

    const store = await prisma.store.findUnique({
      where: {
        id,
        organizationId: user.organizationId,
      },
    });

    if (!store) {
      throw new NotFoundError('Store');
    }

    // Get session statistics
    const totalSessions = await prisma.session.count({
      where: { storeId: id },
    });

    const completedSessions = await prisma.session.count({
      where: { storeId: id, status: 'COMPLETED' },
    });

    const convertedSessions = await prisma.session.count({
      where: { storeId: id, status: 'CONVERTED' },
    });

    const conversionRate = totalSessions > 0
      ? (convertedSessions / totalSessions) * 100
      : 0;

    // Top products (most recommended)
    // First get session IDs for this store
    const storeSessions = await prisma.session.findMany({
      where: { storeId: id },
      select: { id: true },
    });
    const sessionIds = storeSessions.map((s) => s.id);

    const topProducts = sessionIds.length > 0
      ? await prisma.sessionRecommendation.groupBy({
          by: ['productId'],
          where: {
            sessionId: { in: sessionIds },
          },
          _count: {
            productId: true,
          },
          orderBy: {
            _count: {
              productId: 'desc',
            },
          },
          take: 5,
        })
      : [];

    // Get product details
    const productIds = topProducts.map((p) => p.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
    });

    const topProductsWithDetails = topProducts.map((tp) => {
      const product = products.find((p) => p.id === tp.productId);
      return {
        productId: tp.productId,
        productName: product?.name || 'Unknown',
        recommendationCount: tp._count.productId,
      };
    });

    // Staff performance
    const staffPerformance = await prisma.session.groupBy({
      by: ['userId'],
      where: { storeId: id },
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: 'desc',
        },
      },
      take: 5,
    });

    const userIds = staffPerformance.map((sp) => sp.userId);
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
    });

    const staffWithDetails = staffPerformance.map((sp) => {
      const user = users.find((u) => u.id === sp.userId);
      return {
        userId: sp.userId,
        userName: user?.name || 'Unknown',
        sessionCount: sp._count.id,
      };
    });

    return Response.json({
      success: true,
      data: {
        totalSessions,
        completedSessions,
        convertedSessions,
        conversionRate: Number(conversionRate.toFixed(2)),
        topProducts: topProductsWithDetails,
        staffPerformance: staffWithDetails,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

