import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testAPIResponse() {
  try {
    console.log('=== Testing API Response Format ===\n');

    // Simulate the exact API logic
    const user = { organizationId: '69361f30cc78e5f1bfc2cb18' };
    const category = 'EYEGLASSES';

    const where: any = {
      organizationId: user.organizationId,
      category: category,
    };

    // Fetch questions (same as API)
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

    // Fetch benefits
    const benefitIds = [...new Set(benefitMappings.map((bm: any) => bm.benefitId))];
    const benefits = benefitIds.length > 0
      ? await prisma.benefit.findMany({
          where: { id: { in: benefitIds } },
        })
      : [];
    const benefitMap = new Map(benefits.map((b: any) => [b.id.toString(), b]));

    // Format questions (exact API logic)
    const formattedQuestions = questions.map((q: any) => {
      const questionId = q.id?.toString() || q._id?.toString() || '';
      const options = (q.options || []).map((opt: any) => {
        const optionId = opt.id ? String(opt.id) : '';
        const mappings = benefitMappingsByAnswerId.get(optionId) || [];
        const benefitMapping: Record<string, number> = {};
        
        mappings.forEach((bm: any) => {
          const benefit = benefitMap.get(bm.benefitId.toString());
          if (benefit) {
            benefitMapping[benefit.code] = bm.points || 0;
          }
        });

        return {
          id: optionId,
          key: opt.key,
          textEn: opt.textEn || opt.key,
          benefitMapping: benefitMapping,
        };
      });
      
      const questionMappingCount = options.reduce((count: number, opt: any) => {
        const optId = String(opt.id);
        if (!optId || optId === 'undefined' || optId === 'null') return count;
        const mappings = benefitMappingsByAnswerId.get(optId) || [];
        return count + mappings.length;
      }, 0);

      const finalQuestionId = q.id?.toString() || q._id?.toString() || '';
      return {
        id: finalQuestionId,
        key: q.key,
        textEn: q.textEn,
        optionCount: options.length,
        answerCount: answerCountMap.get(finalQuestionId) || 0,
        mappingCount: questionMappingCount,
      };
    });

    // Display results
    console.log('=== API Response Format (First 10 Questions) ===\n');
    formattedQuestions.slice(0, 10).forEach((q, index) => {
      console.log(`${index + 1}. ${q.textEn}`);
      console.log(`   ID: ${q.id}`);
      console.log(`   Key: ${q.key}`);
      console.log(`   Options: ${q.optionCount}`);
      console.log(`   Mappings: ${q.mappingCount} ✅`);
      console.log(`   Answered: ${q.answerCount} ✅`);
      console.log('');
    });

    const totalMappings = formattedQuestions.reduce((sum, q) => sum + q.mappingCount, 0);
    const totalAnswered = formattedQuestions.reduce((sum, q) => sum + q.answerCount, 0);
    const questionsWithMappings = formattedQuestions.filter(q => q.mappingCount > 0).length;
    const questionsWithAnswers = formattedQuestions.filter(q => q.answerCount > 0).length;

    console.log('=== Summary ===');
    console.log(`Total questions: ${formattedQuestions.length}`);
    console.log(`Questions with mappings: ${questionsWithMappings}`);
    console.log(`Questions with answers: ${questionsWithAnswers}`);
    console.log(`Total mappings: ${totalMappings}`);
    console.log(`Total answered: ${totalAnswered}`);

    // Verify the response structure
    console.log('\n=== Response Structure Verification ===');
    const sampleResponse = {
      success: true,
      data: formattedQuestions.slice(0, 3).map(q => ({
        id: q.id,
        key: q.key,
        textEn: q.textEn,
        optionCount: q.optionCount,
        mappingCount: q.mappingCount,
        answerCount: q.answerCount,
      })),
    };
    console.log(JSON.stringify(sampleResponse, null, 2));

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testAPIResponse();

