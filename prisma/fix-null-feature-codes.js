/**
 * Fix Feature records with null codes by assigning appropriate codes
 * Maps existing features to F01-F11 or assigns new codes
 * Run with: node prisma/fix-null-feature-codes.js
 */

const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config({ path: '.env' });

const MONGODB_URI = process.env.DATABASE_URL || 'mongodb://localhost:27017/lenstrack';

// Map feature names to codes (based on seed data)
const featureCodeMap = {
  'Blue Light Filter': 'F03', // Screen Protection
  'Anti-Scratch Coating': 'F01', // Crack Smudge & Scratch Resistant
  'Anti-Glare Coating': 'F02', // Anti-Reflection
  'Progressive Lens': null, // This is a lens type, not a feature - should be removed or mapped differently
  'UV Protection': 'F05', // UV 400 + Sun Protection
  'Photochromic Lens': null, // This is a lens type, not a feature - should be removed or mapped differently
  'High Index Lens': null, // This is a lens index, not a feature - should be removed or mapped differently
};

async function fixNullFeatureCodes() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db();
    const featuresCollection = db.collection('Feature');
    
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

    // Get all existing codes to avoid duplicates
    const existingFeatures = await featuresCollection.find({ 
      code: { $ne: null } 
    }).toArray();
    const existingCodes = new Set(existingFeatures.map(f => f.code));
    
    let nextCode = 12; // Start from F12 for new features
    
    // Fix each feature
    for (const feature of featuresWithNullCodes) {
      const featureName = feature.name || 'Unnamed';
      let assignedCode = featureCodeMap[featureName];
      
      // If not in map, assign next available code
      if (!assignedCode) {
        // Check if this feature should be mapped to existing F01-F11
        // For lens types (Progressive, Photochromic, High Index), we'll assign new codes
        while (existingCodes.has(`F${nextCode.toString().padStart(2, '0')}`)) {
          nextCode++;
        }
        assignedCode = `F${nextCode.toString().padStart(2, '0')}`;
        nextCode++;
      }
      
      // Check if code already exists
      if (existingCodes.has(assignedCode)) {
        console.log(`⚠️  Feature "${featureName}" - Code ${assignedCode} already exists, assigning F${nextCode.toString().padStart(2, '0')}`);
        assignedCode = `F${nextCode.toString().padStart(2, '0')}`;
        nextCode++;
      }
      
      console.log(`📝 Assigning code ${assignedCode} to feature "${featureName}" (${feature._id})`);
      
      await featuresCollection.updateOne(
        { _id: feature._id },
        { $set: { code: assignedCode } }
      );
      
      existingCodes.add(assignedCode);
      console.log(`   ✅ Updated\n`);
    }

    console.log('✅ All features have been assigned codes!');
    console.log('💡 You can now run: npx prisma db push');
  } catch (error) {
    console.error('❌ Error during fix:', error);
    throw error;
  } finally {
    await client.close();
  }
}

fixNullFeatureCodes()
  .then(() => {
    console.log('\n🎉 Script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Script failed:', error);
    process.exit(1);
  });

