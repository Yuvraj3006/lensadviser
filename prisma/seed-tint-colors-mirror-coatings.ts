/**
 * Seed script for Tint Colors and Mirror Coatings
 * Run with: npx tsx prisma/seed-tint-colors-mirror-coatings.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const TINT_COLORS = [
  // Brown Tints
  { code: 'TINT_BROWN_50', name: 'Brown 50%', hexColor: '#d4a574', category: 'SOLID' as const, darknessPercent: 50, isPolarized: false, isMirror: false, displayOrder: 1 },
  { code: 'TINT_BROWN_75', name: 'Brown 75%', hexColor: '#b8864f', category: 'SOLID' as const, darknessPercent: 75, isPolarized: false, isMirror: false, displayOrder: 2 },
  { code: 'TINT_BROWN_85', name: 'Brown 85%', hexColor: '#8b6f3d', category: 'SOLID' as const, darknessPercent: 85, isPolarized: true, isMirror: false, displayOrder: 3 },
  
  // Grey Tints
  { code: 'TINT_GREY_50', name: 'Grey 50%', hexColor: '#a0a0a0', category: 'SOLID' as const, darknessPercent: 50, isPolarized: false, isMirror: false, displayOrder: 4 },
  { code: 'TINT_GREY_75', name: 'Grey 75%', hexColor: '#707070', category: 'SOLID' as const, darknessPercent: 75, isPolarized: false, isMirror: false, displayOrder: 5 },
  { code: 'TINT_GREY_80', name: 'Grey 80%', hexColor: '#5a5a5a', category: 'SOLID' as const, darknessPercent: 80, isPolarized: true, isMirror: false, displayOrder: 6 },
  
  // Green Tints
  { code: 'TINT_GREEN_70', name: 'Green 70%', hexColor: '#6b8e6b', category: 'SOLID' as const, darknessPercent: 70, isPolarized: false, isMirror: false, displayOrder: 7 },
  
  // Gradient Tints
  { code: 'TINT_GRADIENT_BROWN', name: 'Gradient Brown', hexColor: '#d4a574', category: 'GRADIENT' as const, darknessPercent: 75, isPolarized: false, isMirror: false, displayOrder: 8 },
  { code: 'TINT_GRADIENT_GREY', name: 'Gradient Grey', hexColor: '#a0a0a0', category: 'GRADIENT' as const, darknessPercent: 75, isPolarized: false, isMirror: false, displayOrder: 9 },
  
  // Fashion Tints
  { code: 'TINT_BLUE_FASHION', name: 'Blue Fashion', hexColor: '#4a90e2', category: 'FASHION' as const, darknessPercent: 60, isPolarized: false, isMirror: false, displayOrder: 10 },
  { code: 'TINT_PURPLE_FASHION', name: 'Purple Fashion', hexColor: '#9b59b6', category: 'FASHION' as const, darknessPercent: 60, isPolarized: false, isMirror: false, displayOrder: 11 },
  
  // Polarized Tints
  { code: 'TINT_POLARIZED_BROWN', name: 'Polarized Brown', hexColor: '#8b6f3d', category: 'POLARIZED' as const, darknessPercent: 85, isPolarized: true, isMirror: false, displayOrder: 12 },
  { code: 'TINT_POLARIZED_GREY', name: 'Polarized Grey', hexColor: '#5a5a5a', category: 'POLARIZED' as const, darknessPercent: 80, isPolarized: true, isMirror: false, displayOrder: 13 },
  
  // Photochromic Tints
  { code: 'TINT_PHOTOCHROMIC_CLEAR', name: 'Photochromic Clear', hexColor: '#ffffff', category: 'PHOTOCHROMIC' as const, darknessPercent: 0, isPolarized: false, isMirror: false, displayOrder: 14 },
  { code: 'TINT_PHOTOCHROMIC_BROWN', name: 'Photochromic Brown', hexColor: '#d4a574', category: 'PHOTOCHROMIC' as const, darknessPercent: 50, isPolarized: false, isMirror: false, displayOrder: 15 },
];

const MIRROR_COATINGS = [
  { code: 'MIRROR_BLUE', name: 'Blue Mirror', addOnPrice: 500, displayOrder: 1 },
  { code: 'MIRROR_GOLD', name: 'Gold Mirror', addOnPrice: 600, displayOrder: 2 },
  { code: 'MIRROR_SILVER', name: 'Silver Mirror', addOnPrice: 500, displayOrder: 3 },
  { code: 'MIRROR_GREEN', name: 'Green Mirror', addOnPrice: 550, displayOrder: 4 },
  { code: 'MIRROR_PURPLE', name: 'Purple Mirror', addOnPrice: 600, displayOrder: 5 },
  { code: 'MIRROR_ROSE', name: 'Rose Mirror', addOnPrice: 550, displayOrder: 6 },
];

async function seedTintColors() {
  console.log('🌱 Seeding Tint Colors...');
  
  for (const color of TINT_COLORS) {
    await prisma.tintColor.upsert({
      where: { code: color.code },
      update: {
        name: color.name,
        hexColor: color.hexColor,
        category: color.category,
        darknessPercent: color.darknessPercent,
        isPolarized: color.isPolarized,
        isMirror: color.isMirror,
        displayOrder: color.displayOrder,
        basePrice: 0, // Default base price (can be updated via admin)
        isActive: true,
      },
      create: {
        ...color,
        basePrice: 0, // Default base price (can be updated via admin)
        isActive: true,
      },
    });
    console.log(`  ✅ ${color.code} - ${color.name}`);
  }
  
  console.log('✅ Tint Colors seeded successfully!\n');
}

async function seedMirrorCoatings() {
  console.log('🌱 Seeding Mirror Coatings...');
  
  for (const coating of MIRROR_COATINGS) {
    await prisma.mirrorCoating.upsert({
      where: { code: coating.code },
      update: {
        name: coating.name,
        addOnPrice: coating.addOnPrice,
        displayOrder: coating.displayOrder,
        isActive: true,
      },
      create: {
        ...coating,
        isActive: true,
      },
    });
    console.log(`  ✅ ${coating.code} - ${coating.name} (+₹${coating.addOnPrice})`);
  }
  
  console.log('✅ Mirror Coatings seeded successfully!\n');
}

async function main() {
  try {
    await seedTintColors();
    await seedMirrorCoatings();
    
    console.log('🎉 All seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error seeding data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();

