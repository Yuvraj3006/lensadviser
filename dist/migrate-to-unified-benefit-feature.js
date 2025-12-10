"use strict";
/**
 * Migration Script: Consolidate Benefit and Feature into unified BenefitFeature
 *
 * This script migrates existing Benefits and Features into the new unified BenefitFeature model.
 * Run this after updating the schema and before removing the old models.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.migrateToUnifiedBenefitFeature = migrateToUnifiedBenefitFeature;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function migrateToUnifiedBenefitFeature() {
    console.log('🚀 Starting migration to unified BenefitFeature model...\n');
    try {
        // Step 1: Migrate Benefits
        console.log('📦 Step 1: Migrating Benefits...');
        const benefits = await prisma.benefit.findMany();
        console.log(`   Found ${benefits.length} benefits to migrate`);
        for (const benefit of benefits) {
            // Check if already migrated
            const existing = await prisma.benefitFeature.findFirst({
                where: {
                    type: 'BENEFIT',
                    code: benefit.code,
                    organizationId: benefit.organizationId,
                },
            });
            if (existing) {
                console.log(`   ⏭️  Skipping ${benefit.code} (already exists)`);
                continue;
            }
            await prisma.benefitFeature.create({
                data: {
                    type: 'BENEFIT',
                    code: benefit.code,
                    name: benefit.name,
                    description: benefit.description,
                    pointWeight: benefit.pointWeight,
                    maxScore: benefit.maxScore,
                    isActive: benefit.isActive,
                    organizationId: benefit.organizationId,
                    createdAt: benefit.createdAt,
                    updatedAt: benefit.updatedAt,
                },
            });
            console.log(`   ✅ Migrated benefit: ${benefit.code} - ${benefit.name}`);
        }
        // Step 2: Migrate Features
        console.log('\n📦 Step 2: Migrating Features...');
        const features = await prisma.feature.findMany();
        console.log(`   Found ${features.length} features to migrate`);
        for (const feature of features) {
            // Check if already migrated
            const existing = await prisma.benefitFeature.findFirst({
                where: {
                    type: 'FEATURE',
                    code: feature.code,
                    organizationId: null, // Features are global
                },
            });
            if (existing) {
                console.log(`   ⏭️  Skipping ${feature.code} (already exists)`);
                continue;
            }
            await prisma.benefitFeature.create({
                data: {
                    type: 'FEATURE',
                    code: feature.code,
                    name: feature.name,
                    description: feature.description,
                    category: feature.category,
                    displayOrder: feature.displayOrder,
                    isActive: feature.isActive,
                    organizationId: null, // Features are global
                    createdAt: feature.createdAt,
                    updatedAt: feature.updatedAt,
                },
            });
            console.log(`   ✅ Migrated feature: ${feature.code} - ${feature.name}`);
        }
        // Step 3: Create mapping from old IDs to new BenefitFeature IDs
        console.log('\n📦 Step 3: Creating ID mapping...');
        const benefitIdMap = new Map(); // old Benefit.id -> new BenefitFeature.id
        const featureIdMap = new Map(); // old Feature.id -> new BenefitFeature.id
        for (const benefit of benefits) {
            const unified = await prisma.benefitFeature.findFirst({
                where: {
                    type: 'BENEFIT',
                    code: benefit.code,
                    organizationId: benefit.organizationId,
                },
            });
            if (unified) {
                benefitIdMap.set(benefit.id, unified.id);
            }
        }
        for (const feature of features) {
            const unified = await prisma.benefitFeature.findFirst({
                where: {
                    type: 'FEATURE',
                    code: feature.code,
                    organizationId: null,
                },
            });
            if (unified) {
                featureIdMap.set(feature.id, unified.id);
            }
        }
        console.log(`   Created ${benefitIdMap.size} benefit ID mappings`);
        console.log(`   Created ${featureIdMap.size} feature ID mappings`);
        // Note: AnswerBenefit, ProductBenefit, and ProductFeature still reference old models
        // These will continue to work during transition period
        // The services will be updated to query BenefitFeature and map IDs as needed
        // Step 4: Create mapping from old IDs to new BenefitFeature IDs
        console.log('\n📦 Step 4: Creating ID mapping...');
        const benefitIdMap = new Map(); // old Benefit.id -> new BenefitFeature.id
        const featureIdMap = new Map(); // old Feature.id -> new BenefitFeature.id
        for (const benefit of benefits) {
            const unified = await prisma.benefitFeature.findFirst({
                where: {
                    type: 'BENEFIT',
                    code: benefit.code,
                    organizationId: benefit.organizationId,
                },
            });
            if (unified) {
                benefitIdMap.set(benefit.id, unified.id);
            }
        }
        for (const feature of features) {
            const unified = await prisma.benefitFeature.findFirst({
                where: {
                    type: 'FEATURE',
                    code: feature.code,
                    organizationId: null,
                },
            });
            if (unified) {
                featureIdMap.set(feature.id, unified.id);
            }
        }
        console.log(`   Created ${benefitIdMap.size} benefit ID mappings`);
        console.log(`   Created ${featureIdMap.size} feature ID mappings`);
        console.log('\n✅ Migration completed successfully!');
        console.log(`\n📊 Summary:`);
        console.log(`   - Migrated ${benefits.length} benefits`);
        console.log(`   - Migrated ${features.length} features`);
        console.log(`   - Created ${benefitIdMap.size} benefit ID mappings`);
        console.log(`   - Created ${featureIdMap.size} feature ID mappings`);
        console.log('\n⚠️  Next steps:');
        console.log('   1. Services will be updated to use BenefitFeature');
        console.log('   2. Old models remain for backward compatibility during transition');
        console.log('   3. After verification, legacy models can be removed');
    }
    catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    }
    finally {
        await prisma.$disconnect();
    }
}
// Run migration
if (require.main === module) {
    migrateToUnifiedBenefitFeature()
        .catch((error) => {
        console.error(error);
        process.exit(1);
    });
}
