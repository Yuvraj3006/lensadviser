/**
 * Test Recommendations API
 * 
 * This script directly tests the recommendation service to verify matchPercent > 0
 * 
 * Run: npx tsx scripts/test-recommendations.ts <sessionId>
 */

import { recommendationsAdapterService } from '../services/recommendations-adapter.service';

async function testRecommendations(sessionId: string) {
  console.log('🧪 Testing Recommendations for Session:', sessionId);
  console.log('='.repeat(80));

  try {
    console.log('\n📞 Calling recommendationsAdapterService.generateRecommendations()...\n');
    
    const result = await recommendationsAdapterService.generateRecommendations(sessionId);

    console.log('✅ Recommendations Generated Successfully!');
    console.log('='.repeat(80));
    console.log(`\n📊 Results:`);
    console.log(`   Session ID: ${result.sessionId}`);
    console.log(`   Category: ${result.category}`);
    console.log(`   Recommended Index: ${result.recommendedIndex || 'N/A'}`);
    console.log(`   Total Recommendations: ${result.recommendations.length}`);
    console.log(`   Benefit Scores:`, result.benefitScores);

    if (result.recommendations.length === 0) {
      console.log('\n❌ No recommendations found!');
      return;
    }

    console.log('\n📋 Top 5 Recommendations:');
    console.log('='.repeat(80));
    
    result.recommendations.slice(0, 5).forEach((rec: any, index: number) => {
      console.log(`\n${index + 1}. ${rec.name || rec.itCode}`);
      console.log(`   IT Code: ${rec.itCode || rec.sku}`);
      console.log(`   Label: ${rec.label || 'None'}`);
      if (rec.canTry) {
        console.log(`   Can Try: ✅`);
      }
      console.log(`   Match Score: ${rec.matchScore || 0}`);
      console.log(`   Match Percent: ${rec.matchPercent || 0}% (internal only, not displayed)`);
      console.log(`   Benefit Component: ${rec.benefitComponent || 0}`);
      console.log(`   Final Score: ${rec.finalScore || 0}`);
      console.log(`   Lens Index: ${rec.lensIndex || 'N/A'}`);
      console.log(`   Price: ₹${rec.pricing?.finalPrice || rec.offerPrice || 0}`);
      
      if (rec.matchPercent === 0) {
        console.log(`   ⚠️  WARNING: matchPercent is 0!`);
      } else {
        console.log(`   ✅ matchPercent > 0`);
      }
    });

    // Check if any recommendations have matchPercent > 0
    const hasNonZeroMatch = result.recommendations.some((rec: any) => (rec.matchPercent || 0) > 0);
    
    console.log('\n' + '='.repeat(80));
    if (hasNonZeroMatch) {
      console.log('✅ SUCCESS: At least one recommendation has matchPercent > 0!');
      const nonZeroCount = result.recommendations.filter((rec: any) => (rec.matchPercent || 0) > 0).length;
      console.log(`   ${nonZeroCount}/${result.recommendations.length} recommendations have matchPercent > 0`);
    } else {
      console.log('❌ FAILED: All recommendations have matchPercent = 0');
      console.log('   Check the logs above for issues.');
    }

    // Show matchPercent distribution
    const matchPercentDistribution = {
      '0%': result.recommendations.filter((rec: any) => (rec.matchPercent || 0) === 0).length,
      '1-25%': result.recommendations.filter((rec: any) => (rec.matchPercent || 0) > 0 && (rec.matchPercent || 0) <= 25).length,
      '26-50%': result.recommendations.filter((rec: any) => (rec.matchPercent || 0) > 25 && (rec.matchPercent || 0) <= 50).length,
      '51-75%': result.recommendations.filter((rec: any) => (rec.matchPercent || 0) > 50 && (rec.matchPercent || 0) <= 75).length,
      '76-100%': result.recommendations.filter((rec: any) => (rec.matchPercent || 0) > 75).length,
    };

    console.log('\n📊 Match Percent Distribution:');
    Object.entries(matchPercentDistribution).forEach(([range, count]) => {
      console.log(`   ${range}: ${count} products`);
    });

    // Show four lens output if available
    if (result.fourLensOutput) {
      console.log('\n🎯 Four Lens Output:');
      console.log('='.repeat(80));
      if (result.fourLensOutput.bestMatch) {
        console.log(`   Best Match: ${result.fourLensOutput.bestMatch.name} (${result.fourLensOutput.bestMatch.matchPercent || 0}%)`);
      }
      if (result.fourLensOutput.premium) {
        console.log(`   Premium: ${result.fourLensOutput.premium.name} (${result.fourLensOutput.premium.matchPercent || 0}%)`);
      }
      if (result.fourLensOutput.value) {
        console.log(`   Value: ${result.fourLensOutput.value.name} (${result.fourLensOutput.value.matchPercent || 0}%)`);
      }
      if (result.fourLensOutput.antiWalkout) {
        console.log(`   Anti-Walkout: ${result.fourLensOutput.antiWalkout.name} (${result.fourLensOutput.antiWalkout.matchPercent || 0}%)`);
      }
    }

  } catch (error: any) {
    console.error('\n❌ Error generating recommendations:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Get sessionId from command line
const sessionId = process.argv[2];

if (!sessionId) {
  console.error('Usage: npx tsx scripts/test-recommendations.ts <sessionId>');
  console.error('\nExample:');
  console.error('  npx tsx scripts/test-recommendations.ts 693c30da5878abc43a246ba4');
  process.exit(1);
}

testRecommendations(sessionId)
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

