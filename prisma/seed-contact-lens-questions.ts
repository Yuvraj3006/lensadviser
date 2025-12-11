/**
 * Seed script for Contact Lens Questionnaire Questions
 * Creates questions, answer options, and AnswerBenefit mappings
 * 
 * Run with: npx tsx prisma/seed-contact-lens-questions.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedContactLensQuestions() {
  console.log('🌱 Seeding Contact Lens Questions...\n');

  // Get first organization
  const org = await prisma.organization.findFirst();
  if (!org) {
    console.error('❌ No organization found. Please seed organizations first.');
    return;
  }

  // Get benefits (B01-B12) for mapping
  const benefits = await (prisma as any).benefitFeature.findMany({
    where: {
      type: 'BENEFIT',
      organizationId: org.id,
      isActive: true,
    },
  });

  const benefitMap = new Map<string, string>(benefits.map((b: any) => [b.code, b.id]));
  console.log(`Found ${benefits.length} benefits for mapping\n`);

  // Question 1: Wearing Time
  const q1 = await prisma.question.upsert({
    where: {
      organizationId_key: {
        organizationId: org.id,
        key: 'cl_wearing_time',
      },
    },
    update: {
      textEn: 'How often do you plan to wear contact lenses?',
      textHi: 'आप कितनी बार कॉन्टैक्ट लेंस पहनने की योजना बना रहे हैं?',
      textHiEn: 'Aap kitni baar contact lens pehenne ki yojna bana rahe hain?',
      category: 'CONTACT_LENSES',
      order: 1,
      isRequired: true,
      isActive: true,
    },
    create: {
      organizationId: org.id,
      key: 'cl_wearing_time',
      textEn: 'How often do you plan to wear contact lenses?',
      textHi: 'आप कितनी बार कॉन्टैक्ट लेंस पहनने की योजना बना रहे हैं?',
      textHiEn: 'Aap kitni baar contact lens pehenne ki yojna bana rahe hain?',
      category: 'CONTACT_LENSES',
      order: 1,
      isRequired: true,
      allowMultiple: false,
      isActive: true,
    },
  });

  // Answer options for Q1
  const q1Options = [
    { key: 'daily_8plus', textEn: 'Daily (8+ hours)', icon: '🌅', order: 1 },
    { key: 'daily_4to6', textEn: 'Daily (4–6 hours)', icon: '☀️', order: 2 },
    { key: 'occasional', textEn: 'Occasional (few times a week)', icon: '📅', order: 3 },
    { key: 'special_events', textEn: 'Only for special events', icon: '🎉', order: 4 },
  ];

  for (const opt of q1Options) {
    const answer = await prisma.answerOption.upsert({
      where: {
        questionId_key: {
          questionId: q1.id,
          key: opt.key,
        },
      },
      update: {
        textEn: opt.textEn,
        icon: opt.icon,
        order: opt.order,
      },
      create: {
        questionId: q1.id,
        key: opt.key,
        textEn: opt.textEn,
        icon: opt.icon,
        order: opt.order,
      },
    });

    // Create AnswerBenefit mappings
    if (opt.key === 'daily_8plus') {
      // Long wear = High oxygen (B02) + Comfort (B01)
      if (benefitMap.has('B02')) {
        await prisma.answerBenefit.upsert({
          where: {
            answerId_benefitId: {
              answerId: answer.id,
              benefitId: benefitMap.get('B02')!,
            },
          },
          update: { points: 3.0 },
          create: {
            answerId: answer.id,
            benefitId: benefitMap.get('B02')!,
            points: 3.0,
          },
        });
      }
      if (benefitMap.has('B01')) {
        await prisma.answerBenefit.upsert({
          where: {
            answerId_benefitId: {
              answerId: answer.id,
              benefitId: benefitMap.get('B01')!,
            },
          },
          update: { points: 2.5 },
          create: {
            answerId: answer.id,
            benefitId: benefitMap.get('B01')!,
            points: 2.5,
          },
        });
      }
    } else if (opt.key === 'daily_4to6') {
      if (benefitMap.has('B01')) {
        await prisma.answerBenefit.upsert({
          where: {
            answerId_benefitId: {
              answerId: answer.id,
              benefitId: benefitMap.get('B01')!,
            },
          },
          update: { points: 2.0 },
          create: {
            answerId: answer.id,
            benefitId: benefitMap.get('B01')!,
            points: 2.0,
          },
        });
      }
    }
  }

  console.log('✅ Question 1: Wearing Time');

  // Question 2: Dryness
  const q2 = await prisma.question.upsert({
    where: {
      organizationId_key: {
        organizationId: org.id,
        key: 'cl_dryness',
      },
    },
    update: {
      textEn: 'Do your eyes feel dry or sensitive?',
      textHi: 'क्या आपकी आँखें सूखी या संवेदनशील महसूस होती हैं?',
      textHiEn: 'Kya aapki aankhen sukhi ya sanvedansheel mehsoos hoti hain?',
      category: 'CONTACT_LENSES',
      order: 2,
      isRequired: true,
      isActive: true,
    },
    create: {
      organizationId: org.id,
      key: 'cl_dryness',
      textEn: 'Do your eyes feel dry or sensitive?',
      textHi: 'क्या आपकी आँखें सूखी या संवेदनशील महसूस होती हैं?',
      textHiEn: 'Kya aapki aankhen sukhi ya sanvedansheel mehsoos hoti hain?',
      category: 'CONTACT_LENSES',
      order: 2,
      isRequired: true,
      allowMultiple: false,
      isActive: true,
    },
  });

  const q2Options = [
    { key: 'very_often', textEn: 'Yes, very often', icon: '😣', order: 1 },
    { key: 'sometimes', textEn: 'Sometimes', icon: '😐', order: 2 },
    { key: 'no', textEn: 'No', icon: '😊', order: 3 },
  ];

  for (const opt of q2Options) {
    const answer = await prisma.answerOption.upsert({
      where: {
        questionId_key: {
          questionId: q2.id,
          key: opt.key,
        },
      },
      update: {
        textEn: opt.textEn,
        icon: opt.icon,
        order: opt.order,
      },
      create: {
        questionId: q2.id,
        key: opt.key,
        textEn: opt.textEn,
        icon: opt.icon,
        order: opt.order,
      },
    });

    if (opt.key === 'very_often') {
      // High oxygen (B02) is critical for dry eyes
      if (benefitMap.has('B02')) {
        await prisma.answerBenefit.upsert({
          where: {
            answerId_benefitId: {
              answerId: answer.id,
              benefitId: benefitMap.get('B02')!,
            },
          },
          update: { points: 3.0 },
          create: {
            answerId: answer.id,
            benefitId: benefitMap.get('B02')!,
            points: 3.0,
          },
        });
      }
      if (benefitMap.has('B01')) {
        await prisma.answerBenefit.upsert({
          where: {
            answerId_benefitId: {
              answerId: answer.id,
              benefitId: benefitMap.get('B01')!,
            },
          },
          update: { points: 2.5 },
          create: {
            answerId: answer.id,
            benefitId: benefitMap.get('B01')!,
            points: 2.5,
          },
        });
      }
    } else if (opt.key === 'sometimes') {
      if (benefitMap.has('B02')) {
        await prisma.answerBenefit.upsert({
          where: {
            answerId_benefitId: {
              answerId: answer.id,
              benefitId: benefitMap.get('B02')!,
            },
          },
          update: { points: 2.0 },
          create: {
            answerId: answer.id,
            benefitId: benefitMap.get('B02')!,
            points: 2.0,
          },
        });
      }
    }
  }

  console.log('✅ Question 2: Dryness');

  // Question 3: Priority
  const q3 = await prisma.question.upsert({
    where: {
      organizationId_key: {
        organizationId: org.id,
        key: 'cl_priority',
      },
    },
    update: {
      textEn: 'What is most important to you?',
      textHi: 'आपके लिए सबसे महत्वपूर्ण क्या है?',
      textHiEn: 'Aapke liye sabse mahatvapurn kya hai?',
      category: 'CONTACT_LENSES',
      order: 3,
      isRequired: true,
      isActive: true,
    },
    create: {
      organizationId: org.id,
      key: 'cl_priority',
      textEn: 'What is most important to you?',
      textHi: 'आपके लिए सबसे महत्वपूर्ण क्या है?',
      textHiEn: 'Aapke liye sabse mahatvapurn kya hai?',
      category: 'CONTACT_LENSES',
      order: 3,
      isRequired: true,
      allowMultiple: false,
      isActive: true,
    },
  });

  const q3Options = [
    { key: 'comfort', textEn: 'Maximum comfort', icon: '✨', order: 1 },
    { key: 'eye_health', textEn: 'Eye health & oxygen', icon: '💚', order: 2 },
    { key: 'budget', textEn: 'Budget friendly', icon: '💰', order: 3 },
    { key: 'brand', textEn: 'Best / trusted brand', icon: '⭐', order: 4 },
  ];

  for (const opt of q3Options) {
    const answer = await prisma.answerOption.upsert({
      where: {
        questionId_key: {
          questionId: q3.id,
          key: opt.key,
        },
      },
      update: {
        textEn: opt.textEn,
        icon: opt.icon,
        order: opt.order,
      },
      create: {
        questionId: q3.id,
        key: opt.key,
        textEn: opt.textEn,
        icon: opt.icon,
        order: opt.order,
      },
    });

    if (opt.key === 'comfort' && benefitMap.has('B01')) {
      await prisma.answerBenefit.upsert({
        where: {
          answerId_benefitId: {
            answerId: answer.id,
            benefitId: benefitMap.get('B01')!,
          },
        },
        update: { points: 3.0 },
        create: {
          answerId: answer.id,
          benefitId: benefitMap.get('B01')!,
          points: 3.0,
        },
      });
    } else if (opt.key === 'eye_health' && benefitMap.has('B02')) {
      await prisma.answerBenefit.upsert({
        where: {
          answerId_benefitId: {
            answerId: answer.id,
            benefitId: benefitMap.get('B02')!,
          },
        },
        update: { points: 3.0 },
        create: {
          answerId: answer.id,
          benefitId: benefitMap.get('B02')!,
          points: 3.0,
        },
      });
    } else if (opt.key === 'budget' && benefitMap.has('B01')) {
      await prisma.answerBenefit.upsert({
        where: {
          answerId_benefitId: {
            answerId: answer.id,
            benefitId: benefitMap.get('B01')!,
          },
        },
        update: { points: 1.5 },
        create: {
          answerId: answer.id,
          benefitId: benefitMap.get('B01')!,
          points: 1.5,
        },
      });
    }
  }

  console.log('✅ Question 3: Priority');

  // Question 4: Routine
  const q4 = await prisma.question.upsert({
    where: {
      organizationId_key: {
        organizationId: org.id,
        key: 'cl_routine',
      },
    },
    update: {
      textEn: 'Your typical routine?',
      textHi: 'आपकी सामान्य दिनचर्या?',
      textHiEn: 'Aapki samanya dincharya?',
      category: 'CONTACT_LENSES',
      order: 4,
      isRequired: true,
      isActive: true,
    },
    create: {
      organizationId: org.id,
      key: 'cl_routine',
      textEn: 'Your typical routine?',
      textHi: 'आपकी सामान्य दिनचर्या?',
      textHiEn: 'Aapki samanya dincharya?',
      category: 'CONTACT_LENSES',
      order: 4,
      isRequired: true,
      allowMultiple: false,
      isActive: true,
    },
  });

  const q4Options = [
    { key: 'office', textEn: 'Office / Computer', icon: '💻', order: 1 },
    { key: 'outdoor', textEn: 'Outdoor / Field work', icon: '🌳', order: 2 },
    { key: 'mixed', textEn: 'Mixed (indoor + outdoor)', icon: '🔄', order: 3 },
    { key: 'home', textEn: 'Mostly at home', icon: '🏠', order: 4 },
  ];

  for (const opt of q4Options) {
    const answer = await prisma.answerOption.upsert({
      where: {
        questionId_key: {
          questionId: q4.id,
          key: opt.key,
        },
      },
      update: {
        textEn: opt.textEn,
        icon: opt.icon,
        order: opt.order,
      },
      create: {
        questionId: q4.id,
        key: opt.key,
        textEn: opt.textEn,
        icon: opt.icon,
        order: opt.order,
      },
    });

    if (opt.key === 'office' && benefitMap.has('B04')) {
      // Digital/Anti-Fatigue
      await prisma.answerBenefit.upsert({
        where: {
          answerId_benefitId: {
            answerId: answer.id,
            benefitId: benefitMap.get('B04')!,
          },
        },
        update: { points: 2.5 },
        create: {
          answerId: answer.id,
          benefitId: benefitMap.get('B04')!,
          points: 2.5,
        },
      });
    } else if (opt.key === 'outdoor' && benefitMap.has('B03')) {
      // UV Protection
      await prisma.answerBenefit.upsert({
        where: {
          answerId_benefitId: {
            answerId: answer.id,
            benefitId: benefitMap.get('B03')!,
          },
        },
        update: { points: 3.0 },
        create: {
          answerId: answer.id,
          benefitId: benefitMap.get('B03')!,
          points: 3.0,
        },
      });
    } else if (opt.key === 'mixed') {
      if (benefitMap.has('B03')) {
        await prisma.answerBenefit.upsert({
          where: {
            answerId_benefitId: {
              answerId: answer.id,
              benefitId: benefitMap.get('B03')!,
            },
          },
          update: { points: 2.0 },
          create: {
            answerId: answer.id,
            benefitId: benefitMap.get('B03')!,
            points: 2.0,
          },
        });
      }
      if (benefitMap.has('B04')) {
        await prisma.answerBenefit.upsert({
          where: {
            answerId_benefitId: {
              answerId: answer.id,
              benefitId: benefitMap.get('B04')!,
            },
          },
          update: { points: 2.0 },
          create: {
            answerId: answer.id,
            benefitId: benefitMap.get('B04')!,
            points: 2.0,
          },
        });
      }
    }
  }

  console.log('✅ Question 4: Routine');

  // Question 5: Budget
  const q5 = await prisma.question.upsert({
    where: {
      organizationId_key: {
        organizationId: org.id,
        key: 'cl_budget',
      },
    },
    update: {
      textEn: 'Budget Preference',
      textHi: 'बजट वरीयता',
      textHiEn: 'Budget varitata',
      category: 'CONTACT_LENSES',
      order: 5,
      isRequired: true,
      isActive: true,
    },
    create: {
      organizationId: org.id,
      key: 'cl_budget',
      textEn: 'Budget Preference',
      textHi: 'बजट वरीयता',
      textHiEn: 'Budget varitata',
      category: 'CONTACT_LENSES',
      order: 5,
      isRequired: true,
      allowMultiple: false,
      isActive: true,
    },
  });

  const q5Options = [
    { key: 'under_1000', textEn: 'Under ₹1000', icon: '💵', order: 1 },
    { key: '1000_2000', textEn: '₹1000–₹2000', icon: '💴', order: 2 },
    { key: '2000_3500', textEn: '₹2000–₹3500', icon: '💶', order: 3 },
    { key: 'no_limit', textEn: 'Best lens for comfort (no budget limit)', icon: '💎', order: 4 },
  ];

  for (const opt of q5Options) {
    const answer = await prisma.answerOption.upsert({
      where: {
        questionId_key: {
          questionId: q5.id,
          key: opt.key,
        },
      },
      update: {
        textEn: opt.textEn,
        icon: opt.icon,
        order: opt.order,
      },
      create: {
        questionId: q5.id,
        key: opt.key,
        textEn: opt.textEn,
        icon: opt.icon,
        order: opt.order,
      },
    });

    if (opt.key === 'no_limit' && benefitMap.has('B01')) {
      await prisma.answerBenefit.upsert({
        where: {
          answerId_benefitId: {
            answerId: answer.id,
            benefitId: benefitMap.get('B01')!,
          },
        },
        update: { points: 3.0 },
        create: {
          answerId: answer.id,
          benefitId: benefitMap.get('B01')!,
          points: 3.0,
        },
      });
      if (benefitMap.has('B02')) {
        await prisma.answerBenefit.upsert({
          where: {
            answerId_benefitId: {
              answerId: answer.id,
              benefitId: benefitMap.get('B02')!,
            },
          },
          update: { points: 3.0 },
          create: {
            answerId: answer.id,
            benefitId: benefitMap.get('B02')!,
            points: 3.0,
          },
        });
      }
    } else if (opt.key === 'under_1000' && benefitMap.has('B01')) {
      await prisma.answerBenefit.upsert({
        where: {
          answerId_benefitId: {
            answerId: answer.id,
            benefitId: benefitMap.get('B01')!,
          },
        },
        update: { points: 1.0 },
        create: {
          answerId: answer.id,
          benefitId: benefitMap.get('B01')!,
          points: 1.0,
        },
      });
    }
  }

  console.log('✅ Question 5: Budget');

  console.log('\n✅ Contact Lens Questions seeded successfully!');
  console.log('\n📝 Next Steps:');
  console.log('1. Verify questions in Admin → Questionnaire');
  console.log('2. Check AnswerBenefit mappings are correct');
  console.log('3. Update questionnaire page to use database questions (optional)');
}

seedContactLensQuestions()
  .catch((e) => {
    console.error('❌ Error seeding CL questions:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
