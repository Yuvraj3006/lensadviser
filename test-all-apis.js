#!/usr/bin/env node

/**
 * Comprehensive API Testing Script for LensTrack
 * Run with: node test-all-apis.js
 */

const https = require('https');
const http = require('http');

const BASE_URL = 'https://lensadviser.vercel.app';
const LOCAL_URL = 'http://localhost:3000';

// Test results
let results = {
  total: 0,
  passed: 0,
  failed: 0,
  errors: []
};

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const req = protocol.get(url, options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const jsonData = data ? JSON.parse(data) : {};
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: jsonData
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: data
          });
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

async function testEndpoint(name, url, expectedStatus = 200, method = 'GET', body = null) {
  results.total++;
  console.log(`\n🧪 Testing: ${name}`);
  console.log(`📍 URL: ${url}`);
  console.log(`📊 Method: ${method}, Expected: ${expectedStatus}`);

  try {
    const options = method !== 'GET' ? {
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': body ? Buffer.byteLength(JSON.stringify(body)) : 0
      }
    } : {};

    const response = await makeRequest(url, options);

    if (response.status === expectedStatus) {
      console.log(`✅ PASS: Status ${response.status}`);
      results.passed++;
    } else {
      console.log(`❌ FAIL: Expected ${expectedStatus}, got ${response.status}`);
      results.failed++;
      results.errors.push(`${name}: Expected ${expectedStatus}, got ${response.status}`);
    }

    // Log response preview
    if (response.data && typeof response.data === 'object') {
      console.log(`📄 Response: ${JSON.stringify(response.data).substring(0, 100)}...`);
    } else if (response.data) {
      console.log(`📄 Response: ${response.data.substring(0, 100)}...`);
    }

  } catch (error) {
    console.log(`❌ ERROR: ${error.message}`);
    results.failed++;
    results.errors.push(`${name}: ${error.message}`);
  }
}

async function runAllTests() {
  console.log('🚀 Starting Comprehensive LensTrack API Testing');
  console.log('=' .repeat(60));
  console.log(`🌐 Testing Production: ${BASE_URL}`);
  console.log(`🏠 Testing Local: ${LOCAL_URL}`);
  console.log('=' .repeat(60));

  // Test both production and local
  const environments = [
    { name: 'Production', baseUrl: BASE_URL },
    { name: 'Local', baseUrl: LOCAL_URL }
  ];

  for (const env of environments) {
    console.log(`\n🏭 Testing ${env.name} Environment`);
    console.log('='.repeat(40));

    // 1. HEALTH CHECKS
    await testEndpoint(`${env.name} - Health Check`, `${env.baseUrl}/api/health`);
    await testEndpoint(`${env.name} - DB Health`, `${env.baseUrl}/api/health/db`);

    // 2. AUTHENTICATION
    await testEndpoint(`${env.name} - Auth Session`, `${env.baseUrl}/api/auth/session`, 401);
    await testEndpoint(`${env.name} - Auth Login (Invalid)`, `${env.baseUrl}/api/auth/login`, 400, 'POST', {
      email: 'invalid@example.com',
      password: 'wrong'
    });

    // 3. PUBLIC APIs
    await testEndpoint(`${env.name} - Brands`, `${env.baseUrl}/api/brands`);
    await testEndpoint(`${env.name} - Config`, `${env.baseUrl}/api/config`);
    await testEndpoint(`${env.name} - Store Verify`, `${env.baseUrl}/api/public/verify-store?code=TEST`, 404);

    // 4. PRODUCTS
    await testEndpoint(`${env.name} - Lens Products`, `${env.baseUrl}/api/products/lenses`);
    await testEndpoint(`${env.name} - Price Matrix`, `${env.baseUrl}/api/products/lenses/price-matrix`);
    await testEndpoint(`${env.name} - Lens SKUs`, `${env.baseUrl}/api/lens-skus`);

    // 5. QUESTIONNAIRE
    await testEndpoint(`${env.name} - Questions`, `${env.baseUrl}/api/questionnaire/questions`);
    await testEndpoint(`${env.name} - Questionnaire Sessions`, `${env.baseUrl}/api/questionnaire/sessions`, 401);

    // 6. OFFERS & CALCULATIONS
    await testEndpoint(`${env.name} - Offers Calculate`, `${env.baseUrl}/api/offers/calculate`);
    await testEndpoint(`${env.name} - Offer Engine`, `${env.baseUrl}/api/offer-engine/calculate`);

    // 7. ADMIN APIs (Expect 401 without auth)
    await testEndpoint(`${env.name} - Admin Users`, `${env.baseUrl}/api/admin/users`, 401);
    await testEndpoint(`${env.name} - Admin Stores`, `${env.baseUrl}/api/admin/stores`, 401);
    await testEndpoint(`${env.name} - Admin Lenses`, `${env.baseUrl}/api/admin/lenses`, 401);
    await testEndpoint(`${env.name} - Admin Products`, `${env.baseUrl}/api/admin/products`, 401);
    await testEndpoint(`${env.name} - Admin Benefits`, `${env.baseUrl}/api/admin/benefits`, 401);
    await testEndpoint(`${env.name} - Admin Features`, `${env.baseUrl}/api/admin/features`, 401);

    // 8. ORDER APIs
    await testEndpoint(`${env.name} - Create Order`, `${env.baseUrl}/api/order/create`, 400, 'POST', {});
    await testEndpoint(`${env.name} - Order Confirm`, `${env.baseUrl}/api/order/confirm`, 400, 'POST', {});

    // 9. ADVISOR APIs
    await testEndpoint(`${env.name} - Advisor Benefits`, `${env.baseUrl}/api/advisor/calculate-benefits`);

    // 10. CONTACT LENS APIs
    await testEndpoint(`${env.name} - Contact Lens Search`, `${env.baseUrl}/api/contact-lens/search`);
    await testEndpoint(`${env.name} - Contact Lens Convert`, `${env.baseUrl}/api/contact-lens/convert-power`);

    // 11. PUBLIC ACCESSORIES & FRAME BRANDS
    await testEndpoint(`${env.name} - Public Accessories`, `${env.baseUrl}/api/public/accessories`);
    await testEndpoint(`${env.name} - Frame Brands`, `${env.baseUrl}/api/public/frame-brands`);
    await testEndpoint(`${env.name} - Mirror Coatings`, `${env.baseUrl}/api/public/mirror-coatings`);
    await testEndpoint(`${env.name} - Tint Colors`, `${env.baseUrl}/api/public/tint-colors`);

    // 12. RX ADDON
    await testEndpoint(`${env.name} - RX Addon Calculate`, `${env.baseUrl}/api/rx-addon/calculate`);

    // 13. COMBO TIERS
    await testEndpoint(`${env.name} - Combo Tiers`, `${env.baseUrl}/api/combo/tiers`);
    await testEndpoint(`${env.name} - Combo Validate`, `${env.baseUrl}/api/combo/validate-selection`, 400, 'POST', {});

    console.log(`\n✅ ${env.name} Environment: ${results.passed} passed, ${results.failed} failed`);
  }

  // FINAL RESULTS
  console.log('\n' + '='.repeat(60));
  console.log('🎯 FINAL TEST RESULTS');
  console.log('='.repeat(60));
  console.log(`📊 Total Tests: ${results.total}`);
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`📈 Success Rate: ${((results.passed / results.total) * 100).toFixed(1)}%`);

  if (results.errors.length > 0) {
    console.log('\n🚨 ERRORS FOUND:');
    results.errors.forEach((error, i) => {
      console.log(`${i + 1}. ${error}`);
    });
  }

  console.log('\n🏁 Testing Complete!');
  console.log('💡 Tip: Run this script again after fixes to verify improvements');
}

if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = { runAllTests, testEndpoint };
