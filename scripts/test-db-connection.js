#!/usr/bin/env node

/**
 * Database Connection Test Script
 * Tests MongoDB Atlas connection and provides diagnostics
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  log: ['error', 'warn'],
});

async function testConnection() {
  console.log('🔍 Testing MongoDB Atlas Connection...\n');

  // Test 1: Connection
  console.log('1️⃣  Testing connection...');
  try {
    await prisma.$connect();
    console.log('   ✅ Connected successfully!\n');
  } catch (error) {
    console.log('   ❌ Connection failed!');
    console.log('   Error:', error.message.substring(0, 200));
    console.log('\n   💡 Solutions:');
    console.log('      - Check MongoDB Atlas cluster is RUNNING (not paused)');
    console.log('      - Verify IP is whitelisted in Network Access');
    console.log('      - Wait 2-3 minutes after resuming cluster\n');
    await prisma.$disconnect();
    process.exit(1);
  }

  // Test 2: Query
  console.log('2️⃣  Testing query...');
  try {
    const storeCount = await prisma.store.count();
    console.log(`   ✅ Query successful! Store count: ${storeCount}\n`);
  } catch (error) {
    console.log('   ❌ Query failed!');
    console.log('   Error:', error.message.substring(0, 200));
    console.log('\n   💡 Solutions:');
    console.log('      - Run: npx prisma db push');
    console.log('      - Run: npm run db:seed\n');
    await prisma.$disconnect();
    process.exit(1);
  }

  // Test 3: Schema check
  console.log('3️⃣  Checking schema...');
  try {
    const hasStores = await prisma.store.findFirst();
    const hasUsers = await prisma.user.findFirst();
    const hasProducts = await prisma.product.findFirst();
    
    console.log('   ✅ Schema check passed!');
    console.log(`   - Stores: ${hasStores ? '✅ Has data' : '⚠️  Empty (run: npm run db:seed)'}`);
    console.log(`   - Users: ${hasUsers ? '✅ Has data' : '⚠️  Empty (run: npm run db:seed)'}`);
    console.log(`   - Products: ${hasProducts ? '✅ Has data' : '⚠️  Empty (run: npm run db:seed)'}\n`);
  } catch (error) {
    console.log('   ❌ Schema check failed!');
    console.log('   Error:', error.message.substring(0, 200));
    console.log('\n   💡 Solution: Run: npx prisma db push\n');
    await prisma.$disconnect();
    process.exit(1);
  }

  // Success
  console.log('✅ All tests passed! Database is ready for deployment! 🚀\n');
  
  await prisma.$disconnect();
  process.exit(0);
}

// Run tests
testConnection().catch((error) => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});

