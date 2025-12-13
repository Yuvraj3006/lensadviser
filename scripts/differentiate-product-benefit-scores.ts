/**
 * Differentiate Product Benefit Scores
 * 
 * This script assigns different benefit scores to products based on:
 * - Product name/IT code (to identify product type)
 * - Price range
 * - Index (higher index = premium)
 * 
 * Run: npx tsx scripts/differentiate-product-benefit-scores.ts
 * 
 * Note: This is a helper script. You may need to customize based on your business logic.
 */

import { prisma } from '../lib/prisma';

async function differentiateProductBenefitScores() {
  console.log('🔧 Differentiating Product Benefit Scores...');
  console.log('='.repeat(80));

  try {
    // Get active products
    const products = await (prisma as any).lensProduct.findMany({
      where: { isActive: true },
    });

    console.log(`\n📦 Found ${products.length} products\n`);

    // Get organization benefits
    const store = await prisma.store.findFirst({
      where: { isActive: true },
    });

    if (!store) {
      console.error('❌ No active store found');
      return;
    }

    const orgId = store.organizationId;
    const benefits = await (prisma as any).benefitFeature.findMany({
      where: {
        type: 'BENEFIT',
        organizationId: orgId,
        isActive: true,
      },
    });

    // Get old Benefit records for mapping
    const oldBenefits = await prisma.benefit.findMany({
      where: {
        organizationId: orgId,
        isActive: true,
      },
    });

    const benefitCodeToOldIdMap = new Map(oldBenefits.map(b => [b.code, b.id]));

    // Define scoring rules based on product characteristics
    // You can customize this based on your business logic
    const getBenefitScore = (product: any, benefitCode: string): number => {
      const itCode = (product.itCode || '').toUpperCase();
      const name = (product.name || '').toUpperCase();
      const price = product.baseOfferPrice || product.mrp || 0;
      const index = product.lensIndex || 'INDEX_156';

      // Rule 1: Premium products (higher index, higher price) get higher scores
      const isPremium = index === 'INDEX_174' || index === 'INDEX_167' || price > 4000;
      const isMidRange = index === 'INDEX_160' || (price > 2000 && price <= 4000);
      const isBasic = index === 'INDEX_156' || price <= 2000;

      // Rule 2: Product-specific benefit matching
      // BLUEXPERT / SHLAX → Digital Screen Protection (B01) = high
      if ((itCode.includes('SHLAX') || name.includes('BLUEXPERT')) && benefitCode === 'B01') {
        return isPremium ? 3 : isMidRange ? 2.5 : 2;
      }

      // DRIVEXPERT / EXDR → Driving Comfort (B02) = high
      if ((itCode.includes('EXDR') || name.includes('DRIVEXPERT')) && benefitCode === 'B02') {
        return isPremium ? 3 : isMidRange ? 2.5 : 2;
      }

      // DIGI360 / D360 → Digital Screen Protection (B01) = high
      if ((itCode.includes('D360') || name.includes('DIGI360')) && benefitCode === 'B01') {
        return isPremium ? 3 : isMidRange ? 2.5 : 2;
      }

      // UV Protection (B03) - all products have it, but different strengths
      if (benefitCode === 'B03') {
        return isPremium ? 3 : isMidRange ? 2.5 : 2;
      }

      // Default scoring based on product tier
      if (isPremium) {
        // Premium products: most benefits at 2.5-3
        return Math.random() > 0.3 ? 3 : 2.5; // 70% chance of 3, 30% chance of 2.5
      } else if (isMidRange) {
        // Mid-range: most benefits at 2-2.5
        return Math.random() > 0.4 ? 2.5 : 2; // 60% chance of 2.5, 40% chance of 2
      } else {
        // Basic: most benefits at 1.5-2
        return Math.random() > 0.5 ? 2 : 1.5; // 50% chance of 2, 50% chance of 1.5
      }
    };

    let updatedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    console.log('🔄 Updating benefit scores...\n');

    for (const product of products) {
      console.log(`Processing: ${product.itCode || product.name}`);

      // Get existing ProductBenefit mappings
      const existingMappings = await (prisma.productBenefit.findMany as any)({
        where: { productId: product.id },
      });

      if (existingMappings.length === 0) {
        console.log(`   ⏭️  No benefits assigned, skipping...`);
        skippedCount++;
        continue;
      }

      // Update each benefit score
      for (const mapping of existingMappings) {
        const oldBenefit = oldBenefits.find(b => b.id === mapping.benefitId);
        if (!oldBenefit) continue;

        const newScore = getBenefitScore(product, oldBenefit.code);
        const roundedScore = Math.round(newScore * 10) / 10; // Round to 1 decimal

        // Only update if score changed
        if (Math.abs(mapping.score - roundedScore) > 0.1) {
          try {
            await (prisma.productBenefit.update as any)({
              where: { id: mapping.id },
              data: { score: roundedScore },
            });
            updatedCount++;
            console.log(`   ✅ ${oldBenefit.code}: ${mapping.score} → ${roundedScore}`);
          } catch (error: any) {
            errorCount++;
            console.error(`   ❌ Error updating ${oldBenefit.code}: ${error.message}`);
          }
        }
      }
      console.log('');
    }

    // Summary
    console.log('='.repeat(80));
    console.log('📊 Summary:');
    console.log(`   Total products: ${products.length}`);
    console.log(`   ✅ Updated: ${updatedCount} benefit scores`);
    console.log(`   ⏭️  Skipped: ${skippedCount} products`);
    console.log(`   ❌ Errors: ${errorCount}`);

    if (updatedCount > 0) {
      console.log('\n✅ Benefit scores differentiated successfully!');
      console.log('\n💡 Note:');
      console.log('   - Premium products (INDEX_174/167, price > 4000): scores 2.5-3');
      console.log('   - Mid-range products (INDEX_160, price 2000-4000): scores 2-2.5');
      console.log('   - Basic products (INDEX_156, price < 2000): scores 1.5-2');
      console.log('   - Product-specific benefits get higher scores');
    }

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run script
differentiateProductBenefitScores()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

