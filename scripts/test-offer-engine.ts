import { prisma } from '../lib/prisma';
import { OfferEngineService } from '../services/offer-engine.service';

const organizationId = '69361f30cc78e5f1bfc2cb18';

async function testOfferEngine() {
  try {
    console.log('🧪 Testing Offer Engine with actual data...\n');
    
    // Test data based on browser logs
    const frameInput = {
      brand: 'Lenstrack Eyeglasses', // From browser logs
      subCategory: 'ADVANCED', // From browser logs
      mrp: 3000, // From browser logs
      frameType: 'FULL_RIM' as 'FULL_RIM' | 'HALF_RIM' | 'RIMLESS',
    };
    
    // We need to find a lens product to test with
    // Let's find a lens with yopoEligible = true and itCode that might match YOPO rule
    const lensProduct = await prisma.lensProduct.findFirst({
      where: {
        isActive: true,
        yopoEligible: true,
        OR: [
          { itCode: { contains: 'DRIVEXPERT', mode: 'insensitive' } },
          { itCode: { contains: 'DIGI360', mode: 'insensitive' } },
          { itCode: { contains: 'BLUEXPERT', mode: 'insensitive' } },
        ],
      },
    });
    
    if (!lensProduct) {
      console.log('❌ No matching lens product found. Searching for any yopoEligible lens...');
      const anyLens = await prisma.lensProduct.findFirst({
        where: { 
          isActive: true,
          yopoEligible: true,
        },
        select: {
          itCode: true,
          name: true,
          brandLine: true,
          yopoEligible: true,
          baseOfferPrice: true,
        },
      });
      if (anyLens) {
        console.log(`Found lens: ${anyLens.itCode}, name: ${anyLens.name}, brandLine: ${anyLens.brandLine}, yopoEligible: ${anyLens.yopoEligible}`);
        // Use this lens for testing
        const testLens = anyLens;
        const lensInput = {
          itCode: testLens.itCode,
          price: testLens.baseOfferPrice || 4500,
          brandLine: testLens.brandLine || 'STANDARD',
          yopoEligible: testLens.yopoEligible || false,
          name: testLens.name || undefined,
        };
        
        console.log('\n📋 Test Input:');
        console.log('   Frame:', frameInput);
        console.log('   Lens:', lensInput);
        console.log('   Organization ID:', organizationId);
        console.log('\n');
        
        const offerEngine = new OfferEngineService();
        const result = await offerEngine.calculateOffers({
          frame: frameInput,
          lens: lensInput,
          prescription: null,
          customerCategory: null,
          couponCode: null,
          secondPair: null,
          organizationId,
          otherItems: undefined,
        });
        
        console.log('\n📊 Offer Engine Result:');
        console.log('   Offers Applied:', result.offersApplied.length);
        result.offersApplied.forEach((offer, idx) => {
          console.log(`   ${idx + 1}. ${offer.description} - Savings: ₹${offer.savings}`);
        });
        console.log('   Category Discount:', result.categoryDiscount ? `${result.categoryDiscount.description} - ₹${result.categoryDiscount.savings}` : 'None');
        console.log('   Base Total:', result.baseTotal);
        console.log('   Effective Base:', result.effectiveBase);
        console.log('   Final Payable:', result.finalPayable);
        console.log('   Price Components:', result.priceComponents?.length || 0);
        if (result.priceComponents && result.priceComponents.length > 0) {
          result.priceComponents.forEach((comp, idx) => {
            console.log(`     ${idx + 1}. ${comp.label}: ₹${comp.amount}`);
          });
        }
      }
      return;
    }
    
    console.log(`✅ Found lens product: ${lensProduct.itCode}`);
    console.log(`   BrandLine: ${lensProduct.brandLine}`);
    console.log(`   YOPO Eligible: ${lensProduct.yopoEligible}`);
    console.log(`   Base Offer Price: ${lensProduct.baseOfferPrice}\n`);
    
    const lensInput = {
      itCode: lensProduct.itCode,
      price: lensProduct.baseOfferPrice || 4500,
      brandLine: lensProduct.brandLine || 'STANDARD',
      yopoEligible: lensProduct.yopoEligible || false,
      name: lensProduct.name || undefined,
    };
    
    console.log('📋 Test Input:');
    console.log('   Frame:', frameInput);
    console.log('   Lens:', lensInput);
    console.log('   Organization ID:', organizationId);
    console.log('\n');
    
    const offerEngine = new OfferEngineService();
    const result = await offerEngine.calculateOffers({
      frame: frameInput,
      lens: lensInput,
      prescription: null,
      customerCategory: null,
      couponCode: null,
      secondPair: null,
      organizationId,
      otherItems: undefined,
    });
    
    console.log('\n📊 Offer Engine Result:');
    console.log('   Offers Applied:', result.offersApplied.length);
    result.offersApplied.forEach((offer, idx) => {
      console.log(`   ${idx + 1}. ${offer.description} - Savings: ₹${offer.savings}`);
    });
    console.log('   Category Discount:', result.categoryDiscount ? `${result.categoryDiscount.description} - ₹${result.categoryDiscount.savings}` : 'None');
    console.log('   Base Total:', result.baseTotal);
    console.log('   Effective Base:', result.effectiveBase);
    console.log('   Final Payable:', result.finalPayable);
    console.log('   Price Components:', result.priceComponents?.length || 0);
    if (result.priceComponents && result.priceComponents.length > 0) {
      result.priceComponents.forEach((comp, idx) => {
        console.log(`     ${idx + 1}. ${comp.label}: ₹${comp.amount}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error testing offer engine:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testOfferEngine();

