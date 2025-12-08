import {
  PrismaClient,
  UserRole,
  OfferType,
  DiscountType,
  CustomerCategory,
} from '@prisma/client';

type ProductCategory = 'EYEGLASSES' | 'SUNGLASSES' | 'CONTACT_LENSES' | 'ACCESSORIES';
const ProductCategory = {
  EYEGLASSES: 'EYEGLASSES' as ProductCategory,
  SUNGLASSES: 'SUNGLASSES' as ProductCategory,
  CONTACT_LENSES: 'CONTACT_LENSES' as ProductCategory,
  ACCESSORIES: 'ACCESSORIES' as ProductCategory,
};

type OfferCondition = 'MIN_PURCHASE' | 'MATCH_SCORE' | 'FIRST_PURCHASE' | 'BRAND_SPECIFIC' | 'CATEGORY' | 'NO_CONDITION';
const OfferCondition = {
  MIN_PURCHASE: 'MIN_PURCHASE' as OfferCondition,
  MATCH_SCORE: 'MATCH_SCORE' as OfferCondition,
  FIRST_PURCHASE: 'FIRST_PURCHASE' as OfferCondition,
  BRAND_SPECIFIC: 'BRAND_SPECIFIC' as OfferCondition,
  CATEGORY: 'CATEGORY' as OfferCondition,
  NO_CONDITION: 'NO_CONDITION' as OfferCondition,
};

type OfferRuleType = 'YOPO' | 'COMBO_PRICE' | 'FREE_LENS' | 'PERCENT_OFF' | 'FLAT_OFF' | 'BOGO_50';
const OfferRuleType = {
  YOPO: 'YOPO' as OfferRuleType,
  COMBO_PRICE: 'COMBO_PRICE' as OfferRuleType,
  FREE_LENS: 'FREE_LENS' as OfferRuleType,
  PERCENT_OFF: 'PERCENT_OFF' as OfferRuleType,
  FLAT_OFF: 'FLAT_OFF' as OfferRuleType,
  BOGO_50: 'BOGO_50' as OfferRuleType,
};
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // Clean existing data
  await prisma.sessionRecommendation.deleteMany();
  await prisma.sessionAnswer.deleteMany();
  await prisma.session.deleteMany();
  await prisma.featureMapping.deleteMany();
  await prisma.answerOption.deleteMany();
  await prisma.question.deleteMany();
  await prisma.storeProduct.deleteMany();
  await prisma.productFeature.deleteMany();
  await prisma.product.deleteMany();
  await prisma.feature.deleteMany();
  await prisma.offerApplicationLog.deleteMany();
  await prisma.coupon.deleteMany();
  await prisma.categoryDiscount.deleteMany();
  await prisma.offerRule.deleteMany();
  await prisma.offer.deleteMany();
  await prisma.user.deleteMany();
  await prisma.store.deleteMany();
  await prisma.organization.deleteMany();

  console.log('✅ Cleaned existing data');

  // Create Organization with baseLensPrice
  const org = await prisma.organization.create({
    data: {
      name: 'LensTrack Demo',
      code: 'DEMO-ORG',
      settings: {},
      baseLensPrice: 500, // Base lens price ₹500
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });
  console.log(`✅ Created organization: ${org.name} (Base Lens: ₹${org.baseLensPrice})`);

  // Create Stores
  const mainStore = await prisma.store.create({
    data: {
      organizationId: org.id,
      code: 'MAIN-001',
      name: 'Main Store - Mumbai',
      address: '123 MG Road, Andheri',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400001',
      phone: '+91-9876543210',
      email: 'main@lenstrack.com',
      gstNumber: '27XXXXX1234X1Z5',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });

  const branchStore = await prisma.store.create({
    data: {
      organizationId: org.id,
      code: 'BRANCH-001',
      name: 'Branch Store - Pune',
      address: '456 FC Road',
      city: 'Pune',
      state: 'Maharashtra',
      pincode: '411001',
      phone: '+91-9876543211',
      email: 'pune@lenstrack.com',
      gstNumber: '27XXXXX1234X1Z6',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });
  console.log(`✅ Created stores: ${mainStore.name}, ${branchStore.name}`);

  // Create Users
  const hashedPassword = await bcrypt.hash('admin123', 10);

  await prisma.user.create({
    data: {
      organizationId: org.id,
      email: 'superadmin@lenstrack.com',
      passwordHash: hashedPassword,
      name: 'Super Admin',
      role: UserRole.SUPER_ADMIN,
      employeeId: 'EMP-SA-001',
      phone: '+91-9999999999',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });

  await prisma.user.create({
    data: {
      organizationId: org.id,
      email: 'admin@lenstrack.com',
      passwordHash: hashedPassword,
      name: 'Admin User',
      role: UserRole.ADMIN,
      employeeId: 'EMP-AD-001',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });

  await prisma.user.create({
    data: {
      organizationId: org.id,
      storeId: mainStore.id,
      email: 'manager@lenstrack.com',
      passwordHash: hashedPassword,
      name: 'Store Manager',
      role: UserRole.STORE_MANAGER,
      employeeId: 'EMP-SM-001',
      phone: '+91-9876543220',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });

  const salesExec = await prisma.user.create({
    data: {
      organizationId: org.id,
      storeId: mainStore.id,
      email: 'sales@lenstrack.com',
      passwordHash: hashedPassword,
      name: 'Sales Executive',
      role: UserRole.SALES_EXECUTIVE,
      employeeId: 'EMP-SE-001',
      phone: '+91-9876543230',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });
  console.log(`✅ Created users: Super Admin, Admin, Manager, Sales`);

  // ============================================
  // CREATE FEATURES WITH PRICES (DYNAMIC!)
  // ============================================
  const blueLightFilter = await prisma.feature.create({
    data: {
      organizationId: org.id,
      key: 'blue_light_filter',
      name: 'Blue Light Filter',
      description: 'Blocks harmful blue light from screens',
      category: ProductCategory.EYEGLASSES,
      price: 800, // ₹800 for this feature
      isActive: true,
    },
  });

  const antiScratch = await prisma.feature.create({
    data: {
      organizationId: org.id,
      key: 'anti_scratch',
      name: 'Anti-Scratch Coating',
      description: 'Protects lenses from scratches',
      category: ProductCategory.EYEGLASSES,
      price: 400, // ₹400
      isActive: true,
    },
  });

  const antiGlare = await prisma.feature.create({
    data: {
      organizationId: org.id,
      key: 'anti_glare',
      name: 'Anti-Glare Coating',
      description: 'Reduces reflections and glare',
      category: ProductCategory.EYEGLASSES,
      price: 600, // ₹600
      isActive: true,
    },
  });

  const progressive = await prisma.feature.create({
    data: {
      organizationId: org.id,
      key: 'progressive_lens',
      name: 'Progressive Lens',
      description: 'Multifocal lens for all distances',
      category: ProductCategory.EYEGLASSES,
      price: 2500, // ₹2500 - premium feature
      isActive: true,
    },
  });

  const uvProtection = await prisma.feature.create({
    data: {
      organizationId: org.id,
      key: 'uv_protection',
      name: 'UV Protection',
      description: '100% UV protection',
      category: ProductCategory.EYEGLASSES,
      price: 300, // ₹300
      isActive: true,
    },
  });

  const photochromic = await prisma.feature.create({
    data: {
      organizationId: org.id,
      key: 'photochromic',
      name: 'Photochromic Lens',
      description: 'Auto-darkening in sunlight',
      category: ProductCategory.EYEGLASSES,
      price: 1500, // ₹1500
      isActive: true,
    },
  });

  const highIndex = await prisma.feature.create({
    data: {
      organizationId: org.id,
      key: 'high_index',
      name: 'High Index Lens',
      description: 'Thinner and lighter lenses for high power',
      category: ProductCategory.EYEGLASSES,
      price: 1200, // ₹1200
      isActive: true,
    },
  });

  console.log(`✅ Created features with prices:`);
  console.log(`   - Blue Light Filter: ₹${blueLightFilter.price}`);
  console.log(`   - Anti-Scratch: ₹${antiScratch.price}`);
  console.log(`   - Anti-Glare: ₹${antiGlare.price}`);
  console.log(`   - Progressive: ₹${progressive.price}`);
  console.log(`   - UV Protection: ₹${uvProtection.price}`);
  console.log(`   - Photochromic: ₹${photochromic.price}`);
  console.log(`   - High Index: ₹${highIndex.price}`);

  // ============================================
  // CREATE OFFERS (DYNAMIC FROM DATABASE!)
  // ============================================
  const offers = await prisma.offer.createMany({
    data: [
      // Percentage based offers
      {
        organizationId: org.id,
        code: 'COMBO15',
        title: '🎁 Frame + Lens Combo',
        description: '15% off when you buy frame + lens together',
        type: OfferType.PERCENT_OFF,
        discountValue: 15,
        conditionType: OfferCondition.MIN_PURCHASE,
        conditionValue: 3000,
        maxDiscount: 1500,
        priority: BigInt(10),
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        validFrom: new Date(),
      },
      {
        organizationId: org.id,
        code: 'PERFECT10',
        title: '🌟 Perfect Match Discount',
        description: '10% off on lenses with 80%+ match score',
        type: OfferType.PERCENT_OFF,
        discountValue: 10,
        conditionType: OfferCondition.MATCH_SCORE,
        conditionValue: 80,
        maxDiscount: 1000,
        priority: BigInt(8),
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        validFrom: new Date(),
      },
      {
        organizationId: org.id,
        code: 'PREMIUM20',
        title: '👑 Premium Purchase Reward',
        description: '20% off on orders above ₹8000',
        type: OfferType.PERCENT_OFF,
        discountValue: 20,
        conditionType: OfferCondition.MIN_PURCHASE,
        conditionValue: 8000,
        maxDiscount: 2500,
        priority: BigInt(15),
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        validFrom: new Date(),
      },
      {
        organizationId: org.id,
        code: 'LENSTRACK25',
        title: '⭐ LensTrack Brand Special',
        description: '25% off on all LensTrack branded products',
        type: OfferType.PERCENT_OFF,
        discountValue: 25,
        conditionType: OfferCondition.BRAND_SPECIFIC,
        conditionBrand: 'LensTrack',
        maxDiscount: 2000,
        priority: BigInt(12),
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        validFrom: new Date(),
      },
      // Flat amount offers
      {
        organizationId: org.id,
        code: 'FIRST500',
        title: '🎉 First Purchase Bonus',
        description: 'Flat ₹500 off for first-time customers',
        type: OfferType.FLAT_OFF,
        discountValue: 500,
        conditionType: OfferCondition.FIRST_PURCHASE,
        conditionValue: 1500, // Minimum purchase
        priority: BigInt(5),
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        validFrom: new Date(),
      },
      {
        organizationId: org.id,
        code: 'FLAT300',
        title: '💰 Quick Discount',
        description: 'Flat ₹300 off on any purchase',
        type: OfferType.FLAT_OFF,
        discountValue: 300,
        conditionType: OfferCondition.MIN_PURCHASE,
        conditionValue: 2000,
        priority: BigInt(3),
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        validFrom: new Date(),
      },
      // Freebie offers
      {
        organizationId: org.id,
        code: 'FREECASE',
        title: '🎁 Free Premium Case',
        description: 'Free premium case + cleaning cloth worth ₹499',
        type: OfferType.BONUS_FREE_PRODUCT,
        discountValue: 499, // Value of freebie
        conditionType: OfferCondition.MIN_PURCHASE,
        conditionValue: 2500,
        priority: BigInt(2),
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        validFrom: new Date(),
      },
      {
        organizationId: org.id,
        code: 'FREECHECKUP',
        title: '👁️ Free Eye Checkup',
        description: 'Complimentary eye checkup worth ₹299',
        type: OfferType.BONUS_FREE_PRODUCT,
        discountValue: 299,
        conditionType: OfferCondition.NO_CONDITION,
        priority: BigInt(1),
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        validFrom: new Date(),
      },
      // Category specific
      {
        organizationId: org.id,
        code: 'EYEGLASS10',
        title: '👓 Eyeglasses Special',
        description: '10% off on all eyeglasses',
        type: OfferType.PERCENT_OFF,
        discountValue: 10,
        conditionType: OfferCondition.CATEGORY,
        conditionCategory: ProductCategory.EYEGLASSES,
        maxDiscount: 800,
        priority: BigInt(6),
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        validFrom: new Date(),
      },
    ],
  });

  console.log(`✅ Created ${offers.count} offers in database`);

  // ============================================
  // CREATE OFFER RULES (New Offer Engine)
  // ============================================
  const offerRules = await prisma.offerRule.createMany({
    data: [
      // YOPO Rules
      {
        organizationId: org.id,
        code: 'LENSTRACK_ADVANCED_YOPO',
        offerType: OfferType.YOPO,
        frameBrands: ['LENSTRACK'],
        frameSubCategories: ['ADVANCED'],
        minFrameMRP: 2000,
        lensBrandLines: ['DIGI360_ADVANCED', 'DRIVEXPERT', 'BLUEXPERT'],
        config: {
          discountType: 'YOPO_LOGIC',
          discountValue: 0,
        },
        priority: 10,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        organizationId: org.id,
        code: 'LENSTRACK_ESSENTIAL_YOPO',
        offerType: OfferType.YOPO,
        frameBrands: ['LENSTRACK'],
        frameSubCategories: ['ESSENTIAL'],
        minFrameMRP: 1000,
        lensBrandLines: ['DIGI360_ESSENTIAL', 'STANDARD'],
        config: {
          discountType: 'YOPO_LOGIC',
          discountValue: 0,
        },
        priority: 15,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      // Combo Price Rules
      {
        organizationId: org.id,
        code: 'RAYBAN_PREMIUM_COMBO',
        offerType: OfferType.COMBO_PRICE,
        frameBrands: ['RAYBAN'],
        minFrameMRP: 5000,
        lensBrandLines: ['PREMIUM'],
        config: {
          discountType: 'COMBO_PRICE',
          discountValue: 0,
          comboPrice: 6000,
        },
        priority: 5,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      // Free Lens Rules
      {
        organizationId: org.id,
        code: 'FREE_LENS_PROMO',
        offerType: OfferType.FREE_LENS,
        frameBrands: ['LENSTRACK'],
        minFrameMRP: 3000,
        lensBrandLines: ['STANDARD'],
        config: {
          discountType: 'FREE_ITEM',
          discountValue: 0,
        },
        priority: 8,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      // Percentage Discount Rules
      {
        organizationId: org.id,
        code: 'RAYBAN_10_FRAME',
        offerType: OfferType.PERCENT_OFF,
        frameBrands: ['RAYBAN'],
        lensBrandLines: [],
        config: {
          discountType: DiscountType.PERCENTAGE,
          discountValue: 10,
        },
        priority: 20,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      // Flat Discount Rules
      {
        organizationId: org.id,
        code: 'FLAT_500_OFF',
        offerType: OfferType.FLAT_OFF,
        minFrameMRP: 2000,
        lensBrandLines: [],
        config: {
          discountType: DiscountType.FLAT_AMOUNT,
          discountValue: 500,
        },
        priority: 25,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      // Second Pair Rule
      {
        organizationId: org.id,
        code: 'BOGO_50_SECOND_PAIR',
        offerType: OfferType.BOG50,
        lensBrandLines: [],
        config: {
          discountType: DiscountType.PERCENTAGE,
          discountValue: 0,
          isSecondPairRule: true,
          secondPairPercent: 50,
        },
        priority: 3,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
  });

  console.log(`✅ Created ${offerRules.count} offer rules`);

  // ============================================
  // CREATE CATEGORY DISCOUNTS
  // ============================================
  const categoryDiscounts = await prisma.categoryDiscount.createMany({
    data: [
      {
        organizationId: org.id,
        customerCategory: CustomerCategory.STUDENT,
        brandCode: '*',
        discountPercent: 10,
        maxDiscount: 500,
        isActive: true,
      },
      {
        organizationId: org.id,
        customerCategory: CustomerCategory.DOCTOR,
        brandCode: '*',
        discountPercent: 15,
        maxDiscount: 1000,
        isActive: true,
      },
      {
        organizationId: org.id,
        customerCategory: CustomerCategory.TEACHER,
        brandCode: '*',
        discountPercent: 12,
        maxDiscount: 600,
        isActive: true,
      },
      {
        organizationId: org.id,
        customerCategory: CustomerCategory.SENIOR_CITIZEN,
        brandCode: '*',
        discountPercent: 10,
        maxDiscount: 500,
        isActive: true,
      },
      {
        organizationId: org.id,
        customerCategory: CustomerCategory.ARMED_FORCES,
        brandCode: '*',
        discountPercent: 20,
        maxDiscount: 1500,
        isActive: true,
      },
      {
        organizationId: org.id,
        customerCategory: CustomerCategory.STUDENT,
        brandCode: 'LENSTRACK',
        discountPercent: 15,
        maxDiscount: 750,
        isActive: true,
      },
    ],
  });

  console.log(`✅ Created ${categoryDiscounts.count} category discounts`);

  // ============================================
  // CREATE COUPONS
  // ============================================
  const coupons = await prisma.coupon.createMany({
    data: [
      {
        organizationId: org.id,
        code: 'WELCOME10',
        discountType: DiscountType.PERCENTAGE,
        discountValue: 10,
        maxDiscount: 500,
        minCartValue: 2000,
        isActive: true,
      },
      {
        organizationId: org.id,
        code: 'FESTIVE500',
        discountType: DiscountType.FLAT_AMOUNT,
        discountValue: 500,
        minCartValue: 3000,
        isActive: true,
      },
      {
        organizationId: org.id,
        code: 'SAVE15',
        discountType: DiscountType.PERCENTAGE,
        discountValue: 15,
        maxDiscount: 1500,
        minCartValue: 5000,
        isActive: true,
      },
      {
        organizationId: org.id,
        code: 'FLAT200',
        discountType: DiscountType.FLAT_AMOUNT,
        discountValue: 200,
        minCartValue: null,
        isActive: true,
      },
    ],
  });

  console.log(`✅ Created ${coupons.count} coupons`);

  // ============================================
  // CREATE PRODUCTS (Frame prices)
  // ============================================
  const product1 = await prisma.product.create({
    data: {
      organizationId: org.id,
      sku: 'EG-CLASSIC-001',
      name: 'Classic Blue Light Filter Glasses',
      description: 'Perfect for computer users - lightweight titanium frame',
      category: ProductCategory.EYEGLASSES,
      brand: 'LENSTRACK',
      basePrice: 2499.00, // Frame price only
      imageUrl: '', // Placeholder - frontend will show emoji fallback
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });

  const product2 = await prisma.product.create({
    data: {
      organizationId: org.id,
      sku: 'EG-PREMIUM-001',
      name: 'Premium Anti-Glare Eyeglasses',
      description: 'Professional grade - premium acetate frame',
      category: ProductCategory.EYEGLASSES,
      brand: 'LENSTRACK',
      basePrice: 4999.00, // Frame price
      imageUrl: '', // Placeholder - frontend will show emoji fallback
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });

  const product3 = await prisma.product.create({
    data: {
      organizationId: org.id,
      sku: 'EG-PROGRESSIVE-001',
      name: 'Progressive Multifocal Frame',
      description: 'Designer frame for progressive lenses - titanium alloy',
      category: ProductCategory.EYEGLASSES,
      brand: 'LENSTRACK',
      basePrice: 6999.00, // Premium frame
      imageUrl: '', // Placeholder - frontend will show emoji fallback
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });

  const product4 = await prisma.product.create({
    data: {
      organizationId: org.id,
      sku: 'EG-BUDGET-001',
      name: 'Budget Everyday Frame',
      description: 'Affordable daily wear frame',
      category: ProductCategory.EYEGLASSES,
      brand: 'LENSTRACK',
      basePrice: 1299.00, // Budget frame
      imageUrl: '', // Placeholder - frontend will show emoji fallback
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });

  console.log(`✅ Created products (Frames):`);
  console.log(`   - Classic: ₹${product1.basePrice}`);
  console.log(`   - Premium: ₹${product2.basePrice}`);
  console.log(`   - Progressive Frame: ₹${product3.basePrice}`);
  console.log(`   - Budget: ₹${product4.basePrice}`);

  // Create Product Features (which features each frame supports)
  await prisma.productFeature.createMany({
    data: [
      // Classic - supports basic features
      { productId: product1.id, featureId: blueLightFilter.id, strength: 1.0 },
      { productId: product1.id, featureId: antiScratch.id, strength: 1.0 },
      { productId: product1.id, featureId: uvProtection.id, strength: 1.0 },

      // Premium - supports more features with better quality
      { productId: product2.id, featureId: antiGlare.id, strength: 1.0 },
      { productId: product2.id, featureId: antiScratch.id, strength: 1.0 },
      { productId: product2.id, featureId: blueLightFilter.id, strength: 1.0 },
      { productId: product2.id, featureId: uvProtection.id, strength: 1.0 },
      { productId: product2.id, featureId: photochromic.id, strength: 1.0 },

      // Progressive frame - full feature support
      { productId: product3.id, featureId: progressive.id, strength: 1.0 },
      { productId: product3.id, featureId: antiGlare.id, strength: 1.0 },
      { productId: product3.id, featureId: antiScratch.id, strength: 1.0 },
      { productId: product3.id, featureId: uvProtection.id, strength: 1.0 },
      { productId: product3.id, featureId: highIndex.id, strength: 1.0 },

      // Budget - basic features only
      { productId: product4.id, featureId: antiScratch.id, strength: 1.0 },
      { productId: product4.id, featureId: uvProtection.id, strength: 1.0 },
    ],
  });
  console.log(`✅ Created product features`);

  // Create Store Products with stock
  await prisma.storeProduct.createMany({
    data: [
      { storeId: mainStore.id, productId: product1.id, stockQuantity: BigInt(50), isAvailable: true, createdAt: new Date(), updatedAt: new Date() },
      { storeId: mainStore.id, productId: product2.id, stockQuantity: BigInt(30), priceOverride: 4799.00, isAvailable: true, createdAt: new Date(), updatedAt: new Date() },
      { storeId: mainStore.id, productId: product3.id, stockQuantity: BigInt(15), isAvailable: true, createdAt: new Date(), updatedAt: new Date() },
      { storeId: mainStore.id, productId: product4.id, stockQuantity: BigInt(100), priceOverride: 1199.00, isAvailable: true, createdAt: new Date(), updatedAt: new Date() },

      { storeId: branchStore.id, productId: product1.id, stockQuantity: BigInt(25), isAvailable: true, createdAt: new Date(), updatedAt: new Date() },
      { storeId: branchStore.id, productId: product2.id, stockQuantity: BigInt(20), isAvailable: true, createdAt: new Date(), updatedAt: new Date() },
      { storeId: branchStore.id, productId: product3.id, stockQuantity: BigInt(5), isAvailable: true, createdAt: new Date(), updatedAt: new Date() },
      { storeId: branchStore.id, productId: product4.id, stockQuantity: BigInt(0), isAvailable: false, createdAt: new Date(), updatedAt: new Date() },
    ],
  });
  console.log(`✅ Created store products with stock`);

  // ============================================
  // CREATE QUESTIONS
  // ============================================
  const q1 = await prisma.question.create({
    data: {
      organizationId: org.id,
      key: 'screen_time',
      textEn: 'How many hours do you spend on screens daily?',
      textHi: 'आप प्रतिदिन कितने घंटे स्क्रीन पर बिताते हैं?',
      textHiEn: 'Aap daily kitne ghante screen par bitaate hain?',
      category: ProductCategory.EYEGLASSES,
      order: 1,
      isRequired: true,
      allowMultiple: false,
      isActive: true,
    },
  });

  await prisma.answerOption.createMany({
    data: [
      { questionId: q1.id, key: '0-2hrs', textEn: '0-2 hours', textHi: '0-2 घंटे', textHiEn: '0-2 ghante', icon: '📱', order: 1 },
      { questionId: q1.id, key: '2-4hrs', textEn: '2-4 hours', textHi: '2-4 घंटे', textHiEn: '2-4 ghante', icon: '💻', order: 2 },
      { questionId: q1.id, key: '4-8hrs', textEn: '4-8 hours', textHi: '4-8 घंटे', textHiEn: '4-8 ghante', icon: '🖥️', order: 3 },
      { questionId: q1.id, key: '8-12hrs', textEn: '8-12 hours', textHi: '8-12 घंटे', textHiEn: '8-12 ghante', icon: '⌨️', order: 4 },
      { questionId: q1.id, key: '12hrs+', textEn: '12+ hours', textHi: '12+ घंटे', textHiEn: '12+ ghante', icon: '🖱️', order: 5 },
    ],
  });

  await prisma.featureMapping.createMany({
    data: [
      { questionId: q1.id, optionKey: '4-8hrs', featureId: blueLightFilter.id, weight: 1.2 },
      { questionId: q1.id, optionKey: '8-12hrs', featureId: blueLightFilter.id, weight: 1.8 },
      { questionId: q1.id, optionKey: '12hrs+', featureId: blueLightFilter.id, weight: 2.0 },
      { questionId: q1.id, optionKey: '8-12hrs', featureId: antiGlare.id, weight: 1.5 },
      { questionId: q1.id, optionKey: '12hrs+', featureId: antiGlare.id, weight: 1.8 },
    ],
  });

  const q2 = await prisma.question.create({
    data: {
      organizationId: org.id,
      key: 'work_environment',
      textEn: 'Where do you primarily work?',
      textHi: 'आप मुख्य रूप से कहाँ काम करते हैं?',
      textHiEn: 'Aap mukhya roop se kahan kaam karte hain?',
      category: ProductCategory.EYEGLASSES,
      order: 2,
      isRequired: true,
      allowMultiple: false,
      isActive: true,
    },
  });

  await prisma.answerOption.createMany({
    data: [
      { questionId: q2.id, key: 'indoor', textEn: 'Indoor (AC office)', textHi: 'इनडोर (एसी ऑफिस)', textHiEn: 'Indoor (AC office)', icon: '🏢', order: 1 },
      { questionId: q2.id, key: 'outdoor', textEn: 'Outdoor', textHi: 'आउटडोर', textHiEn: 'Outdoor', icon: '🌞', order: 2 },
      { questionId: q2.id, key: 'mixed', textEn: 'Mixed (Both)', textHi: 'मिश्रित (दोनों)', textHiEn: 'Mixed (dono)', icon: '🔄', order: 3 },
    ],
  });

  await prisma.featureMapping.createMany({
    data: [
      { questionId: q2.id, optionKey: 'outdoor', featureId: uvProtection.id, weight: 2.0 },
      { questionId: q2.id, optionKey: 'outdoor', featureId: photochromic.id, weight: 1.5 },
      { questionId: q2.id, optionKey: 'mixed', featureId: uvProtection.id, weight: 1.5 },
      { questionId: q2.id, optionKey: 'mixed', featureId: photochromic.id, weight: 1.0 },
      { questionId: q2.id, optionKey: 'indoor', featureId: blueLightFilter.id, weight: 1.3 },
    ],
  });

  const q3 = await prisma.question.create({
    data: {
      organizationId: org.id,
      key: 'age_group',
      textEn: 'What is your age?',
      textHi: 'आपकी उम्र क्या है?',
      textHiEn: 'Aapki age kya hai?',
      category: ProductCategory.EYEGLASSES,
      order: 3,
      isRequired: true,
      allowMultiple: false,
      isActive: true,
    },
  });

  await prisma.answerOption.createMany({
    data: [
      { questionId: q3.id, key: '18-30', textEn: '18-30 years', textHi: '18-30 वर्ष', textHiEn: '18-30 saal', icon: '👦', order: 1 },
      { questionId: q3.id, key: '31-40', textEn: '31-40 years', textHi: '31-40 वर्ष', textHiEn: '31-40 saal', icon: '👨', order: 2 },
      { questionId: q3.id, key: '41-50', textEn: '41-50 years', textHi: '41-50 वर्ष', textHiEn: '41-50 saal', icon: '👨‍🦳', order: 3 },
      { questionId: q3.id, key: '51+', textEn: '51+ years', textHi: '51+ वर्ष', textHiEn: '51+ saal', icon: '👴', order: 4 },
    ],
  });

  await prisma.featureMapping.createMany({
    data: [
      { questionId: q3.id, optionKey: '41-50', featureId: progressive.id, weight: 1.5 },
      { questionId: q3.id, optionKey: '51+', featureId: progressive.id, weight: 2.0 },
      { questionId: q3.id, optionKey: '51+', featureId: highIndex.id, weight: 1.5 },
    ],
  });

  console.log(`✅ Created questions with options and feature mappings`);

  // Create a sample session
  const session = await prisma.session.create({
    data: {
      storeId: mainStore.id,
      userId: salesExec.id,
      customerName: 'Rahul Sharma',
      customerPhone: '+91-9876543240',
      customerCategory: CustomerCategory.STUDENT,
      category: ProductCategory.EYEGLASSES,
      status: 'COMPLETED',
      startedAt: new Date(Date.now() - 3600000), // 1 hour ago
      completedAt: new Date(),
    },
  });

  const screenTimeOption = await prisma.answerOption.findFirst({
    where: { questionId: q1.id, key: '8-12hrs' },
  });

  const workEnvOption = await prisma.answerOption.findFirst({
    where: { questionId: q2.id, key: 'indoor' },
  });

  const ageOption = await prisma.answerOption.findFirst({
    where: { questionId: q3.id, key: '31-40' },
  });

  if (screenTimeOption && workEnvOption && ageOption) {
    await prisma.sessionAnswer.createMany({
      data: [
        { sessionId: session.id, questionId: q1.id, optionId: screenTimeOption.id, answeredAt: new Date() },
        { sessionId: session.id, questionId: q2.id, optionId: workEnvOption.id, answeredAt: new Date() },
        { sessionId: session.id, questionId: q3.id, optionId: ageOption.id, answeredAt: new Date() },
      ],
    });

    await prisma.sessionRecommendation.createMany({
      data: [
        { sessionId: session.id, productId: product2.id, matchScore: 95.5, rank: BigInt(1), isSelected: false, createdAt: new Date() },
        { sessionId: session.id, productId: product1.id, matchScore: 87.3, rank: BigInt(2), isSelected: false, createdAt: new Date() },
        { sessionId: session.id, productId: product3.id, matchScore: 65.8, rank: BigInt(3), isSelected: false, createdAt: new Date() },
      ],
    });
  }

  console.log(`✅ Created sample session`);

  console.log('\n🎉 Seed completed successfully!\n');
  console.log('============================================');
  console.log('📊 DATA SUMMARY:');
  console.log('============================================');
  console.log(`Organization: ${org.name}`);
  console.log(`Base Lens Price: ₹${org.baseLensPrice}`);
  console.log('');
  console.log('Features with Prices (from DB):');
  console.log(`  - Blue Light Filter: ₹800`);
  console.log(`  - Anti-Scratch: ₹400`);
  console.log(`  - Anti-Glare: ₹600`);
  console.log(`  - Progressive: ₹2500`);
  console.log(`  - UV Protection: ₹300`);
  console.log(`  - Photochromic: ₹1500`);
  console.log(`  - High Index: ₹1200`);
  console.log('');
  console.log('Offers (from DB):');
  console.log(`  - COMBO15: 15% off (min ₹3000)`);
  console.log(`  - PERFECT10: 10% off (80%+ match)`);
  console.log(`  - PREMIUM20: 20% off (min ₹8000)`);
  console.log(`  - LENSTRACK25: 25% off LensTrack brand`);
  console.log(`  - FIRST500: ₹500 flat off`);
  console.log(`  - FREECASE: Free case worth ₹499`);
  console.log('');
  console.log('Offer Rules (New Engine):');
  console.log(`  - LENSTRACK_ADVANCED_YOPO: YOPO for Advanced frames`);
  console.log(`  - RAYBAN_PREMIUM_COMBO: Combo price ₹6000`);
  console.log(`  - BOGO_50_SECOND_PAIR: 50% off second pair`);
  console.log('');
  console.log('Category Discounts:');
  console.log(`  - STUDENT: 10% off (max ₹500)`);
  console.log(`  - DOCTOR: 15% off (max ₹1000)`);
  console.log(`  - ARMED_FORCES: 20% off (max ₹1500)`);
  console.log('');
  console.log('Coupons:');
  console.log(`  - WELCOME10: 10% off (min ₹2000)`);
  console.log(`  - FESTIVE500: ₹500 flat off (min ₹3000)`);
  console.log(`  - SAVE15: 15% off (min ₹5000)`);
  console.log('');
  console.log('Login credentials:');
  console.log('-----------------------------------');
  console.log('Super Admin: superadmin@lenstrack.com / admin123');
  console.log('Admin:       admin@lenstrack.com / admin123');
  console.log('Manager:     manager@lenstrack.com / admin123');
  console.log('Sales:       sales@lenstrack.com / admin123');
  console.log('-----------------------------------\n');
}

main()
  .catch((e) => {
    console.error('❌ Error during seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
