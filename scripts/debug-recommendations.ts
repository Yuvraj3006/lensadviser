/**
 * Debug Recommendation System
 * 
 * Run: npx tsx scripts/debug-recommendations.ts <sessionId>
 * 
 * This script checks:
 * 1. Session answers
 * 2. AnswerBenefit mappings
 * 3. ProductBenefit mappings
 * 4. Benefit code matching
 * 5. Why matchPercent might be 0
 */

import { prisma } from '../lib/prisma';

async function debugRecommendation(sessionId: string) {
  console.log('🔍 Debugging Recommendation System for Session:', sessionId);
  console.log('='.repeat(80));

  try {
    // 1. Check session exists
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      console.error('❌ Session not found:', sessionId);
      return;
    }

    console.log('✅ Session found:', {
      id: session.id,
      category: session.category,
      storeId: session.storeId,
    });

    // 2. Check session answers
    const answers = await prisma.sessionAnswer.findMany({
      where: { sessionId },
    });
    console.log('\n📝 Session Answers:', answers.length);
    
    if (answers.length === 0) {
      console.error('❌ NO ANSWERS FOUND! This is a problem.');
      return;
    }

    // Get answer details
    const optionIds = answers.map(a => a.optionId);
    const options = await prisma.answerOption.findMany({
      where: { id: { in: optionIds } },
    });
    console.log('   Answer Options:', options.map(o => o.text).join(', '));

    // 3. Check AnswerBenefit mappings
    const answerBenefits = await (prisma.answerBenefit.findMany as any)({
      where: { answerId: { in: optionIds } },
    });
    console.log('\n🔗 AnswerBenefit Mappings:', answerBenefits.length);
    
    if (answerBenefits.length === 0) {
      console.error('❌ NO ANSWERBENEFIT MAPPINGS! This is why matchPercent = 0');
      console.log('   Solution: Create AnswerBenefit records linking answers to benefits');
      return;
    }

    console.log('   Sample mappings:', answerBenefits.slice(0, 3).map((ab: any) => ({
      answerId: ab.answerId,
      benefitId: ab.benefitId,
      points: ab.points,
    })));

    // 4. Check benefit scores
    const benefitIds = [...new Set(answerBenefits.map((ab: any) => ab.benefitId))];
    const store = await prisma.store.findUnique({
      where: { id: session.storeId },
    });
    
    if (!store) {
      console.error('❌ Store not found');
      return;
    }

    const benefits = await (prisma as any).benefitFeature.findMany({
      where: { 
        id: { in: benefitIds },
        type: 'BENEFIT',
        organizationId: store.organizationId,
      },
    });
    console.log('\n💎 Benefits Found:', benefits.length);
    console.log('   Benefit Codes:', benefits.map((b: any) => b.code).join(', '));
    
    if (benefits.length === 0) {
      console.error('❌ NO BENEFITS FOUND! Check organizationId:', store.organizationId);
      return;
    }

    // Calculate benefit scores (same as in service)
    const benefitScores: Record<string, number> = {};
    answerBenefits.forEach((ab: any) => {
      const benefit = benefits.find((b: any) => b.id === ab.benefitId);
      if (benefit && benefit.code) {
        const code = String(benefit.code);
        const points = typeof ab.points === 'number' ? ab.points : 1;
        const categoryWeight = typeof ab.categoryWeight === 'number' ? ab.categoryWeight : 1.0;
        const weightedPoints = points * categoryWeight;
        benefitScores[code] = (benefitScores[code] || 0) + weightedPoints;
      }
    });

    console.log('\n📊 Calculated Benefit Scores:');
    Object.entries(benefitScores).forEach(([code, score]) => {
      console.log(`   ${code}: ${score}`);
    });

    if (Object.keys(benefitScores).length === 0) {
      console.error('❌ NO BENEFIT SCORES CALCULATED! This is why matchPercent = 0');
      return;
    }

    // 5. Check products
    const products = await (prisma as any).lensProduct.findMany({
      where: { isActive: true },
      take: 10,
    });
    console.log('\n🛍️  Active Products:', products.length);
    
    if (products.length === 0) {
      console.error('❌ NO PRODUCTS FOUND!');
      return;
    }

    // 6. Check ProductBenefit mappings
    const productIds = products.map((p: any) => p.id);
    const productBenefits = await (prisma.productBenefit.findMany as any)({
      where: { productId: { in: productIds } },
    });
    console.log('\n🔗 ProductBenefit Mappings:', productBenefits.length);
    
    if (productBenefits.length === 0) {
      console.error('❌ NO PRODUCTBENEFIT MAPPINGS! This is why matchPercent = 0');
      console.log('   Solution: Create ProductBenefit records linking products to benefits');
      return;
    }

    // 7. Check product benefits
    // Map old Benefit IDs to BenefitFeature IDs
    const productBenefitIds = [...new Set(productBenefits.map((pb: any) => pb.benefitId))];
    
    // Get old Benefit records to get their codes
    const oldBenefits = await prisma.benefit.findMany({
      where: { id: { in: productBenefitIds as string[] } },
    });
    
    // Create mapping: old Benefit.id -> BenefitFeature.id (by code)
    const benefitCodes = [...new Set(oldBenefits.map(b => b.code))];
    const productBenefitFeatures = benefitCodes.length > 0
      ? await (prisma as any).benefitFeature.findMany({
          where: {
            type: 'BENEFIT',
            code: { in: benefitCodes },
            organizationId: store.organizationId,
          },
        })
      : [];
    
    console.log('\n💎 Product Benefit Codes:', productBenefitFeatures.map((b: any) => b.code).join(', '));
    
    if (productBenefitFeatures.length === 0) {
      console.error('❌ NO PRODUCT BENEFITS FOUND!');
      if (oldBenefits.length > 0) {
        console.log('   Old Benefit codes found:', oldBenefits.map(b => b.code).join(', '));
        console.log('   But no matching BenefitFeature records found for organization:', store.organizationId);
      }
      return;
    }

    // 8. Check for code overlap
    const userCodes = new Set(benefits.map((b: any) => b.code));
    const productCodes = new Set(productBenefitFeatures.map((b: any) => b.code));
    const overlap = [...userCodes].filter(code => productCodes.has(code));
    
    console.log('\n🎯 Matching Benefit Codes:', overlap.length);
    if (overlap.length > 0) {
      console.log('   Codes:', overlap.join(', '));
    } else {
      console.error('❌ NO MATCHING BENEFIT CODES! This is why matchPercent = 0');
      console.log('   User Benefits:', [...userCodes].join(', '));
      console.log('   Product Benefits:', [...productCodes].join(', '));
      console.log('   Solution: Ensure benefit codes match between AnswerBenefit and ProductBenefit');
      return;
    }

    // 9. Calculate sample scores for first product
    console.log('\n🧮 Sample Scoring for First Product:');
    const firstProduct = products[0];
    const firstProductBenefits = productBenefits.filter((pb: any) => pb.productId === firstProduct.id);
    
    // Create mapping: old Benefit.id -> BenefitFeature.code
    const oldBenefitIdToCodeMap = new Map(oldBenefits.map(b => [b.id, b.code]));
    const benefitCodeMap = new Map(productBenefitFeatures.map((b: any) => [b.code, b]));
    
    let benefitComponent = 0;
    firstProductBenefits.forEach((pb: any) => {
      const code = oldBenefitIdToCodeMap.get(pb.benefitId);
      if (!code) return;
      
      const benefit = benefitCodeMap.get(code) as { code: string; pointWeight?: number } | undefined;
      if (benefit && benefit.code) {
        const userBenefitScore = benefitScores[code] || 0;
        const productBenefitScore = pb.score || 0;
        const benefitWeight = benefit.pointWeight || 1.0;
        const contribution = userBenefitScore * productBenefitScore * benefitWeight;
        benefitComponent += contribution;
        
        if (contribution > 0) {
          console.log(`   ${code}: ${userBenefitScore} × ${productBenefitScore} × ${benefitWeight} = ${contribution}`);
        }
      }
    });

    console.log(`   Total benefitComponent: ${benefitComponent}`);
    
    if (benefitComponent === 0) {
      console.error('❌ benefitComponent = 0! Check ProductBenefit.score values');
      console.log('   ProductBenefit scores:', firstProductBenefits.map((pb: any) => ({
        benefitId: pb.benefitId,
        score: pb.score,
      })));
    }

    // 10. Summary
    console.log('\n' + '='.repeat(80));
    console.log('📋 SUMMARY:');
    console.log('   ✅ Session answers:', answers.length);
    console.log('   ✅ AnswerBenefit mappings:', answerBenefits.length);
    console.log('   ✅ User benefit codes:', benefits.length);
    console.log('   ✅ Products:', products.length);
    console.log('   ✅ ProductBenefit mappings:', productBenefits.length);
    console.log('   ✅ Product benefit codes:', productBenefitFeatures.length);
    console.log('   ✅ Matching codes:', overlap.length);
    console.log('   ✅ Sample benefitComponent:', benefitComponent);
    
    if (overlap.length === 0 || benefitComponent === 0) {
      console.log('\n❌ ISSUE FOUND: matchPercent will be 0 because:');
      if (overlap.length === 0) {
        console.log('   - No matching benefit codes between user and products');
      }
      if (benefitComponent === 0) {
        console.log('   - ProductBenefit.score values are 0 or missing');
      }
    } else {
      console.log('\n✅ Data looks good! If matchPercent is still 0, check:');
      console.log('   1. All products have ProductBenefit mappings');
      console.log('   2. ProductBenefit.score values are > 0');
      console.log('   3. Benefit codes match exactly (case-sensitive)');
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

// Get sessionId from command line
const sessionId = process.argv[2];

if (!sessionId) {
  console.error('Usage: npx tsx scripts/debug-recommendations.ts <sessionId>');
  process.exit(1);
}

debugRecommendation(sessionId);

