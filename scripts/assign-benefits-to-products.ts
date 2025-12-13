/**
 * Assign Benefits to Products
 * 
 * This script assigns benefits to all active products.
 * It uses BenefitFeature IDs (not old Benefit IDs).
 * 
 * Run: npx tsx scripts/assign-benefits-to-products.ts
 * 
 * Note: This is a helper script. You may need to customize benefit assignments
 * based on your business logic.
 */

import { prisma } from '../lib/prisma';

async function assignBenefitsToProducts() {
  console.log('🚀 Assigning Benefits to Products...');
  console.log('='.repeat(80));

  try {
    // Step 1: Get all active products
    const products = await (prisma as any).lensProduct.findMany({
      where: { isActive: true },
    });

    console.log(`\n📦 Found ${products.length} active products`);

    if (products.length === 0) {
      console.log('❌ No products found');
      return;
    }

    // Step 2: Get organization benefits (BenefitFeature)
    // We'll use the first product's organization (assuming all products are from same org)
    // Or get from first store
    const store = await prisma.store.findFirst({
      where: { isActive: true },
    });

    if (!store) {
      console.error('❌ No active store found');
      return;
    }

    const orgId = store.organizationId;
    console.log(`\n🏢 Using organization: ${orgId}`);

    // Get all benefits for this organization
    const benefits = await (prisma as any).benefitFeature.findMany({
      where: {
        type: 'BENEFIT',
        organizationId: orgId,
        isActive: true,
      },
    });

    console.log(`\n💎 Found ${benefits.length} benefits for organization`);
    benefits.forEach((b: any) => {
      console.log(`   - ${b.code}: ${b.name}`);
    });

    if (benefits.length === 0) {
      console.error('❌ No benefits found for organization');
      return;
    }

    // Step 3: Check if old Benefit model still exists and create mapping
    // ProductBenefit uses old Benefit model, so we need to map BenefitFeature -> Benefit
    const oldBenefits = await prisma.benefit.findMany({
      where: {
        organizationId: orgId,
        isActive: true,
      },
    });

    console.log(`\n📋 Found ${oldBenefits.length} old Benefit records`);

    // Create mapping: BenefitFeature.code -> Benefit.id
    const benefitCodeToOldIdMap = new Map<string, string>();
    oldBenefits.forEach((b) => {
      benefitCodeToOldIdMap.set(b.code, b.id);
    });

    // Step 4: Assign benefits to products
    // For now, we'll assign all benefits with a default score of 2 (medium)
    // You can customize this based on product features, brand, etc.
    console.log('\n🔄 Assigning benefits to products...');

    let assignedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const product of products) {
      console.log(`\n   Processing: ${product.itCode || product.name} (${product.id})`);

      // Check existing ProductBenefit mappings
      const existingMappings = await (prisma.productBenefit.findMany as any)({
        where: { productId: product.id },
      });

      if (existingMappings.length > 0) {
        console.log(`      ⏭️  Already has ${existingMappings.length} benefits assigned, skipping...`);
        skippedCount++;
        continue;
      }

      // Assign all benefits with default score of 2
      // You can customize this logic based on:
      // - Product features
      // - Product brand/line
      // - Product type
      // - etc.
      const defaultScore = 2.0; // Medium strength

      for (const benefit of benefits) {
        const oldBenefitId = benefitCodeToOldIdMap.get(benefit.code);

        if (!oldBenefitId) {
          console.warn(`      ⚠️  No old Benefit found for code: ${benefit.code}`);
          continue;
        }

        try {
          // Check if mapping already exists
          const existing = await (prisma.productBenefit.findFirst as any)({
            where: {
              productId: product.id,
              benefitId: oldBenefitId,
            },
          });

          if (existing) {
            continue; // Already exists
          }

          // Create ProductBenefit mapping
          await (prisma.productBenefit.create as any)({
            data: {
              productId: product.id,
              benefitId: oldBenefitId,
              score: defaultScore,
            },
          });

          assignedCount++;
          console.log(`      ✅ Assigned ${benefit.code} (score: ${defaultScore})`);
        } catch (error: any) {
          if (error.code === 'P2002' || error.message?.includes('unique')) {
            // Duplicate, skip
            continue;
          }
          errorCount++;
          console.error(`      ❌ Error assigning ${benefit.code}: ${error.message}`);
        }
      }
    }

    // Step 5: Summary
    console.log('\n' + '='.repeat(80));
    console.log('📊 Summary:');
    console.log(`   Total products: ${products.length}`);
    console.log(`   ✅ Benefits assigned: ${assignedCount}`);
    console.log(`   ⏭️  Skipped (already assigned): ${skippedCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);

    if (assignedCount > 0) {
      console.log('\n✅ Benefits assigned successfully!');
      console.log('\n💡 Note: All benefits were assigned with default score of 2.0');
      console.log('   You may want to customize scores based on product features.');
    }

    // Step 6: Verify
    console.log('\n🔍 Verifying assignments...');
    const verifyProducts = await (prisma as any).lensProduct.findMany({
      where: { isActive: true },
      take: 5,
    });

    for (const product of verifyProducts) {
      const mappings = await (prisma.productBenefit.findMany as any)({
        where: { productId: product.id },
      });
      console.log(`   ${product.itCode || product.name}: ${mappings.length} benefits`);
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
assignBenefitsToProducts()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

