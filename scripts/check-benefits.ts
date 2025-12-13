/**
 * Check Benefits for a Session
 * 
 * Run: npx tsx scripts/check-benefits.ts <sessionId>
 */

import { prisma } from '../lib/prisma';

async function checkBenefits(sessionId: string) {
  console.log('🔍 Checking Benefits for Session:', sessionId);
  console.log('='.repeat(80));

  try {
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      console.error('❌ Session not found');
      return;
    }

    const store = await prisma.store.findUnique({
      where: { id: session.storeId },
    });

    if (!store) {
      console.error('❌ Store not found');
      return;
    }

    console.log('Store OrganizationId:', store.organizationId);

    // Get session answers
    const answers = await prisma.sessionAnswer.findMany({
      where: { sessionId },
    });

    const optionIds = answers.map(a => a.optionId);
    console.log('\nAnswer Option IDs:', optionIds);

    // Get AnswerBenefit mappings
    const answerBenefits = await (prisma.answerBenefit.findMany as any)({
      where: { answerId: { in: optionIds } },
    });

    console.log('\nAnswerBenefit Mappings:', answerBenefits.length);
    const benefitIds = [...new Set(answerBenefits.map((ab: any) => ab.benefitId))];
    console.log('Benefit IDs from AnswerBenefit:', benefitIds);

    // Check if benefits exist WITHOUT organizationId filter
    const allBenefits = await (prisma as any).benefitFeature.findMany({
      where: {
        id: { in: benefitIds },
        type: 'BENEFIT',
      },
    });

    console.log('\n✅ Benefits found (without org filter):', allBenefits.length);
    allBenefits.forEach((b: any) => {
      console.log(`   - ${b.code}: ${b.name} (orgId: ${b.organizationId || 'null'})`);
    });

    // Check with organizationId filter
    const orgBenefits = await (prisma as any).benefitFeature.findMany({
      where: {
        id: { in: benefitIds },
        type: 'BENEFIT',
        organizationId: store.organizationId,
      },
    });

    console.log('\n✅ Benefits found (with org filter):', orgBenefits.length);
    orgBenefits.forEach((b: any) => {
      console.log(`   - ${b.code}: ${b.name}`);
    });

    if (allBenefits.length > 0 && orgBenefits.length === 0) {
      console.log('\n❌ ISSUE FOUND: Benefits exist but with different organizationId!');
      console.log('   Solution: Update benefits to have correct organizationId, or update AnswerBenefit mappings');
    }

    // Check all benefits for this organization
    const orgAllBenefits = await (prisma as any).benefitFeature.findMany({
      where: {
        type: 'BENEFIT',
        organizationId: store.organizationId,
        isActive: true,
      },
    });

    console.log('\n📋 All Benefits for Organization:', orgAllBenefits.length);
    orgAllBenefits.forEach((b: any) => {
      console.log(`   - ${b.code}: ${b.name} (id: ${b.id})`);
    });

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

const sessionId = process.argv[2];
if (!sessionId) {
  console.error('Usage: npx tsx scripts/check-benefits.ts <sessionId>');
  process.exit(1);
}

checkBenefits(sessionId);

