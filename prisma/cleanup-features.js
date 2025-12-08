/**
 * Cleanup script to remove features with null codes
 * Run with: node prisma/cleanup-features.js
 */

const { MongoClient } = require('mongodb');

const uri = process.env.DATABASE_URL || 'mongodb+srv://yuvrajsingh:yuvrajsingh@cluster0.ssxmcmv.mongodb.net/lenstrack?retryWrites=true&w=majority';

async function cleanupFeatures() {
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db('lenstrack');
    const featuresCollection = db.collection('Feature');
    
    // Find features with null or missing codes
    const featuresWithoutCode = await featuresCollection.find({
      $or: [
        { code: null },
        { code: '' },
        { code: { $exists: false } }
      ]
    }).toArray();
    
    console.log(`Found ${featuresWithoutCode.length} features without codes`);
    
    if (featuresWithoutCode.length > 0) {
      const featureIds = featuresWithoutCode.map(f => f._id);
      
      // Delete ProductFeature references
      await db.collection('ProductFeature').deleteMany({
        featureId: { $in: featureIds }
      });
      console.log('✅ Deleted ProductFeature references');
      
      // Delete FeatureBenefit references
      await db.collection('FeatureBenefit').deleteMany({
        featureId: { $in: featureIds }
      });
      console.log('✅ Deleted FeatureBenefit references');
      
      // Delete features
      const result = await featuresCollection.deleteMany({
        _id: { $in: featureIds }
      });
      console.log(`✅ Deleted ${result.deletedCount} features without codes`);
    }
    
    // Verify
    const remaining = await featuresCollection.find({
      $or: [
        { code: null },
        { code: '' },
        { code: { $exists: false } }
      ]
    }).toArray();
    
    if (remaining.length > 0) {
      console.warn(`⚠️  Warning: ${remaining.length} features still have null codes`);
    } else {
      console.log('✅ All features have valid codes');
    }
    
    console.log('✅ Cleanup complete!');
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    throw error;
  } finally {
    await client.close();
  }
}

cleanupFeatures();

