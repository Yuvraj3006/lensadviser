/**
 * Enable combo eligibility for sample brands and lens products
 * Run with: npx tsx scripts/enable-combo-eligibility.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔧 Enabling combo eligibility for sample products...');

  // Enable combo for all active frame brands (for testing)
  const frameBrands = await prisma.productBrand.findMany({
    where: {
      isActive: true,
      productTypes: { has: 'FRAME' },
    },
  });

  console.log(`📦 Found ${frameBrands.length} frame brands`);
  
  for (const brand of frameBrands) {
    await prisma.productBrand.update({
      where: { id: brand.id },
      data: { comboAllowed: true },
    });
    console.log(`✅ Enabled combo for frame brand: ${brand.name}`);
  }

  // Enable combo for all active lens brands
  const lensBrands = await prisma.lensBrand.findMany({
    where: { isActive: true },
  });

  console.log(`🔍 Found ${lensBrands.length} lens brands`);
  
  for (const brand of lensBrands) {
    await prisma.lensBrand.update({
      where: { id: brand.id },
      data: { comboAllowed: true },
    });
    console.log(`✅ Enabled combo for lens brand: ${brand.name}`);
  }

  // Enable combo for first 10 active lens products (for testing)
  const lensProducts = await prisma.lensProduct.findMany({
    where: { isActive: true },
    take: 10,
  });

  console.log(`👓 Found ${lensProducts.length} lens products to enable`);
  
  for (const lens of lensProducts) {
    await prisma.lensProduct.update({
      where: { id: lens.id },
      data: { comboAllowed: true },
    });
    console.log(`✅ Enabled combo for lens: ${lens.name} (${lens.itCode})`);
  }

  console.log('🎉 Combo eligibility enabled for sample products!');
  console.log('💡 Note: You can update specific brands/products via admin panel');
}

main()
  .catch((e) => {
    console.error('❌ Error enabling combo eligibility:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

