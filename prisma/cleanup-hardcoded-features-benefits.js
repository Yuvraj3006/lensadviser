/**
 * Cleanup script to remove hardcoded features (F01-F11) and benefits (B01-B12)
 * Run with: node prisma/cleanup-hardcoded-features-benefits.js
 */

const { MongoClient } = require('mongodb');

// Load environment variables
require('dotenv').config();

const uri = process.env.DATABASE_URL;

if (!uri) {
  console.error('❌ DATABASE_URL environment variable is not set');
  console.error('Please ensure your .env file contains the correct DATABASE_URL');
  process.exit(1);
}

async function cleanupHardcodedFeaturesAndBenefits() {
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');

    const db = client.db('lenstrack');

    // Features to delete (F01-F11)
    const featureCodes = ['F01', 'F02', 'F03', 'F04', 'F05', 'F06', 'F07', 'F08', 'F09', 'F10', 'F11'];

    // Benefits to delete (B01-B12)
    const benefitCodes = ['B01', 'B02', 'B03', 'B04', 'B05', 'B06', 'B07', 'B08', 'B09', 'B10', 'B11', 'B12'];

    console.log('\n🧹 Cleaning up hardcoded features...');

    // Find features with these codes
    const featuresToDelete = await db.collection('Feature').find({
      code: { $in: featureCodes }
    }).toArray();

    console.log(`Found ${featuresToDelete.length} features to delete:`);
    featuresToDelete.forEach(f => console.log(`  - ${f.code}: ${f.name}`));

    if (featuresToDelete.length > 0) {
      const featureIds = featuresToDelete.map(f => f._id);

      // Delete ProductFeature references
      const productFeatureResult = await db.collection('ProductFeature').deleteMany({
        featureId: { $in: featureIds }
      });
      console.log(`✅ Deleted ${productFeatureResult.deletedCount} ProductFeature references`);

      // Delete FeatureBenefit references
      const featureBenefitResult = await db.collection('FeatureBenefit').deleteMany({
        featureId: { $in: featureIds }
      });
      console.log(`✅ Deleted ${featureBenefitResult.deletedCount} FeatureBenefit references`);

      // Delete features
      const featureResult = await db.collection('Feature').deleteMany({
        code: { $in: featureCodes }
      });
      console.log(`✅ Deleted ${featureResult.deletedCount} features`);
    }

    console.log('\n🧹 Cleaning up hardcoded benefits...');

    // Find benefits with these codes
    const benefitsToDelete = await db.collection('Benefit').find({
      code: { $in: benefitCodes }
    }).toArray();

    console.log(`Found ${benefitsToDelete.length} benefits to delete:`);
    benefitsToDelete.forEach(b => console.log(`  - ${b.code}: ${b.name}`));

    if (benefitsToDelete.length > 0) {
      const benefitIds = benefitsToDelete.map(b => b._id);

      // Delete AnswerBenefit references
      const answerBenefitResult = await db.collection('AnswerBenefit').deleteMany({
        benefitId: { $in: benefitIds }
      });
      console.log(`✅ Deleted ${answerBenefitResult.deletedCount} AnswerBenefit references`);

      // Delete ProductBenefit references
      const productBenefitResult = await db.collection('ProductBenefit').deleteMany({
        benefitId: { $in: benefitIds }
      });
      console.log(`✅ Deleted ${productBenefitResult.deletedCount} ProductBenefit references`);

      // Delete FeatureBenefit references (if any)
      const featureBenefitResult = await db.collection('FeatureBenefit').deleteMany({
        benefitId: { $in: benefitIds }
      });
      console.log(`✅ Deleted ${featureBenefitResult.deletedCount} FeatureBenefit references`);

      // Delete benefits
      const benefitResult = await db.collection('Benefit').deleteMany({
        code: { $in: benefitCodes }
      });
      console.log(`✅ Deleted ${benefitResult.deletedCount} benefits`);
    }

    // Also check for unified BenefitFeature records
    console.log('\n🧹 Cleaning up unified BenefitFeature records...');

    const benefitFeaturesToDelete = await db.collection('BenefitFeature').find({
      $or: [
        { code: { $in: featureCodes }, type: 'FEATURE' },
        { code: { $in: benefitCodes }, type: 'BENEFIT' }
      ]
    }).toArray();

    console.log(`Found ${benefitFeaturesToDelete.length} BenefitFeature records to delete:`);
    benefitFeaturesToDelete.forEach(bf => console.log(`  - ${bf.type} ${bf.code}: ${bf.name}`));

    if (benefitFeaturesToDelete.length > 0) {
      const bfResult = await db.collection('BenefitFeature').deleteMany({
        $or: [
          { code: { $in: featureCodes }, type: 'FEATURE' },
          { code: { $in: benefitCodes }, type: 'BENEFIT' }
        ]
      });
      console.log(`✅ Deleted ${bfResult.deletedCount} BenefitFeature records`);
    }

    console.log('\n🎉 Cleanup complete! All hardcoded features and benefits have been removed.');
    console.log('\n📝 Next steps:');
    console.log('1. Add features manually through the admin interface');
    console.log('2. Add benefits manually through the admin interface');
    console.log('3. Update any product mappings as needed');

  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    throw error;
  } finally {
    await client.close();
    console.log('\n📪 Database connection closed');
  }
}

cleanupHardcodedFeaturesAndBenefits();
