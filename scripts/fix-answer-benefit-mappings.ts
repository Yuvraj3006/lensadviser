/**
 * Fix AnswerBenefit Mappings
 * 
 * This script updates AnswerBenefit mappings to point to correct BenefitFeature IDs
 * based on benefit codes (since old Benefit IDs don't match new BenefitFeature IDs)
 * 
 * Run: npx tsx scripts/fix-answer-benefit-mappings.ts
 */

import { prisma } from '../lib/prisma';

async function fixAnswerBenefitMappings() {
  console.log('🔧 Fixing AnswerBenefit Mappings...');
  console.log('='.repeat(80));

  try {
    // Step 1: Get all AnswerBenefit mappings
    const answerBenefits = await (prisma.answerBenefit.findMany as any)({});
    console.log(`\n📋 Found ${answerBenefits.length} AnswerBenefit mappings`);

    if (answerBenefits.length === 0) {
      console.log('✅ No mappings to fix');
      return;
    }

    // Step 2: Get all unique benefitIds from AnswerBenefit
    const oldBenefitIds = [...new Set(answerBenefits.map((ab: any) => ab.benefitId))];
    console.log(`\n🔍 Found ${oldBenefitIds.length} unique benefit IDs in AnswerBenefit`);

    // Step 3: Check which ones exist in BenefitFeature
    const existingBenefits = await (prisma as any).benefitFeature.findMany({
      where: {
        id: { in: oldBenefitIds },
        type: 'BENEFIT',
      },
    });

    const existingIds = new Set(existingBenefits.map((b: any) => b.id));
    const missingIds = oldBenefitIds.filter(id => !existingIds.has(id));

    console.log(`\n✅ ${existingIds.size} benefit IDs exist in BenefitFeature`);
    console.log(`❌ ${missingIds.length} benefit IDs are missing`);

    if (missingIds.length === 0) {
      console.log('\n✅ All mappings are correct! No fixes needed.');
      return;
    }

    // Step 4: Try to find benefits by looking at old Benefit model (if it exists)
    // Or we need to map by code - but we don't have code in AnswerBenefit
    // So we need to check if there's a way to map old IDs to new IDs

    // Alternative approach: Get all organizations and their benefits
    const organizations = await prisma.organization.findMany({
      select: { id: true, name: true },
    });

    console.log(`\n🏢 Found ${organizations.length} organizations`);

    let fixedCount = 0;
    let skippedCount = 0;

    // For each organization, try to map benefits
    for (const org of organizations) {
      const orgBenefits = await (prisma as any).benefitFeature.findMany({
        where: {
          type: 'BENEFIT',
          organizationId: org.id,
          isActive: true,
        },
      });

      console.log(`\n📦 Organization: ${org.name} (${org.id})`);
      console.log(`   Has ${orgBenefits.length} benefits`);

      // Get AnswerOptions for this organization's questions
      const questions = await prisma.question.findMany({
        where: { organizationId: org.id },
        select: { id: true },
      });

      const questionIds = questions.map(q => q.id);
      const answerOptions = await prisma.answerOption.findMany({
        where: { questionId: { in: questionIds } },
        select: { id: true },
      });

      const answerOptionIds = answerOptions.map(ao => ao.id);

      // Get AnswerBenefit mappings for these answer options
      const orgAnswerBenefits = answerBenefits.filter((ab: any) =>
        answerOptionIds.includes(ab.answerId)
      );

      console.log(`   Has ${orgAnswerBenefits.length} AnswerBenefit mappings`);

      // For each mapping with missing benefitId, we need to find the correct one
      // But we can't map old ID to new ID without knowing the code
      // So we'll need to delete and recreate based on some logic
    }

    console.log('\n' + '='.repeat(80));
    console.log('⚠️  Manual Fix Required:');
    console.log('   AnswerBenefit mappings point to old Benefit IDs that no longer exist.');
    console.log('   You need to:');
    console.log('   1. Delete old AnswerBenefit mappings with missing benefitIds');
    console.log('   2. Recreate them with correct BenefitFeature IDs');
    console.log('   3. Or run a migration script that maps old IDs to new IDs by code');

    // Let's try a different approach: Check if we can find benefits by code
    // But AnswerBenefit doesn't have code, so we need to check AnswerOption -> Question -> Organization
    // and then find benefits for that organization

    console.log('\n💡 Attempting to fix by organization context...');

    for (const ab of answerBenefits) {
      if (existingIds.has(ab.benefitId)) {
        continue; // Already correct
      }

      // Get answer option
      const answerOption = await prisma.answerOption.findUnique({
        where: { id: ab.answerId },
        include: {
          question: true,
        },
      });

      if (!answerOption || !answerOption.question) {
        skippedCount++;
        continue;
      }

      const orgId = answerOption.question.organizationId;

      // Get all benefits for this organization
      const orgBenefits = await (prisma as any).benefitFeature.findMany({
        where: {
          type: 'BENEFIT',
          organizationId: orgId,
          isActive: true,
        },
      });

      if (orgBenefits.length === 0) {
        skippedCount++;
        continue;
      }

      // We can't determine which benefit to map to without more context
      // So we'll just log this for manual fixing
      console.log(`   ⚠️  AnswerBenefit ${ab.id}: answerId=${ab.answerId}, oldBenefitId=${ab.benefitId}, orgId=${orgId}`);
      console.log(`      Available benefits: ${orgBenefits.map((b: any) => b.code).join(', ')}`);
    }

    console.log('\n' + '='.repeat(80));
    console.log('📊 Summary:');
    console.log(`   Total mappings: ${answerBenefits.length}`);
    console.log(`   Correct mappings: ${existingIds.size}`);
    console.log(`   Needs fixing: ${missingIds.length}`);
    console.log(`   Skipped: ${skippedCount}`);

    console.log('\n💡 Recommendation:');
    console.log('   You need to manually recreate AnswerBenefit mappings in admin panel');
    console.log('   Or create a migration script that maps based on business logic');

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

fixAnswerBenefitMappings();

