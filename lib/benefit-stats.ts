import { BenefitStat, PrismaClient } from '@prisma/client';
import { prisma } from './prisma';
import { measureQuery } from './performance';
import { getCachedValue, setCachedValue, clearCache } from './cache';

const STATS_CACHE_TTL = 60_000; // 1 minute

export async function getBenefitStatsMap(organizationId: string): Promise<Map<string, BenefitStat>> {
  const cacheKey = `benefit-stats:${organizationId}`;
  let statsMap = getCachedValue<Map<string, BenefitStat>>(cacheKey);

  if (!statsMap) {
    const rows = await measureQuery('benefitStat.findMany', () =>
      prisma.benefitStat.findMany({ where: { organizationId } })
    );
    statsMap = new Map(rows.map((row) => [row.benefitId, row]));
    setCachedValue(cacheKey, statsMap, STATS_CACHE_TTL);
  }

  return statsMap;
}

export async function recomputeBenefitStats(organizationId: string): Promise<void> {
  const where = { organizationId, isActive: true };
  const cacheKey = `benefit-stats:${organizationId}`;
  const idsKey = `benefit-ids:${organizationId}`;

  const benefitIds = (await measureQuery('benefits.ids', () =>
    prisma.benefit.findMany({ where, select: { id: true } })
  )).map((row) => row.id);

  const [answerBenefitCounts, productBenefitCounts] = await Promise.all([
    measureQuery('answerBenefit.groupBy', () =>
      prisma.answerBenefit.groupBy({
        by: ['benefitId'],
        where: { benefitId: { in: benefitIds } },
        _count: true,
      })
    ),
    measureQuery('productBenefit.groupBy', () =>
      prisma.productBenefit.groupBy({
        by: ['benefitId'],
        where: { benefitId: { in: benefitIds } },
        _count: true,
      })
    ),
  ]);

  const stats: Record<string, { question: number; product: number }> = {};

  answerBenefitCounts.forEach((item) => {
    stats[item.benefitId] = { question: item._count, product: 0 };
  });
  productBenefitCounts.forEach((item) => {
    stats[item.benefitId] = {
      question: stats[item.benefitId]?.question || 0,
      product: item._count,
    };
  });

  await prisma.benefitStat.deleteMany({ where: { organizationId } });

  if (benefitIds.length > 0) {
    for (const benefitId of benefitIds) {
      await prisma.benefitStat.create({
        data: {
        organizationId,
        benefitId,
        questionMappingCount: stats[benefitId]?.question || 0,
        productMappingCount: stats[benefitId]?.product || 0,
        },
    });
    }
  }

  clearCache(cacheKey);
  clearCache(idsKey);
}

export async function getBenefitIds(organizationId: string): Promise<string[]> {
  const cacheKey = `benefit-ids:${organizationId}`;
  let ids = getCachedValue<string[]>(cacheKey);
  if (!ids) {
    const rows = await measureQuery('benefits.ids', () =>
      prisma.benefit.findMany({ where: { organizationId }, select: { id: true } })
    );
    ids = rows.map((row) => row.id);
    setCachedValue(cacheKey, ids, STATS_CACHE_TTL);
  }
  return ids;
}
