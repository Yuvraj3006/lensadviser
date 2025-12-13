import { prisma } from '../lib/prisma';

async function checkLensProduct() {
  try {
    // Find all active lens products with their brandLine and yopoEligible
    const lenses = await prisma.lensProduct.findMany({
      where: { isActive: true },
      select: {
        id: true,
        itCode: true,
        name: true,
        brandLine: true,
        yopoEligible: true,
        baseOfferPrice: true,
      },
      take: 20,
    });
    
    console.log(`\n📋 Found ${lenses.length} active lens products:\n`);
    
    lenses.forEach((lens, idx) => {
      console.log(`${idx + 1}. ${lens.itCode} - ${lens.name}`);
      console.log(`   BrandLine: "${lens.brandLine}"`);
      console.log(`   YOPO Eligible: ${lens.yopoEligible}`);
      console.log(`   Price: ₹${lens.baseOfferPrice}`);
      console.log('');
    });
    
    // Check which lenses match YOPO rule requirements
    console.log('\n🔍 Lenses matching YOPO rule requirements:');
    console.log('   Required brandLines: DIGI360_ADVANCED, DRIVEXPERT, BLUEXPERT');
    console.log('   Required yopoEligible: true\n');
    
    const matchingLenses = lenses.filter(lens => 
      (lens.brandLine === 'DIGI360_ADVANCED' || 
       lens.brandLine === 'DRIVEXPERT' || 
       lens.brandLine === 'BLUEXPERT') &&
      lens.yopoEligible === true
    );
    
    if (matchingLenses.length === 0) {
      console.log('❌ NO LENSES MATCH YOPO RULE REQUIREMENTS!');
      console.log('\nThis is why YOPO offer is not being applied.');
      console.log('\n💡 Solution:');
      console.log('   1. Update lens products to have correct brandLine (DIGI360_ADVANCED, DRIVEXPERT, or BLUEXPERT)');
      console.log('   2. Set yopoEligible = true for those lenses');
    } else {
      console.log(`✅ Found ${matchingLenses.length} matching lenses:`);
      matchingLenses.forEach((lens, idx) => {
        console.log(`   ${idx + 1}. ${lens.itCode} - ${lens.name}`);
      });
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkLensProduct();

