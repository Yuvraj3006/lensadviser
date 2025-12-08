/**
 * Seed script for Features (F01-F11) and Benefits (B01-B12)
 * Run with: npx tsx prisma/seed-features-benefits.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const FEATURES = [
  { code: 'F01', name: 'Crack Smudge & Scratch Resistant', category: 'DURABILITY', displayOrder: 1 },
  { code: 'F02', name: 'Anti-Reflection', category: 'COATING', displayOrder: 2 },
  { code: 'F03', name: 'Screen Protection (All Day)', category: 'PROTECTION', displayOrder: 3 },
  { code: 'F04', name: 'Dust Repellent', category: 'COATING', displayOrder: 4 },
  { code: 'F05', name: 'UV 400 + Sun Protection', category: 'PROTECTION', displayOrder: 5 },
  { code: 'F06', name: 'Hydrophobic & Oleophobic', category: 'COATING', displayOrder: 6 },
  { code: 'F07', name: 'Driving Protection', category: 'LIFESTYLE', displayOrder: 7 },
  { code: 'F08', name: '360° Digital Lifestyle', category: 'LIFESTYLE', displayOrder: 8 },
  { code: 'F09', name: 'Selfie Friendly', category: 'LIFESTYLE', displayOrder: 9 },
  { code: 'F10', name: '2.5× More Durable Coating', category: 'DURABILITY', displayOrder: 10 },
  { code: 'F11', name: 'Natural Color Perception', category: 'VISION', displayOrder: 11 },
];

const BENEFITS = [
  { code: 'B01', name: 'Digital Screen Protection', description: 'Protection from blue light and digital eye strain' },
  { code: 'B02', name: 'Driving Comfort', description: 'Enhanced vision and comfort while driving' },
  { code: 'B03', name: 'UV & Sun Protection', description: 'Protection from harmful UV rays and sun glare' },
  { code: 'B04', name: 'Anti-Fatigue Relief', description: 'Reduces eye fatigue during extended screen use' },
  { code: 'B05', name: 'Durability & Scratch Resist', description: 'Long-lasting lenses resistant to scratches' },
  { code: 'B06', name: 'Water & Dust Repellent', description: 'Easy to clean, repels water and dust' },
  { code: 'B07', name: 'Crystal Clear Vision', description: 'Sharp, clear vision with minimal distortion' },
  { code: 'B08', name: 'Photochromic / Light Adaptive', description: 'Automatically adjusts to light conditions' },
  { code: 'B09', name: 'Myopia Control', description: 'Helps slow down myopia progression' },
  { code: 'B10', name: 'Reading / Near Comfort', description: 'Comfortable vision for reading and close work' },
  { code: 'B11', name: 'All Distance Vision', description: 'Clear vision at all distances' },
  { code: 'B12', name: 'Natural Color Accuracy', description: 'True-to-life color perception' },
];

async function seedFeatures() {
  console.log('🌱 Seeding Features (F01-F11)...');
  
  for (const feature of FEATURES) {
    await prisma.feature.upsert({
      where: { code: feature.code },
      update: {
        name: feature.name,
        category: feature.category,
        displayOrder: feature.displayOrder,
        isActive: true,
      },
      create: {
        code: feature.code,
        name: feature.name,
        category: feature.category,
        displayOrder: feature.displayOrder,
        isActive: true,
      },
    });
    console.log(`  ✅ ${feature.code} - ${feature.name}`);
  }
  
  console.log('✅ Features seeded successfully!\n');
}

async function seedBenefits(organizationId: string) {
  console.log('🌱 Seeding Benefits (B01-B12)...');
  
  for (const benefit of BENEFITS) {
    // Check if benefit exists for this organization
    const existing = await prisma.benefit.findFirst({
      where: {
        organizationId,
        code: benefit.code,
      },
    });

    if (existing) {
      await prisma.benefit.update({
        where: { id: existing.id },
        data: {
          name: benefit.name,
          description: benefit.description,
          isActive: true,
          maxScore: 3.0,
          pointWeight: 1.0,
        },
      });
      console.log(`  ✅ Updated ${benefit.code} - ${benefit.name}`);
    } else {
      await prisma.benefit.create({
        data: {
          code: benefit.code,
          name: benefit.name,
          description: benefit.description,
          organizationId,
          isActive: true,
          maxScore: 3.0,
          pointWeight: 1.0,
        },
      });
      console.log(`  ✅ Created ${benefit.code} - ${benefit.name}`);
    }
  }
  
  console.log('✅ Benefits seeded successfully!\n');
}

async function main() {
  try {
    // Get first organization (or create a default one)
    let organization = await prisma.organization.findFirst();
    
    if (!organization) {
      console.log('⚠️  No organization found. Please create an organization first.');
      console.log('   Features will be seeded (they are global), but Benefits require an organization.');
      await seedFeatures();
      return;
    }

    console.log(`📦 Seeding for organization: ${organization.name || organization.id}\n`);
    
    await seedFeatures();
    await seedBenefits(organization.id);
    
    console.log('🎉 All seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error seeding data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();

