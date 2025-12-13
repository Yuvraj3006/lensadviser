import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testBenefitMappings() {
  try {
    console.log('=== Testing Benefit Mappings ===\n');

    // 1. Check total AnswerBenefit records
    const totalMappings = await prisma.answerBenefit.count({});
    console.log(`1. Total AnswerBenefit records in database: ${totalMappings}\n`);

    if (totalMappings === 0) {
      console.log('❌ No AnswerBenefit records found in database!');
      console.log('   This means benefits were never mapped to answer options.\n');
      return;
    }

    // 2. Get sample AnswerBenefit records
    const sampleMappings = await prisma.answerBenefit.findMany({
      take: 10,
      include: {
        answer: {
          include: {
            question: {
              select: {
                id: true,
                key: true,
                textEn: true,
                organizationId: true,
              },
            },
          },
        },
        benefit: {
          select: {
            id: true,
            code: true,
            name: true,
            organizationId: true,
          },
        },
      },
    });

    console.log(`2. Sample AnswerBenefit records (showing ${sampleMappings.length}):`);
    sampleMappings.forEach((mapping, index) => {
      console.log(`   ${index + 1}. Answer ID: ${mapping.answerId}`);
      console.log(`      Question: ${mapping.answer.question?.textEn || 'N/A'} (${mapping.answer.question?.key || 'N/A'})`);
      console.log(`      Answer Option: ${mapping.answer.textEn || 'N/A'} (${mapping.answer.key || 'N/A'})`);
      console.log(`      Benefit: ${mapping.benefit?.name || 'N/A'} (${mapping.benefit?.code || 'N/A'})`);
      console.log(`      Points: ${mapping.points}`);
      console.log(`      Question Org ID: ${mapping.answer.question?.organizationId || 'N/A'}`);
      console.log(`      Benefit Org ID: ${mapping.benefit?.organizationId || 'N/A'}`);
      console.log('');
    });

    // 3. Get all unique answerIds from AnswerBenefit
    const allAnswerBenefitIds = await prisma.answerBenefit.findMany({
      select: { answerId: true },
      distinct: ['answerId'],
    });
    const answerBenefitIdStrings = allAnswerBenefitIds.map((b: any) => b.answerId?.toString()).filter(Boolean);
    console.log(`3. Unique answerIds in AnswerBenefit table: ${answerBenefitIdStrings.length}\n`);

    // 4. Get all questions with their options
    const questions = await prisma.question.findMany({
      take: 5,
      include: {
        options: {
          take: 3,
        },
      },
    });

    console.log(`4. Sample Questions with Options (showing ${questions.length} questions):`);
    questions.forEach((q, qIndex) => {
      console.log(`   Question ${qIndex + 1}: ${q.textEn} (${q.key})`);
      console.log(`   Organization ID: ${q.organizationId}`);
      console.log(`   Options: ${q.options.length}`);
      q.options.forEach((opt, oIndex) => {
        const optIdString = opt.id.toString();
        const hasMapping = answerBenefitIdStrings.includes(optIdString);
        console.log(`     ${oIndex + 1}. ${opt.textEn || opt.key} (ID: ${optIdString}) - ${hasMapping ? '✅ HAS mappings' : '❌ NO mappings'}`);
      });
      console.log('');
    });

    // 5. Test the actual query used in the API
    const allOptionIds = questions.flatMap((q) => 
      q.options.map((opt) => opt.id.toString())
    );

    console.log(`5. Testing API query with ${allOptionIds.length} option IDs:`);
    const foundMappings = await prisma.answerBenefit.findMany({
      where: { answerId: { in: allOptionIds } },
      include: {
        answer: {
          select: {
            id: true,
            textEn: true,
            key: true,
          },
        },
      },
    });

    console.log(`   Found ${foundMappings.length} mappings for these options\n`);
    if (foundMappings.length > 0) {
      foundMappings.forEach((m, index) => {
        console.log(`   ${index + 1}. Answer: ${m.answer.textEn || m.answer.key} (ID: ${m.answerId})`);
      });
    } else {
      console.log('   ❌ No mappings found! This is the problem.\n');
      console.log('   Checking ID format mismatch...');
      console.log(`   Option IDs from questions: ${allOptionIds.slice(0, 3).join(', ')}`);
      console.log(`   Answer IDs from AnswerBenefit: ${answerBenefitIdStrings.slice(0, 3).join(', ')}`);
      
      // Check if IDs match when converted
      const matching = allOptionIds.filter((id) => answerBenefitIdStrings.includes(id));
      console.log(`   Matching IDs: ${matching.length}`);
    }

    // 6. Check organization-specific mappings
    if (questions.length > 0) {
      const orgId = questions[0].organizationId;
      console.log(`\n6. Checking mappings for organization: ${orgId}`);
      
      const orgMappings = await prisma.answerBenefit.findMany({
        where: {
          answer: {
            question: {
              organizationId: orgId,
            },
          },
        },
        include: {
          answer: {
            include: {
              question: {
                select: {
                  organizationId: true,
                },
              },
            },
          },
        },
        take: 5,
      });

      console.log(`   Found ${orgMappings.length} mappings for this organization\n`);
    }

  } catch (error) {
    console.error('Error testing benefit mappings:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testBenefitMappings();

