/**
 * Check Detailed Scoring
 * 
 * This script shows detailed scoring calculation to understand why products have same matchPercent
 * 
 * Run: npx tsx scripts/check-detailed-scoring.ts <sessionId>
 */

import { recommendationsAdapterService } from '../services/recommendations-adapter.service';

async function checkDetailedScoring(sessionId: string) {
  console.log('🔍 Checking Detailed Scoring for Session:', sessionId);
  console.log('='.repeat(80));

  try {
    const result = await recommendationsAdapterService.generateRecommendations(sessionId);

    console.log('\n📊 User Benefit Scores:');
    Object.entries(result.benefitScores).forEach(([code, score]) => {
      console.log(`   ${code}: ${score}`);
    });

    console.log('\n📋 Product Scoring Details:\n');
    
    result.recommendations.slice(0, 10).forEach((rec: any, index: number) => {
      console.log(`${index + 1}. ${rec.name} (${rec.itCode})`);
      console.log(`   Match Percent: ${rec.matchPercent}%`);
      console.log(`   Final Score: ${rec.finalScore}`);
      console.log(`   Benefit Component: ${rec.benefitComponent}`);
      console.log(`   Lens Index: ${rec.lensIndex}`);
      console.log(`   Price: ₹${rec.pricing?.finalPrice || rec.offerPrice || 0}`);
      console.log('');
    });

    // Group by matchPercent
    const byMatchPercent = new Map<number, any[]>();
    result.recommendations.forEach((rec: any) => {
      const mp = rec.matchPercent || 0;
      if (!byMatchPercent.has(mp)) {
        byMatchPercent.set(mp, []);
      }
      byMatchPercent.get(mp)!.push(rec);
    });

    console.log('='.repeat(80));
    console.log('\n📊 Match Percent Distribution:\n');
    
    const sortedPercentages = [...byMatchPercent.keys()].sort((a, b) => b - a);
    sortedPercentages.forEach(mp => {
      const products = byMatchPercent.get(mp)!;
      console.log(`${mp}%: ${products.length} products`);
      products.forEach(p => {
        console.log(`   - ${p.itCode || p.name} (score: ${p.finalScore})`);
      });
      console.log('');
    });

    if (byMatchPercent.size === 1) {
      console.log('❌ PROBLEM: All products have same matchPercent!');
      console.log('\n💡 Reasons:');
      console.log('   1. All products have same finalScore');
      console.log('   2. User cares about benefits that all products have with similar scores');
      console.log('\n💡 Solutions:');
      console.log('   1. Assign different benefit scores to products');
      console.log('   2. Not all products should have all benefits (some should have score=0)');
      console.log('   3. Add tie-breakers: price, index, feature count');
    } else {
      console.log('✅ Good! Products have different matchPercent values');
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  }
}

const sessionId = process.argv[2];
if (!sessionId) {
  console.error('Usage: npx tsx scripts/check-detailed-scoring.ts <sessionId>');
  process.exit(1);
}

checkDetailedScoring(sessionId)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

