/**
 * Migrate AnswerBenefit Mappings from old Benefit IDs to new BenefitFeature IDs
 * 
 * This script:
 * 1. Finds all AnswerBenefit mappings with old Benefit IDs
 * 2. Maps old Benefit IDs to new BenefitFeature IDs by matching code and organizationId
 * 3. Updates AnswerBenefit mappings to use new BenefitFeature IDs
 * 
 * Run: npx tsx scripts/migrate-answer-benefit-to-benefitfeature.ts
 */

import { prisma } from '../lib/prisma';

async function migrateAnswerBenefitMappings() {
  console.log('🚀 Migrating AnswerBenefit Mappings to BenefitFeature IDs...');
  console.log('='.repeat(80));

  try {
    // Step 1: Get all AnswerBenefit mappings
    const answerBenefits = await (prisma.answerBenefit.findMany as any)({});
    console.log(`\n📋 Found ${answerBenefits.length} AnswerBenefit mappings`);

    if (answerBenefits.length === 0) {
      console.log('✅ No mappings to migrate');
      return;
    }

    // Step 2: Get all unique benefitIds from AnswerBenefit
    const benefitIds = [...new Set(answerBenefits.map((ab: any) => ab.benefitId))];
    console.log(`\n🔍 Found ${benefitIds.length} unique benefit IDs`);

    // Step 3: Check which ones already exist in BenefitFeature (already migrated)
    const existingInBenefitFeature = await (prisma as any).benefitFeature.findMany({
      where: {
        id: { in: benefitIds },
        type: 'BENEFIT',
      },
    });

    const existingIds = new Set(existingInBenefitFeature.map((b: any) => b.id));
    const needsMigration = benefitIds.filter(id => !existingIds.has(id));

    console.log(`\n✅ ${existingIds.size} benefit IDs already in BenefitFeature (no migration needed)`);
    console.log(`❌ ${needsMigration.length} benefit IDs need migration`);

    if (needsMigration.length === 0) {
      console.log('\n✅ All mappings are already migrated!');
      return;
    }

    // Step 4: Get old Benefit records to get their codes
    const oldBenefits = await prisma.benefit.findMany({
      where: {
        id: { in: needsMigration as string[] },
      },
    });

    console.log(`\n📦 Found ${oldBenefits.length} old Benefit records`);

    if (oldBenefits.length === 0) {
      console.error('\n❌ ERROR: Old Benefit records not found!');
      console.log('   The old Benefit records may have been deleted.');
      console.log('   You need to manually recreate AnswerBenefit mappings.');
      return;
    }

    // Step 5: Create mapping from old Benefit ID to new BenefitFeature ID
    const idMapping = new Map<string, string>(); // old Benefit.id -> new BenefitFeature.id

    for (const oldBenefit of oldBenefits) {
      // Find corresponding BenefitFeature by code and organizationId
      const newBenefit = await (prisma as any).benefitFeature.findFirst({
        where: {
          type: 'BENEFIT',
          code: oldBenefit.code,
          organizationId: oldBenefit.organizationId,
        },
      });

      if (newBenefit) {
        idMapping.set(oldBenefit.id, newBenefit.id);
        console.log(`   ✅ Mapped: ${oldBenefit.code} (${oldBenefit.id} -> ${newBenefit.id})`);
      } else {
        console.warn(`   ⚠️  No BenefitFeature found for: ${oldBenefit.code} (org: ${oldBenefit.organizationId})`);
      }
    }

    console.log(`\n📊 Created ${idMapping.size} ID mappings`);

    if (idMapping.size === 0) {
      console.error('\n❌ ERROR: No mappings could be created!');
      console.log('   Check if BenefitFeature records exist for the old Benefit codes.');
      return;
    }

    // Step 6: Update AnswerBenefit mappings
    console.log('\n🔄 Updating AnswerBenefit mappings...');
    let updatedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const ab of answerBenefits) {
      const newBenefitId = idMapping.get(ab.benefitId);

      if (!newBenefitId) {
        // Already correct or no mapping found
        if (existingIds.has(ab.benefitId)) {
          skippedCount++;
          continue; // Already using BenefitFeature ID
        } else {
          errorCount++;
          console.warn(`   ⚠️  No mapping found for benefitId: ${ab.benefitId}`);
          continue;
        }
      }

      if (ab.benefitId === newBenefitId) {
        skippedCount++;
        continue; // Already correct
      }

      try {
        // Update the mapping
        await (prisma.answerBenefit.update as any)({
          where: { id: ab.id },
          data: { benefitId: newBenefitId },
        });
        updatedCount++;
      } catch (error: any) {
        // Check if it's a unique constraint violation (duplicate mapping)
        if (error.code === 'P2002' || error.message?.includes('unique')) {
          console.warn(`   ⚠️  Duplicate mapping for answerId: ${ab.answerId}, benefitId: ${newBenefitId}`);
          // Delete the duplicate
          try {
            await (prisma.answerBenefit.delete as any)({
              where: { id: ab.id },
            });
            console.log(`   🗑️  Deleted duplicate mapping: ${ab.id}`);
            updatedCount++;
          } catch (deleteError: any) {
            errorCount++;
            console.error(`   ❌ Error deleting duplicate: ${deleteError.message}`);
          }
        } else {
          errorCount++;
          console.error(`   ❌ Error updating ${ab.id}: ${error.message}`);
        }
      }
    }

    // Step 7: Summary
    console.log('\n' + '='.repeat(80));
    console.log('📊 Migration Summary:');
    console.log(`   Total mappings: ${answerBenefits.length}`);
    console.log(`   ✅ Updated: ${updatedCount}`);
    console.log(`   ⏭️  Skipped (already correct): ${skippedCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);

    if (updatedCount > 0) {
      console.log('\n✅ Migration completed successfully!');
      console.log(`   ${updatedCount} AnswerBenefit mappings updated to use BenefitFeature IDs`);
    }

    if (errorCount > 0) {
      console.log('\n⚠️  Some mappings could not be updated. Check the errors above.');
    }

    // Step 8: Verify migration
    console.log('\n🔍 Verifying migration...');
    const verifyAnswerBenefits = await (prisma.answerBenefit.findMany as any)({});
    const verifyBenefitIds = [...new Set(verifyAnswerBenefits.map((ab: any) => ab.benefitId))];
    const verifyInBenefitFeature = await (prisma as any).benefitFeature.findMany({
      where: {
        id: { in: verifyBenefitIds },
        type: 'BENEFIT',
      },
    });

    const verifyExistingIds = new Set(verifyInBenefitFeature.map((b: any) => b.id));
    const verifyNeedsMigration = verifyBenefitIds.filter(id => !verifyExistingIds.has(id));

    console.log(`   Total mappings: ${verifyAnswerBenefits.length}`);
    console.log(`   ✅ Using BenefitFeature IDs: ${verifyExistingIds.size}`);
    console.log(`   ❌ Still using old IDs: ${verifyNeedsMigration.length}`);

    if (verifyNeedsMigration.length === 0) {
      console.log('\n✅ Verification passed! All mappings are using BenefitFeature IDs.');
    } else {
      console.log('\n⚠️  Some mappings still need migration:');
      verifyNeedsMigration.forEach(id => {
        console.log(`   - ${id}`);
      });
    }

  } catch (error: any) {
    console.error('\n❌ Migration failed:', error.message);
    console.error(error.stack);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run migration
migrateAnswerBenefitMappings()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

