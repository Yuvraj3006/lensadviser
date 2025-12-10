/**
 * Cleanup script to remove or fix Feature records with null codes
 * Uses MongoDB native driver to bypass Prisma schema validation
 * Run with: node prisma/cleanup-null-feature-codes.js
 */

const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env' });

const MONGODB_URI = process.env.DATABASE_URL || 'mongodb://localhost:27017/lenstrack';

async function cleanupNullFeatureCodes() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db();
    const featuresCollection = db.collection('Feature');
    const productFeaturesCollection = db.collection('ProductFeature');
    const featureBenefitsCollection = db.collection('FeatureBenefit');
    const featureMappingsCollection = db.collection('FeatureMapping');
    
    console.log('🔍 Finding Feature records with null codes...');
    
    // Find all features with null codes
    const featuresWithNullCodes = await featuresCollection.find({ 
      code: null 
    }).toArray();
    
    console.log(`Found ${featuresWithNullCodes.length} features with null codes\n`);

    if (featuresWithNullCodes.length === 0) {
      console.log('✅ No features with null codes found. Database is clean!');
      return;
    }

    // Check if any of these features are linked to other collections
    for (const feature of featuresWithNullCodes) {
      const productFeatures = await productFeaturesCollection.find({ 
        featureId: feature._id 
      }).toArray();

      const featureBenefits = await featureBenefitsCollection.find({ 
        featureId: feature._id 
      }).toArray();

      const featureMappings = await featureMappingsCollection.find({ 
        featureId: feature._id 
      }).toArray();

      if (productFeatures.length > 0 || featureBenefits.length > 0 || featureMappings.length > 0) {
        console.log(`⚠️  Feature ${feature._id} (${feature.name || 'Unnamed'}) is linked to:`);
        console.log(`   - ${productFeatures.length} ProductFeatures`);
        console.log(`   - ${featureBenefits.length} FeatureBenefits`);
        console.log(`   - ${featureMappings.length} FeatureMappings`);
        console.log(`   Cannot delete. Please manually assign a code or delete related records first.\n`);
      } else {
        console.log(`🗑️  Deleting feature ${feature._id} (${feature.name || 'Unnamed'}) - not linked to any products`);
        await featuresCollection.deleteOne({ _id: feature._id });
        console.log(`   ✅ Deleted\n`);
      }
    }

    console.log('✅ Cleanup completed!');
    console.log('💡 If any features remain, please manually assign codes or delete related records.');
    console.log('💡 You can now run: npx prisma db push');
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    throw error;
  } finally {
    await client.close();
  }
}

cleanupNullFeatureCodes()
  .then(() => {
    console.log('\n🎉 Script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Script failed:', error);
    process.exit(1);
  });

