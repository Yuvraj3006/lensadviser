import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testQuestionsAPI() {
  try {
    console.log('=== Testing Questions API Response ===\n');

    // Simulate the API logic
    const user = { organizationId: '69361f30cc78e5f1bfc2cb18' }; // From test script
    const category = 'EYEGLASSES';

    const where: any = {
      organizationId: user.organizationId,
      category: category,
    };

    // Fetch questions
    const questions = await prisma.question.findMany({
      where,
      include: {
        options: {
          orderBy: {
            order: 'asc',
          },
        },
      },
      orderBy: {
        order: 'asc',
      },
    });

    console.log(`Found ${questions.length} questions\n`);

    // Get all option IDs
    const allOptionIds = questions.flatMap((q: any) => 
      (q.options || []).map((opt: any) => {
        const id = opt.id || opt._id;
        return id ? id.toString() : null;
      }).filter((id: string | null) => id !== null)
    );

    console.log(`Total option IDs: ${allOptionIds.length}`);

    // Fetch benefit mappings
    const benefitMappings = allOptionIds.length > 0
      ? await prisma.answerBenefit.findMany({
          where: { answerId: { in: allOptionIds } },
        })
      : [];

    console.log(`Found ${benefitMappings.length} benefit mappings\n`);

    // Create map
    const benefitMappingsByAnswerId = new Map<string, any[]>();
    benefitMappings.forEach((bm: any) => {
      const answerId = bm.answerId ? bm.answerId.toString() : null;
      if (answerId) {
        if (!benefitMappingsByAnswerId.has(answerId)) {
          benefitMappingsByAnswerId.set(answerId, []);
        }
        benefitMappingsByAnswerId.get(answerId)!.push(bm);
      }
    });

    console.log(`Benefit mappings by answerId: ${benefitMappingsByAnswerId.size} unique answers\n`);

    // Fetch answer counts
    const questionIds = questions.map((q: any) => q.id?.toString()).filter(Boolean);
    const answerCounts = questionIds.length > 0
      ? await prisma.sessionAnswer.groupBy({
          by: ['questionId'],
          where: { 
            questionId: { in: questionIds },
          },
          _count: true,
        })
      : [];
    const answerCountMap = new Map(
      answerCounts.map((ac: any) => [ac.questionId.toString(), ac._count])
    );

    console.log(`Answer counts for ${answerCounts.length} questions\n`);

    // Format questions (simulate API response)
    const formattedQuestions = questions.map((q: any) => {
      const questionId = q.id?.toString() || '';
      const options = (q.options || []).map((opt: any) => {
        const optionId = opt.id ? String(opt.id) : '';
        const mappings = benefitMappingsByAnswerId.get(optionId) || [];
        return {
          id: optionId,
          key: opt.key,
          textEn: opt.textEn || opt.key,
          mappingCount: mappings.length,
        };
      });
      
      const questionMappingCount = options.reduce((count: number, opt: any) => {
        const optId = String(opt.id);
        if (!optId || optId === 'undefined' || optId === 'null') return count;
        const mappings = benefitMappingsByAnswerId.get(optId) || [];
        return count + mappings.length;
      }, 0);

      const finalQuestionId = q.id?.toString() || '';
      return {
        id: finalQuestionId,
        key: q.key,
        textEn: q.textEn,
        optionCount: options.length,
        answerCount: answerCountMap.get(finalQuestionId) || 0,
        mappingCount: questionMappingCount,
        options: options.map((opt: any) => ({
          id: opt.id,
          textEn: opt.textEn,
          mappingCount: opt.mappingCount,
        })),
      };
    });

    // Display results
    console.log('=== Results ===\n');
    formattedQuestions.forEach((q, index) => {
      console.log(`${index + 1}. Question: ${q.textEn}`);
      console.log(`   Key: ${q.key}`);
      console.log(`   Options: ${q.optionCount}`);
      console.log(`   Mappings: ${q.mappingCount}`);
      console.log(`   Answered: ${q.answerCount}`);
      if (q.mappingCount > 0) {
        console.log(`   Options with mappings:`);
        q.options.forEach((opt: any) => {
          if (opt.mappingCount > 0) {
            console.log(`     - ${opt.textEn}: ${opt.mappingCount} mappings`);
          }
        });
      }
      console.log('');
    });

    const totalMappings = formattedQuestions.reduce((sum, q) => sum + q.mappingCount, 0);
    const totalAnswered = formattedQuestions.reduce((sum, q) => sum + q.answerCount, 0);
    console.log(`Total mappings: ${totalMappings}`);
    console.log(`Total answered: ${totalAnswered}`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testQuestionsAPI();

