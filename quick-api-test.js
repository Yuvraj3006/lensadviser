#!/usr/bin/env node

const https = require('https');

const BASE_URL = 'https://lensadviser.vercel.app';

async function testAPI(name, endpoint, expectedStatus = 200) {
  console.log(`\n🧪 Testing: ${name}`);
  console.log(`📍 ${BASE_URL}${endpoint}`);

  return new Promise((resolve) => {
    const req = https.get(`${BASE_URL}${endpoint}`, { timeout: 5000 }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const json = data ? JSON.parse(data) : {};
          const status = res.statusCode === expectedStatus ? '✅ PASS' : '❌ FAIL';
          console.log(`${status} Status: ${res.statusCode} (expected ${expectedStatus})`);

          if (json.error) {
            console.log(`🚨 Error: ${json.error.message || json.error}`);
          } else if (json.success !== undefined) {
            console.log(`📄 Success: ${json.success}`);
          }

          resolve({ success: res.statusCode === expectedStatus, status: res.statusCode });
        } catch (e) {
          console.log(`❌ JSON Parse Error: ${e.message}`);
          resolve({ success: false, error: e.message });
        }
      });
    });

    req.on('error', (err) => {
      console.log(`❌ Network Error: ${err.message}`);
      resolve({ success: false, error: err.message });
    });

    req.on('timeout', () => {
      req.destroy();
      console.log(`⏰ Timeout (5s)`);
      resolve({ success: false, error: 'timeout' });
    });
  });
}

async function runQuickTests() {
  console.log('🚀 Quick LensTrack API Test');
  console.log('='.repeat(40));
  console.log(`🌐 Testing: ${BASE_URL}`);

  const tests = [
    // Critical health checks
    ['Health Check', '/api/health', 200],
    ['DB Health', '/api/health/db', 200],

    // Auth (expect 401 when not logged in)
    ['Auth Session', '/api/auth/session', 401],

    // Public APIs
    ['Config', '/api/config', 200],
    ['Store Verify (invalid)', '/api/public/verify-store?code=INVALID', 404],

    // Products
    ['Lens Products', '/api/products/lenses', 200],
    ['Price Matrix', '/api/products/lenses/price-matrix', 200],

    // Admin (expect 401 without auth)
    ['Admin Benefits', '/api/admin/benefits', 401],
    ['Admin Features', '/api/admin/features', 401],
    ['Admin Users', '/api/admin/users', 401],
  ];

  let passed = 0;
  let failed = 0;

  for (const [name, endpoint, expectedStatus] of tests) {
    const result = await testAPI(name, endpoint, expectedStatus);
    if (result.success) passed++;
    else failed++;
  }

  console.log('\n' + '='.repeat(40));
  console.log('🎯 RESULTS:');
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);

  if (failed === 0) {
    console.log('\n🎉 ALL TESTS PASSED! Your APIs are working perfectly!');
  } else {
    console.log('\n⚠️  Some tests failed. Check the errors above.');
  }
}

runQuickTests().catch(console.error);
