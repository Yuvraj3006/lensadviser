import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticate } from '@/middleware/auth.middleware';
import { handleApiError } from '@/lib/errors';
import { UserRole } from '@prisma/client';

// GET /api/admin/reports - Generate reports
export async function GET(request: NextRequest) {
  try {
    const user = await authenticate(request);

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'overview';
    const storeId = searchParams.get('storeId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Build date filter
    const dateFilter: any = {};
    if (startDate) {
      dateFilter.gte = new Date(startDate);
    }
    if (endDate) {
      dateFilter.lte = new Date(endDate);
    }

    // Build store filter
    const storeFilter: any = {};
    if (user.role === UserRole.STORE_MANAGER && user.storeId) {
      storeFilter.storeId = user.storeId;
    } else if (storeId) {
      storeFilter.storeId = storeId;
    }

    const sessionWhere = {
      ...storeFilter,
      ...(Object.keys(dateFilter).length > 0 ? { startedAt: dateFilter } : {}),
    };

    if (type === 'overview') {
      // Overview Report
      const totalSessions = await prisma.session.count({
        where: sessionWhere,
      });

      const completedSessions = await prisma.session.count({
        where: { ...sessionWhere, status: 'COMPLETED' },
      });

      const convertedSessions = await prisma.session.count({
        where: { ...sessionWhere, status: 'CONVERTED' },
      });

      const abandonedSessions = await prisma.session.count({
        where: { ...sessionWhere, status: 'ABANDONED' },
      });

      const completionRate = totalSessions > 0 ? (completedSessions / totalSessions) * 100 : 0;
      const conversionRate = totalSessions > 0 ? (convertedSessions / totalSessions) * 100 : 0;

      // Get daily trend for last 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const recentSessions = await prisma.session.findMany({
        where: {
          ...sessionWhere,
          startedAt: { gte: sevenDaysAgo },
        },
        select: {
          startedAt: true,
        },
      });

      // Group by date
      const dailyTrendMap = new Map<string, number>();
      recentSessions.forEach((session) => {
        const date = new Date(session.startedAt).toISOString().split('T')[0];
        dailyTrendMap.set(date, (dailyTrendMap.get(date) || 0) + 1);
      });

      const dailyTrend = Array.from(dailyTrendMap.entries())
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date));

      return Response.json({
        success: true,
        data: {
          totalSessions,
          completedSessions,
          convertedSessions,
          abandonedSessions,
          completionRate: Number(completionRate.toFixed(2)),
          conversionRate: Number(conversionRate.toFixed(2)),
          dailyTrend: dailyTrend.map((d: any) => ({
            date: d.date,
            sessions: d.count,
          })),
        },
      });
    }

    if (type === 'store') {
      // Store-wise Report
      const stores = await prisma.store.findMany({
        where: {
          organizationId: user.organizationId,
          isActive: true,
        },
      });

      const storeStats = await Promise.all(
        stores.map(async (store) => {
          const totalSessions = await prisma.session.count({
            where: {
              storeId: store.id,
              ...(Object.keys(dateFilter).length > 0 ? { startedAt: dateFilter } : {}),
            },
          });

          const completedSessions = await prisma.session.count({
            where: {
              storeId: store.id,
              status: 'COMPLETED',
              ...(Object.keys(dateFilter).length > 0 ? { startedAt: dateFilter } : {}),
            },
          });

          const convertedSessions = await prisma.session.count({
            where: {
              storeId: store.id,
              status: 'CONVERTED',
              ...(Object.keys(dateFilter).length > 0 ? { startedAt: dateFilter } : {}),
            },
          });

          const completionRate = totalSessions > 0 ? (completedSessions / totalSessions) * 100 : 0;
          const conversionRate = totalSessions > 0 ? (convertedSessions / totalSessions) * 100 : 0;

          return {
            storeId: store.id,
            storeName: store.name,
            totalSessions,
            completedSessions,
            convertedSessions,
            completionRate: Number(completionRate.toFixed(2)),
            conversionRate: Number(conversionRate.toFixed(2)),
          };
        })
      );

      return Response.json({
        success: true,
        data: {
          stores: storeStats,
        },
      });
    }

    if (type === 'category') {
      // Category Breakdown
      const categories = ['EYEGLASSES', 'SUNGLASSES', 'CONTACT_LENSES', 'ACCESSORIES'];
      const categoryStats = await Promise.all(
        categories.map(async (category) => {
          const count = await prisma.session.count({
            where: {
              ...sessionWhere,
              category: category as any,
            },
          });

          const converted = await prisma.session.count({
            where: {
              ...sessionWhere,
              category: category as any,
              status: 'CONVERTED',
            },
          });

          return {
            category,
            sessionCount: count,
            convertedCount: converted,
            conversionRate: count > 0 ? Number(((converted / count) * 100).toFixed(2)) : 0,
          };
        })
      );

      return Response.json({
        success: true,
        data: {
          categories: categoryStats,
        },
      });
    }

    // Default: return empty data
    return Response.json({
      success: true,
      data: {},
    });
  } catch (error) {
    return handleApiError(error);
  }
}

