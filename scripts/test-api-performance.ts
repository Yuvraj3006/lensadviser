/**
 * API Performance Testing Script
 * Tests recommendation and offer engine APIs for performance issues
 */

import { prisma } from '../lib/prisma';

async function testRecommendationsAPI() {
  console.log('\n=== Testing Recommendations API Performance ===\n');
  
  // Get a test session
  const session = await prisma.session.findFirst({
    where: {
      category: { not: 'ACCESSORIES' },
    },
  });

  if (!session) {
    console.log('❌ No test session found');
    return;
  }

  // Get answers separately
  const answers = await prisma.sessionAnswer.findMany({
    where: { sessionId: session.id },
    take: 5,
  });

  console.log(`📋 Testing with session: ${session.id}`);
  console.log(`   Answers: ${answers.length}`);

  // Test 1: Benefit scores calculation
  const start1 = Date.now();
  const answerIds = answers.map(a => a.optionId);
  
  const answerBenefits = await (prisma.answerBenefit.findMany as any)({
    where: {
      answerId: { in: answerIds },
    },
  });
  
  const benefitIds = [...new Set(answerBenefits.map((ab: any) => ab.benefitId))];
  const benefits = await (prisma as any).benefitFeature.findMany({
    where: {
      id: { in: benefitIds },
      type: 'BENEFIT',
    },
  });
  
  const time1 = Date.now() - start1;
  console.log(`⏱️  Benefit scores calculation: ${time1}ms`);
  console.log(`   AnswerBenefits: ${answerBenefits.length}`);
  console.log(`   Benefits: ${benefits.length}`);

  // Test 2: Product fetching
  const start2 = Date.now();
  const products = await (prisma as any).lensProduct.findMany({
    where: {
      visionType: 'SINGLE_VISION',
      isActive: true,
    },
    include: {
      rxRanges: true,
    },
    take: 50,
  });
  const time2 = Date.now() - start2;
  console.log(`⏱️  Product fetching (50 products): ${time2}ms`);

  // Test 3: Product benefits fetching (N+1 problem check)
  const start3 = Date.now();
  const productIds = products.map((p: any) => p.id);
  
  // Current approach: One query per product (N+1)
  let totalQueries = 0;
  for (const productId of productIds.slice(0, 10)) {
    await prisma.productBenefit.findMany({
      where: { productId },
    });
    totalQueries++;
  }
  const time3 = Date.now() - start3;
  console.log(`⏱️  Product benefits (N+1 approach, 10 products): ${time3}ms`);
  console.log(`   Queries executed: ${totalQueries}`);

  // Optimized approach: Single query
  const start4 = Date.now();
  const allProductBenefits = await prisma.productBenefit.findMany({
    where: { productId: { in: productIds.slice(0, 10) } },
  });
  const time4 = Date.now() - start4;
  console.log(`⏱️  Product benefits (optimized, 10 products): ${time4}ms`);
  console.log(`   Queries executed: 1`);
  console.log(`   ⚡ Speed improvement: ${((time3 - time4) / time3 * 100).toFixed(1)}%`);

  // Test 4: Store products fetching
  const start5 = Date.now();
  const storeProducts = await prisma.storeProduct.findMany({
    where: {
      productId: { in: productIds.slice(0, 10) },
      storeId: session.storeId,
    },
  });
  const time5 = Date.now() - start5;
  console.log(`⏱️  Store products fetching: ${time5}ms`);

  console.log(`\n📊 Total time for recommendation data: ${time1 + time2 + time3 + time5}ms`);
}

async function testOfferEngineAPI() {
  console.log('\n=== Testing Offer Engine API Performance ===\n');

  // Get test data
  const organization = await prisma.organization.findFirst();
  if (!organization) {
    console.log('❌ No organization found');
    return;
  }

  console.log(`📋 Testing with organization: ${organization.id}`);

  // Test 1: Fetch all offer rules
  const start1 = Date.now();
  const allRules = await prisma.offerRule.findMany({
    where: {
      organizationId: organization.id,
      isActive: true,
    },
    orderBy: {
      priority: 'asc',
    },
  });
  const time1 = Date.now() - start1;
  console.log(`⏱️  Fetch all offer rules: ${time1}ms`);
  console.log(`   Rules found: ${allRules.length}`);

  // Test 2: Store offer maps (if storeId provided)
  const store = await prisma.store.findFirst({
    where: {
      organizationId: organization.id,
    },
  });

  if (store) {
    const start2 = Date.now();
    const storeOfferMaps = await (prisma as any).storeOfferMap.findMany({
      where: { storeId: store.id, isActive: true },
      select: { offerRuleId: true },
    });
    const time2 = Date.now() - start2;
    console.log(`⏱️  Fetch store offer maps: ${time2}ms`);
    console.log(`   Maps found: ${storeOfferMaps.length}`);
  }

  // Test 3: Category discounts
  const start3 = Date.now();
  const categoryDiscounts = await prisma.categoryDiscount.findMany({
    where: {
      organizationId: organization.id,
      isActive: true,
    },
  });
  const time3 = Date.now() - start3;
  console.log(`⏱️  Fetch category discounts: ${time3}ms`);

  // Test 4: Coupons
  const start4 = Date.now();
  const coupons = await prisma.coupon.findMany({
    where: {
      organizationId: organization.id,
      isActive: true,
    },
    take: 10,
  });
  const time4 = Date.now() - start4;
  console.log(`⏱️  Fetch coupons: ${time4}ms`);

  console.log(`\n📊 Total time for offer engine data: ${time1 + time3 + time4}ms`);
}

async function testFullRecommendationFlow() {
  console.log('\n=== Testing Full Recommendation Flow ===\n');

  const session = await prisma.session.findFirst({
    where: {
      category: { not: 'ACCESSORIES' },
    },
  });

  if (!session) {
    console.log('❌ No test session found');
    return;
  }

  const start = Date.now();

  // Simulate full recommendation flow
  // 1. Get session
  const sessionData = await prisma.session.findUnique({
    where: { id: session.id },
  });

  // 2. Get store
  const store = await prisma.store.findUnique({
    where: { id: session.storeId },
  });

  // 3. Get answers
  const answers = await prisma.sessionAnswer.findMany({
    where: { sessionId: session.id },
  });

  // 4. Get answer benefits
  const answerIds = answers.map(a => a.optionId);
  const answerBenefits = await (prisma.answerBenefit.findMany as any)({
    where: {
      answerId: { in: answerIds },
    },
  });

  // 5. Get benefits
  const benefitIds = [...new Set(answerBenefits.map((ab: any) => ab.benefitId))];
  const benefits = await (prisma as any).benefitFeature.findMany({
    where: {
      id: { in: benefitIds },
      type: 'BENEFIT',
    },
  });

  // 6. Get products
  const products = await (prisma as any).lensProduct.findMany({
    where: {
      visionType: 'SINGLE_VISION',
      isActive: true,
    },
    take: 20,
  });

  // 7. Get product benefits (N+1 problem)
  const productIds = products.map((p: any) => p.id);
  const productBenefits = await prisma.productBenefit.findMany({
    where: { productId: { in: productIds } },
  });

  // 8. Get store products
  const storeProducts = await prisma.storeProduct.findMany({
    where: {
      productId: { in: productIds },
      storeId: session.storeId,
    },
  });

  const totalTime = Date.now() - start;
  console.log(`⏱️  Full recommendation flow: ${totalTime}ms`);
  console.log(`   Products processed: ${products.length}`);
  console.log(`   Queries executed: ~8-10`);

  if (totalTime > 1000) {
    console.log(`   ⚠️  WARNING: Response time > 1 second!`);
  }
}

async function main() {
  console.log('🚀 Starting API Performance Tests...\n');
  
  try {
    await testRecommendationsAPI();
    await testOfferEngineAPI();
    await testFullRecommendationFlow();
    
    console.log('\n✅ Performance tests completed!\n');
  } catch (error) {
    console.error('❌ Error during testing:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();

