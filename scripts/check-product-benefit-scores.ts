/**
 * Check Product Benefit Scores
 * 
 * This script shows why all products have same matchPercent
 * 
 * Run: npx tsx scripts/check-product-benefit-scores.ts
 */

import { prisma } from '../lib/prisma';

async function checkProductBenefitScores() {
  console.log('🔍 Checking Product Benefit Scores...');
  console.log('='.repeat(80));

  try {
    // Get active products
    const products = await (prisma as any).lensProduct.findMany({
      where: { isActive: true },
      take: 10,
    });

    console.log(`\n📦 Found ${products.length} products\n`);

    // Get ProductBenefit mappings
    const productIds = products.map((p: any) => p.id);
    const productBenefits = await (prisma.productBenefit.findMany as any)({
      where: { productId: { in: productIds } },
    });

    // Get old Benefit records for mapping
    const oldBenefitIds = [...new Set(productBenefits.map((pb: any) => pb.benefitId))] as string[];
    const oldBenefits = await prisma.benefit.findMany({
      where: { id: { in: oldBenefitIds } },
    });
    const oldBenefitMap = new Map(oldBenefits.map(b => [b.id, b.code]));

    // Group by product
    const benefitsByProduct = new Map<string, any[]>();
    productBenefits.forEach((pb: any) => {
      if (!benefitsByProduct.has(pb.productId)) {
        benefitsByProduct.set(pb.productId, []);
      }
      benefitsByProduct.get(pb.productId)!.push(pb);
    });

    // Show benefit scores for each product
    console.log('📊 Product Benefit Scores:\n');
    
    const scoreSummary: Record<string, { count: number; scores: number[] }> = {};
    
    for (const product of products) {
      const productBenefitList = benefitsByProduct.get(product.id) || [];
      const benefitScores = productBenefitList.map((pb: any) => {
        const code = oldBenefitMap.get(pb.benefitId);
        return { code, score: pb.score };
      });

      // Count scores
      const scores = benefitScores.map(b => b.score);
      const scoreKey = scores.sort().join(',');
      if (!scoreSummary[scoreKey]) {
        scoreSummary[scoreKey] = { count: 0, scores: scores };
      }
      scoreSummary[scoreKey].count++;

      console.log(`${product.itCode || product.name}:`);
      console.log(`   Benefits: ${benefitScores.length}`);
      console.log(`   Scores: ${scores.join(', ')}`);
      
      // Show unique scores
      const uniqueScores = [...new Set(scores)];
      if (uniqueScores.length === 1) {
        console.log(`   ⚠️  All benefits have same score: ${uniqueScores[0]}`);
      } else {
        console.log(`   ✅ Different scores: ${uniqueScores.join(', ')}`);
      }
      console.log('');
    }

    // Summary
    console.log('='.repeat(80));
    console.log('\n📊 Summary:\n');
    
    const scorePatterns = Object.keys(scoreSummary);
    console.log(`Unique score patterns: ${scorePatterns.length}`);
    
    scorePatterns.forEach((pattern, index) => {
      const { count, scores } = scoreSummary[pattern];
      const uniqueScores = [...new Set(scores)];
      console.log(`\n${index + 1}. Pattern: [${uniqueScores.join(', ')}]`);
      console.log(`   Products with this pattern: ${count}`);
      
      if (uniqueScores.length === 1) {
        console.log(`   ⚠️  PROBLEM: All benefits have same score (${uniqueScores[0]})`);
        console.log(`   → All products will have same finalScore`);
        console.log(`   → All products will have same matchPercent (100%)`);
      }
    });

    if (scorePatterns.length === 1) {
      console.log('\n❌ PROBLEM FOUND:');
      console.log('   All products have the same benefit scores!');
      console.log('   This is why all recommendations show same matchPercent.');
      console.log('\n💡 Solution:');
      console.log('   1. Assign different benefit scores to different products');
      console.log('   2. Based on product features, assign appropriate scores:');
      console.log('      - High-end products: score = 3 (strong benefit)');
      console.log('      - Mid-range products: score = 2 (medium benefit)');
      console.log('      - Basic products: score = 1 (weak benefit)');
      console.log('   3. Not all products should have all benefits');
      console.log('      - Some products may not have certain benefits (score = 0)');
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

checkProductBenefitScores();

