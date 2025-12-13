import { prisma } from '../lib/prisma';

const organizationId = '69361f30cc78e5f1bfc2cb18'; // From browser logs

async function checkOfferRules() {
  try {
    console.log('Checking offer rules for organizationId:', organizationId);
    
    // Check all active offer rules
    const allRules = await prisma.offerRule.findMany({
      where: {
        organizationId,
        isActive: true,
      },
      orderBy: {
        priority: 'asc',
      },
    });
    
    console.log(`\n✅ Found ${allRules.length} active offer rules:\n`);
    
    if (allRules.length === 0) {
      console.log('❌ NO ACTIVE OFFER RULES FOUND!');
      console.log('This is why offers are not being applied.');
      return;
    }
    
    // Check primary offer rules (COMBO, YOPO, FREE_LENS, PERCENT_OFF, FLAT_OFF)
    const priorityOrder = ['COMBO_PRICE', 'YOPO', 'FREE_LENS', 'PERCENT_OFF', 'FLAT_OFF'];
    const primaryRules = allRules.filter(r => priorityOrder.includes(r.offerType));
    
    console.log(`Primary offer rules: ${primaryRules.length}`);
    primaryRules.forEach(rule => {
      console.log(`\n  - ${rule.code} (${rule.offerType})`);
      console.log(`    Frame Brands: ${JSON.stringify(rule.frameBrands)}`);
      console.log(`    Lens Brand Lines: ${JSON.stringify(rule.lensBrandLines)}`);
      console.log(`    Frame Sub Categories: ${JSON.stringify(rule.frameSubCategories)}`);
      console.log(`    Min Frame MRP: ${rule.minFrameMRP || 'N/A'}`);
      console.log(`    Max Frame MRP: ${rule.maxFrameMRP || 'N/A'}`);
      console.log(`    Priority: ${rule.priority}`);
      if (rule.offerType === 'YOPO') {
        console.log(`    Config: ${JSON.stringify(rule.config)}`);
      }
    });
    
    // Check for YOPO rules specifically
    const yopoRules = allRules.filter(r => r.offerType === 'YOPO');
    console.log(`\n\nYOPO Rules: ${yopoRules.length}`);
    yopoRules.forEach(rule => {
      console.log(`\n  - ${rule.code}`);
      console.log(`    Frame Brands: ${JSON.stringify(rule.frameBrands)}`);
      console.log(`    Lens Brand Lines: ${JSON.stringify(rule.lensBrandLines)}`);
      const config = rule.config as any;
      console.log(`    Free Under YOPO: ${config?.freeUnderYOPO || 'N/A'}`);
    });
    
    // Check category discounts
    const categoryDiscounts = await prisma.categoryDiscount.findMany({
      where: {
        organizationId,
        isActive: true,
      },
    });
    
    console.log(`\n\nCategory Discounts: ${categoryDiscounts.length}`);
    categoryDiscounts.forEach(cd => {
      console.log(`\n  - ${cd.customerCategory}`);
      console.log(`    Brand Code: ${cd.brandCode}`);
      console.log(`    Discount: ${cd.discountPercent}%`);
      console.log(`    Max Discount: ₹${cd.maxDiscount || 'N/A'}`);
    });
    
    // Test with actual frame/lens data from browser logs
    console.log('\n\n🔍 Testing with actual data from browser logs:');
    console.log('  Frame Brand: "Lenstrack Eyeglasses"');
    console.log('  Frame SubCategory: "ADVANCED"');
    console.log('  Frame MRP: 3000');
    console.log('  Customer Category: (check localStorage)');
    
    // Check if any rule matches "Lenstrack Eyeglasses" brand
    const matchingBrandRules = allRules.filter(r => 
      r.frameBrands.includes('Lenstrack Eyeglasses') || 
      r.frameBrands.includes('*') ||
      r.frameBrands.length === 0
    );
    console.log(`\n  Rules matching frame brand "Lenstrack Eyeglasses" or universal: ${matchingBrandRules.length}`);
    
    // Check if any rule matches "ADVANCED" subcategory
    const matchingSubCatRules = allRules.filter(r => 
      r.frameSubCategories.includes('ADVANCED') ||
      r.frameSubCategories.length === 0
    );
    console.log(`  Rules matching frame subcategory "ADVANCED": ${matchingSubCatRules.length}`);
    
  } catch (error) {
    console.error('Error checking offer rules:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkOfferRules();

