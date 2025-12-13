/**
 * Check Features vs Benefits Mapping
 * 
 * This script shows:
 * 1. What Features are mapped to products
 * 2. What Benefits are mapped to products
 * 3. What Benefits are mapped to answers
 * 4. Which ones are used in scoring
 * 
 * Run: npx tsx scripts/check-features-benefits-mapping.ts
 */

import { prisma } from '../lib/prisma';

async function checkFeaturesBenefitsMapping() {
  console.log('🔍 Checking Features vs Benefits Mapping...');
  console.log('='.repeat(80));

  try {
    // Get organization
    const store = await prisma.store.findFirst({
      where: { isActive: true },
    });

    if (!store) {
      console.error('❌ No active store found');
      return;
    }

    const orgId = store.organizationId;
    console.log(`\n🏢 Organization: ${orgId}`);

    // 1. Check Features
    console.log('\n📋 FEATURES (Display Only - NOT used in scoring)');
    console.log('='.repeat(80));
    
    const features = await (prisma as any).benefitFeature.findMany({
      where: {
        type: 'FEATURE',
        isActive: true,
      },
    });

    console.log(`\n✅ Total Features: ${features.length}`);
    features.forEach((f: any) => {
      console.log(`   - ${f.code}: ${f.name}`);
    });

    // Check ProductFeature mappings (skip if database issue)
    try {
      const productFeatures = await (prisma.productFeature.findMany as any)({
        take: 10,
      });

      console.log(`\n🔗 ProductFeature Mappings: ${productFeatures.length}`);
      
      if (productFeatures.length > 0) {
        const productIds = [...new Set(productFeatures.map((pf: any) => pf.productId))];
        const products = await (prisma as any).lensProduct.findMany({
          where: { id: { in: productIds } },
          take: 5,
        });

        console.log(`\n   Sample Products with Features:`);
        for (const product of products) {
          const productFeatureList = productFeatures.filter((pf: any) => pf.productId === product.id);
          console.log(`   - ${product.itCode || product.name}: ${productFeatureList.length} features`);
        }
      } else {
        console.log(`   ⚠️  No ProductFeature mappings found`);
      }
    } catch (error: any) {
      console.log(`\n   ⚠️  Could not fetch ProductFeature mappings (database issue)`);
      console.log(`   Note: Features are for display only, not used in scoring`);
    }

    // 2. Check Benefits
    console.log('\n\n💎 BENEFITS (Used in Scoring - IMPORTANT!)');
    console.log('='.repeat(80));
    
    const benefits = await (prisma as any).benefitFeature.findMany({
      where: {
        type: 'BENEFIT',
        organizationId: orgId,
        isActive: true,
      },
    });

    console.log(`\n✅ Total Benefits: ${benefits.length}`);
    benefits.forEach((b: any) => {
      console.log(`   - ${b.code}: ${b.name}`);
    });

    // Check ProductBenefit mappings
    const productBenefits = await (prisma.productBenefit.findMany as any)({
      take: 50,
    });

    console.log(`\n🔗 ProductBenefit Mappings: ${productBenefits.length}`);
    
    if (productBenefits.length > 0) {
      const productIds = [...new Set(productBenefits.map((pb: any) => pb.productId))];
      const products = await (prisma as any).lensProduct.findMany({
        where: { id: { in: productIds } },
        take: 5,
      });

      // Get old Benefit records for mapping
      const oldBenefitIds = [...new Set(productBenefits.map((pb: any) => pb.benefitId))] as string[];
      const oldBenefits = await prisma.benefit.findMany({
        where: { id: { in: oldBenefitIds } },
      });
      const oldBenefitMap = new Map(oldBenefits.map(b => [b.id, b.code]));

      console.log(`\n   Sample Products with Benefits (WITH SCORES):`);
      for (const product of products) {
        const productBenefitList = productBenefits.filter((pb: any) => pb.productId === product.id);
        const benefitCodes = productBenefitList
          .map((pb: any) => {
            const code = oldBenefitMap.get(pb.benefitId);
            return code ? `${code}(${pb.score})` : '?';
          })
          .join(', ');
        console.log(`   - ${product.itCode || product.name}: ${productBenefitList.length} benefits [${benefitCodes}]`);
      }
    } else {
      console.log(`   ❌ No ProductBenefit mappings found - THIS IS A PROBLEM!`);
    }

    // 3. Check AnswerBenefit mappings
    console.log('\n\n📝 ANSWER-BENEFIT MAPPINGS (User Preferences)');
    console.log('='.repeat(80));
    
    const answerBenefits = await (prisma.answerBenefit.findMany as any)({
      take: 20,
    });

    console.log(`\n🔗 AnswerBenefit Mappings: ${answerBenefits.length}`);
    
    if (answerBenefits.length > 0) {
      const answerIds = [...new Set(answerBenefits.map((ab: any) => ab.answerId))] as string[];
      const answers = await prisma.answerOption.findMany({
        where: { id: { in: answerIds } },
        take: 5,
      });

      // Get old Benefit records for mapping
      const oldBenefitIds = [...new Set(answerBenefits.map((ab: any) => ab.benefitId))] as string[];
      const oldBenefits = await prisma.benefit.findMany({
        where: { id: { in: oldBenefitIds } },
      });
      const oldBenefitMap = new Map(oldBenefits.map(b => [b.id, b.code]));

      console.log(`\n   Sample Answers with Benefits (WITH POINTS):`);
      for (const answer of answers) {
        const answerBenefitList = answerBenefits.filter((ab: any) => ab.answerId === answer.id);
        const benefitCodes = answerBenefitList
          .map((ab: any) => {
            const code = oldBenefitMap.get(ab.benefitId);
            return code ? `${code}(${ab.points})` : '?';
          })
          .join(', ');
        console.log(`   - "${answer.text}": ${answerBenefitList.length} benefits [${benefitCodes}]`);
      }
    } else {
      console.log(`   ❌ No AnswerBenefit mappings found - THIS IS A PROBLEM!`);
    }

    // 4. Summary
    console.log('\n\n📊 SUMMARY');
    console.log('='.repeat(80));
    console.log(`\n✅ Features (Display Only):`);
    console.log(`   - Total Features: ${features.length}`);
    console.log(`   - Used in Scoring: ❌ NO`);
    console.log(`   - Purpose: Display/Filtering only`);
    
    console.log(`\n✅ Benefits (Scoring):`);
    console.log(`   - Total Benefits: ${benefits.length}`);
    console.log(`   - ProductBenefit Mappings: ${productBenefits.length}`);
    console.log(`   - AnswerBenefit Mappings: ${answerBenefits.length}`);
    console.log(`   - Used in Scoring: ✅ YES`);
    
    console.log(`\n🎯 Recommendation System:`);
    console.log(`   - Uses: Benefits (B01-B12)`);
    console.log(`   - Does NOT use: Features (F01-F11)`);
    
    if (productBenefits.length === 0) {
      console.log(`\n❌ PROBLEM: No ProductBenefit mappings!`);
      console.log(`   Solution: Assign benefits to products with scores (0-3)`);
    }
    
    if (answerBenefits.length === 0) {
      console.log(`\n❌ PROBLEM: No AnswerBenefit mappings!`);
      console.log(`   Solution: Map answers to benefits with points (1, 2, 3)`);
    }

    if (productBenefits.length > 0 && answerBenefits.length > 0) {
      console.log(`\n✅ All mappings look good!`);
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

checkFeaturesBenefitsMapping();

