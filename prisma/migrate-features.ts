/**
 * Migration script to update existing Features with null codes
 * Run with: npx tsx prisma/migrate-features.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migrateFeatures() {
  try {
    console.log('🔄 Migrating Features...');
    
    // Find all features
    const allFeatures = await prisma.feature.findMany();
    
    // Filter features with null or missing codes
    const featuresWithoutCode = allFeatures.filter(f => !f.code || f.code.trim() === '');

    console.log(`Found ${featuresWithoutCode.length} features without codes`);

    // Delete features without codes (they're likely old/obsolete)
    if (featuresWithoutCode.length > 0) {
      const ids = featuresWithoutCode.map(f => f.id);
      await prisma.productFeature.deleteMany({
        where: { featureId: { in: ids } },
      });
      await prisma.featureBenefit.deleteMany({
        where: { featureId: { in: ids } },
      });
      await prisma.feature.deleteMany({
        where: { id: { in: ids } },
      });
      console.log(`✅ Deleted ${featuresWithoutCode.length} obsolete features`);
    }

    // Verify all remaining features have codes
    // Note: This check is skipped if code is nullable in schema
    const remainingFeatures = await prisma.feature.findMany({
      where: {
        code: null as any,
      },
    });

    if (remainingFeatures.length > 0) {
      console.warn(`⚠️  Warning: ${remainingFeatures.length} features still have null codes`);
      console.log('Features:', remainingFeatures.map(f => ({ id: f.id, name: f.name })));
    } else {
      console.log('✅ All features have valid codes');
    }

    console.log('✅ Migration complete!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

migrateFeatures();

