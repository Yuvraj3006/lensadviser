/**
 * Check ProductBenefit Mappings
 * 
 * Run: npx tsx scripts/check-product-benefits.ts
 */

import { prisma } from '../lib/prisma';

async function checkProductBenefits() {
  console.log('🔍 Checking ProductBenefit Mappings...');
  console.log('='.repeat(80));

  try {
    // Get active products
    const products = await (prisma as any).lensProduct.findMany({
      where: { isActive: true },
      take: 10,
    });

    console.log(`\n📦 Found ${products.length} active products`);

    if (products.length === 0) {
      console.log('❌ No products found');
      return;
    }

    const productIds = products.map((p: any) => p.id);

    // Get ProductBenefit mappings
    const productBenefits = await (prisma.productBenefit.findMany as any)({
      where: { productId: { in: productIds } },
    });

    console.log(`\n🔗 ProductBenefit Mappings: ${productBenefits.length}`);

    if (productBenefits.length === 0) {
      console.log('\n❌ NO PRODUCTBENEFIT MAPPINGS FOUND!');
      console.log('   This is why matchPercent = 0');
      console.log('\n💡 Solution:');
      console.log('   1. Go to admin panel');
      console.log('   2. For each product, assign benefits (B01-B12)');
      console.log('   3. Set benefit scores (0-3 scale)');
      return;
    }

    // Group by product
    const benefitsByProduct = new Map<string, any[]>();
    productBenefits.forEach((pb: any) => {
      if (!benefitsByProduct.has(pb.productId)) {
        benefitsByProduct.set(pb.productId, []);
      }
      benefitsByProduct.get(pb.productId)!.push(pb);
    });

    console.log(`\n📊 Products with benefits: ${benefitsByProduct.size}/${products.length}`);

    // Get benefit details
    const benefitIds = [...new Set(productBenefits.map((pb: any) => pb.benefitId))];
    const benefits = await (prisma as any).benefitFeature.findMany({
      where: {
        id: { in: benefitIds },
        type: 'BENEFIT',
      },
    });

    const benefitMap = new Map(benefits.map((b: any) => [b.id, b]));

    // Show sample products
    console.log('\n📋 Sample Products with Benefits:');
    for (const product of products.slice(0, 5)) {
      const productBenefitList = benefitsByProduct.get(product.id) || [];
      console.log(`\n   ${product.itCode || product.name}:`);
      if (productBenefitList.length === 0) {
        console.log(`      ❌ No benefits assigned`);
      } else {
        productBenefitList.forEach((pb: any) => {
          const benefit = benefitMap.get(pb.benefitId) as { code: string; name: string } | undefined;
          if (benefit) {
            console.log(`      ✅ ${benefit.code}: ${benefit.name} (score: ${pb.score || 0})`);
          }
        });
      }
    }

    // Check if products have benefits matching user benefits
    const orgId = '69361f30cc78e5f1bfc2cb18'; // From previous debug
    const orgBenefits = await (prisma as any).benefitFeature.findMany({
      where: {
        type: 'BENEFIT',
        organizationId: orgId,
        isActive: true,
      },
    });

    console.log(`\n💎 Organization Benefits: ${orgBenefits.length}`);
    console.log(`   Codes: ${orgBenefits.map((b: any) => b.code).join(', ')}`);

    const productBenefitCodes = new Set(
      productBenefits
        .map((pb: any) => {
          const benefit = benefitMap.get(pb.benefitId) as { code: string } | undefined;
          return benefit?.code;
        })
        .filter(Boolean)
    );

    console.log(`\n📊 Product Benefit Codes: ${productBenefitCodes.size}`);
    console.log(`   Codes: ${[...productBenefitCodes].join(', ')}`);

    const overlap = orgBenefits.filter((b: any) => productBenefitCodes.has(b.code));
    console.log(`\n🎯 Matching Codes: ${overlap.length}`);
    if (overlap.length > 0) {
      console.log(`   Codes: ${overlap.map((b: any) => b.code).join(', ')}`);
    } else {
      console.log('   ❌ NO MATCHING CODES! Products need to have same benefit codes as organization');
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

checkProductBenefits();

