/**
 * Seed script for Combo Tiers and Config
 * Run with: npx tsx scripts/seed-combo-data.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding combo data...');

  // 1. Create combo_offer_status config
  console.log('📝 Creating combo_offer_status config...');
  await prisma.config.upsert({
    where: { key: 'combo_offer_status' },
    update: { value: 'ON' },
    create: {
      key: 'combo_offer_status',
      value: 'ON',
    },
  });
  console.log('✅ combo_offer_status set to ON');

  // 2. Create Combo Tiers
  console.log('🎯 Creating combo tiers...');

  // Bronze Tier
  const bronze = await prisma.comboTier.upsert({
    where: { comboCode: 'BRONZE' },
    update: {
      displayName: 'Bronze',
      effectivePrice: 2999,
      isActive: true,
    },
    create: {
      comboCode: 'BRONZE',
      displayName: 'Bronze',
      effectivePrice: 2999,
      isActive: true,
    },
  });

  // Bronze Benefits
  await prisma.comboBenefit.deleteMany({
    where: { comboCode: bronze.id },
  });
  await prisma.comboBenefit.createMany({
    data: [
      {
        comboCode: bronze.id,
        benefitType: 'frame',
        label: 'Frame 1',
      },
      {
        comboCode: bronze.id,
        benefitType: 'lens',
        label: 'Lens 1',
      },
      {
        comboCode: bronze.id,
        benefitType: 'addon',
        label: 'Lens Cleaner',
      },
    ],
  });
  console.log('✅ Bronze tier created');

  // Silver Tier
  const silver = await prisma.comboTier.upsert({
    where: { comboCode: 'SILVER' },
    update: {
      displayName: 'Silver',
      effectivePrice: 4999,
      badge: 'MOST_POPULAR',
      isActive: true,
    },
    create: {
      comboCode: 'SILVER',
      displayName: 'Silver',
      effectivePrice: 4999,
      badge: 'MOST_POPULAR',
      isActive: true,
    },
  });

  // Silver Benefits
  await prisma.comboBenefit.deleteMany({
    where: { comboCode: silver.id },
  });
  await prisma.comboBenefit.createMany({
    data: [
      {
        comboCode: silver.id,
        benefitType: 'frame',
        label: 'Frame 1',
      },
      {
        comboCode: silver.id,
        benefitType: 'lens',
        label: 'Lens 1',
      },
      {
        comboCode: silver.id,
        benefitType: 'eyewear',
        label: '2nd Eyewear (Frame/Sun)',
      },
      {
        comboCode: silver.id,
        benefitType: 'lens',
        label: '2nd Lens',
      },
      {
        comboCode: silver.id,
        benefitType: 'addon',
        label: 'Lens Cleaner',
      },
    ],
  });
  console.log('✅ Silver tier created');

  // Gold Tier
  const gold = await prisma.comboTier.upsert({
    where: { comboCode: 'GOLD' },
    update: {
      displayName: 'Gold',
      effectivePrice: 7999,
      badge: 'BEST_VALUE',
      isActive: true,
    },
    create: {
      comboCode: 'GOLD',
      displayName: 'Gold',
      effectivePrice: 7999,
      badge: 'BEST_VALUE',
      isActive: true,
    },
  });

  // Gold Benefits
  await prisma.comboBenefit.deleteMany({
    where: { comboCode: gold.id },
  });
  await prisma.comboBenefit.createMany({
    data: [
      {
        comboCode: gold.id,
        benefitType: 'frame',
        label: 'Frame 1',
      },
      {
        comboCode: gold.id,
        benefitType: 'lens',
        label: 'Lens 1',
      },
      {
        comboCode: gold.id,
        benefitType: 'eyewear',
        label: '2nd Eyewear (Frame/Sun)',
      },
      {
        comboCode: gold.id,
        benefitType: 'lens',
        label: '2nd Lens',
      },
      {
        comboCode: gold.id,
        benefitType: 'addon',
        label: 'Lens Cleaner',
      },
      {
        comboCode: gold.id,
        benefitType: 'voucher',
        label: 'Voucher (Next Visit)',
        maxValue: 500,
      },
    ],
  });
  console.log('✅ Gold tier created');

  // Platinum Tier
  const platinum = await prisma.comboTier.upsert({
    where: { comboCode: 'PLATINUM' },
    update: {
      displayName: 'Platinum',
      effectivePrice: 12999,
      isActive: true,
    },
    create: {
      comboCode: 'PLATINUM',
      displayName: 'Platinum',
      effectivePrice: 12999,
      isActive: true,
    },
  });

  // Platinum Benefits
  await prisma.comboBenefit.deleteMany({
    where: { comboCode: platinum.id },
  });
  await prisma.comboBenefit.createMany({
    data: [
      {
        comboCode: platinum.id,
        benefitType: 'frame',
        label: 'Frame 1',
      },
      {
        comboCode: platinum.id,
        benefitType: 'lens',
        label: 'Lens 1',
      },
      {
        comboCode: platinum.id,
        benefitType: 'eyewear',
        label: '2nd Eyewear (Frame/Sun)',
      },
      {
        comboCode: platinum.id,
        benefitType: 'lens',
        label: '2nd Lens',
      },
      {
        comboCode: platinum.id,
        benefitType: 'addon',
        label: 'Lens Cleaner',
      },
      {
        comboCode: platinum.id,
        benefitType: 'voucher',
        label: 'Voucher (Next Visit)',
        maxValue: 1000,
      },
    ],
  });
  console.log('✅ Platinum tier created');

  console.log('🎉 Combo data seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding combo data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

