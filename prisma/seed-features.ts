import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Standard lens features F01-F11
const features = [
  {
    code: 'F01',
    name: 'Anti-Scratch Coating',
    description: 'Hard coating that protects lenses from scratches and extends lens life',
    category: 'COATING',
    displayOrder: 1,
  },
  {
    code: 'F02',
    name: 'Anti-Glare Coating',
    description: 'Reduces reflections and glare for clearer vision, especially at night',
    category: 'COATING',
    displayOrder: 2,
  },
  {
    code: 'F03',
    name: 'Blue Light Filter',
    description: 'Blocks harmful blue light from digital screens to reduce eye strain',
    category: 'PROTECTION',
    displayOrder: 3,
  },
  {
    code: 'F04',
    name: 'UV Protection',
    description: '100% UV protection against harmful ultraviolet rays',
    category: 'PROTECTION',
    displayOrder: 4,
  },
  {
    code: 'F05',
    name: 'Photochromic Lens',
    description: 'Automatically darkens in sunlight and clears indoors',
    category: 'LIFESTYLE',
    displayOrder: 5,
  },
  {
    code: 'F06',
    name: 'High Index Lens',
    description: 'Thinner and lighter lenses for high prescription powers',
    category: 'VISION',
    displayOrder: 6,
  },
  {
    code: 'F07',
    name: 'Progressive Lens',
    description: 'Multifocal lens for clear vision at all distances',
    category: 'VISION',
    displayOrder: 7,
  },
  {
    code: 'F08',
    name: 'Water Repellent Coating',
    description: 'Hydrophobic coating that repels water and makes cleaning easier',
    category: 'COATING',
    displayOrder: 8,
  },
  {
    code: 'F09',
    name: 'Impact Resistance',
    description: 'Enhanced durability and impact resistance for active lifestyles',
    category: 'DURABILITY',
    displayOrder: 9,
  },
  {
    code: 'F10',
    name: 'Anti-Fog Coating',
    description: 'Prevents lens fogging in temperature changes and humid conditions',
    category: 'COATING',
    displayOrder: 10,
  },
  {
    code: 'F11',
    name: 'Digital Eye Strain Relief',
    description: 'Specialized coating to reduce digital eye strain from prolonged screen use',
    category: 'PROTECTION',
    displayOrder: 11,
  },
];

async function main() {
  console.log('🌱 Starting feature seed...');

  // Check if features already exist
  const existingFeatures = await prisma.feature.findMany({
    where: {
      code: {
        in: features.map(f => f.code),
      },
    },
  });

  if (existingFeatures.length > 0) {
    console.log(`⚠️  Found ${existingFeatures.length} existing features. Updating...`);
    
    // Update existing features
    for (const feature of features) {
      const existing = existingFeatures.find(f => f.code === feature.code);
      if (existing) {
        await prisma.feature.update({
          where: { id: existing.id },
          data: {
            name: feature.name,
            description: feature.description,
            category: feature.category,
            displayOrder: feature.displayOrder,
            isActive: true,
            updatedAt: new Date(),
          },
        });
        console.log(`✅ Updated ${feature.code}: ${feature.name}`);
      } else {
        // Create if doesn't exist
        await prisma.feature.create({
          data: {
            code: feature.code,
            name: feature.name,
            description: feature.description,
            category: feature.category,
            displayOrder: feature.displayOrder,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        });
        console.log(`✅ Created ${feature.code}: ${feature.name}`);
      }
    }
  } else {
    // Create all features
    console.log('📝 Creating all features...');
    
    for (const feature of features) {
      await prisma.feature.create({
        data: {
          code: feature.code,
          name: feature.name,
          description: feature.description,
          category: feature.category,
          displayOrder: feature.displayOrder,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
      console.log(`✅ Created ${feature.code}: ${feature.name}`);
    }
  }

  console.log('\n🎉 Feature seed completed successfully!\n');
  console.log('============================================');
  console.log('📊 FEATURES SUMMARY:');
  console.log('============================================');
  
  const allFeatures = await prisma.feature.findMany({
    orderBy: { displayOrder: 'asc' },
  });
  
  for (const feature of allFeatures) {
    console.log(`${feature.code}: ${feature.name} (${feature.category})`);
  }
  
  console.log('============================================\n');
}

main()
  .catch((e) => {
    console.error('❌ Error during feature seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

