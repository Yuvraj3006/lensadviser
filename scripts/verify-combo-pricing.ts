/**
 * Quick Verification Script for Combo Pricing
 * Tests that combo pricing is correctly applied in offer engine
 */

import { PrismaClient } from '@prisma/client';
import { offerEngineService } from '../services/offer-engine.service';

const prisma = new PrismaClient();

async function verifyComboPricing() {
  console.log('🔍 Verifying Combo Pricing Logic\n');
  console.log('='.repeat(60));

  try {
    // Get active combo tier
    const comboTier = await prisma.comboTier.findFirst({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });

    if (!comboTier) {
      console.log('⚠️  No active combo tier found. Please create one in admin panel.');
      return;
    }

    console.log(`\n📦 Testing with Combo Tier: ${comboTier.displayName} (${comboTier.comboCode})`);
    console.log(`   Effective Price: ₹${comboTier.effectivePrice}\n`);

    const testFrameMRP = 5000;
    const testLensPrice = 3000;
    const baseTotal = testFrameMRP + testLensPrice;

    console.log('Test Input:');
    console.log(`   Frame MRP: ₹${testFrameMRP}`);
    console.log(`   Lens Price: ₹${testLensPrice}`);
    console.log(`   Base Total: ₹${baseTotal}\n`);

    // Test 1: COMBO Context - Should apply combo price
    console.log('🧪 Test 1: COMBO Context');
    const comboResult = await offerEngineService.calculateOffers({
      frame: {
        brand: 'Test Brand',
        mrp: testFrameMRP,
      },
      lens: {
        itCode: 'TEST001',
        price: testLensPrice,
        brandLine: 'Test Brand Line',
        yopoEligible: false,
      },
      organizationId: 'test-org-id',
      purchaseContext: 'COMBO',
      selectedComboCode: comboTier.comboCode,
    });

    console.log('   Results:');
    console.log(`   - Effective Base: ₹${comboResult.effectiveBase}`);
    console.log(`   - Final Payable: ₹${comboResult.finalPayable}`);
    console.log(`   - Offers Applied: ${comboResult.offersApplied.length}`);
    console.log(`   - Category Discount: ${comboResult.categoryDiscount ? '❌ Applied (ERROR!)' : '✅ None (Correct)'}`);
    console.log(`   - Coupon Discount: ${comboResult.couponDiscount ? '✅ Applied' : 'None'}`);

    if (comboResult.effectiveBase === comboTier.effectivePrice) {
      console.log('   ✅ PASS: Combo price correctly applied!');
    } else {
      console.log(`   ❌ FAIL: Expected ₹${comboTier.effectivePrice}, got ₹${comboResult.effectiveBase}`);
    }

    if (comboResult.categoryDiscount === null) {
      console.log('   ✅ PASS: Category discount correctly blocked!');
    } else {
      console.log('   ❌ FAIL: Category discount should be blocked in COMBO context!');
    }

    // Test 2: REGULAR Context - Should NOT apply combo price
    console.log('\n🧪 Test 2: REGULAR Context');
    const regularResult = await offerEngineService.calculateOffers({
      frame: {
        brand: 'Test Brand',
        mrp: testFrameMRP,
      },
      lens: {
        itCode: 'TEST001',
        price: testLensPrice,
        brandLine: 'Test Brand Line',
        yopoEligible: false,
      },
      organizationId: 'test-org-id',
      purchaseContext: 'REGULAR',
    });

    console.log('   Results:');
    console.log(`   - Effective Base: ₹${regularResult.effectiveBase}`);
    console.log(`   - Final Payable: ₹${regularResult.finalPayable}`);
    console.log(`   - Offers Applied: ${regularResult.offersApplied.length}`);

    if (regularResult.effectiveBase !== comboTier.effectivePrice) {
      console.log('   ✅ PASS: Combo price NOT applied in REGULAR context!');
    } else {
      console.log('   ❌ FAIL: Combo price should NOT be applied in REGULAR context!');
    }

    // Test 3: COMBO with Coupon
    console.log('\n🧪 Test 3: COMBO Context with Coupon (if available)');
    // This would require a test coupon, skipping for now
    console.log('   ⚠️  Skipping: Requires test coupon setup');

    console.log('\n' + '='.repeat(60));
    console.log('✅ Verification Complete!\n');

  } catch (error: any) {
    console.error('❌ Verification failed:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
  } finally {
    await prisma.$disconnect();
  }
}

verifyComboPricing()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });

