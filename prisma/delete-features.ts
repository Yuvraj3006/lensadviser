import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Feature codes to delete (F01-F11)
const featureCodes = ['F01', 'F02', 'F03', 'F04', 'F05', 'F06', 'F07', 'F08', 'F09', 'F10', 'F11'];

async function main() {
  console.log('🗑️  Starting feature deletion...');

  // Check if features exist
  const existingFeatures = await prisma.feature.findMany({
    where: {
      code: {
        in: featureCodes,
      },
    },
  });

  if (existingFeatures.length === 0) {
    console.log('⚠️  No features found to delete (F01-F11)');
    return;
  }

  console.log(`📝 Found ${existingFeatures.length} features to delete:`);
  existingFeatures.forEach(f => {
    console.log(`   - ${f.code}: ${f.name}`);
  });

  // Delete features
  // Note: This will also delete related ProductFeature records due to cascade
  const deleteResult = await prisma.feature.deleteMany({
    where: {
      code: {
        in: featureCodes,
      },
    },
  });

  console.log(`\n✅ Deleted ${deleteResult.count} features`);
  console.log('🎉 Feature deletion completed successfully!\n');
}

main()
  .catch((e) => {
    console.error('❌ Error during feature deletion:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

