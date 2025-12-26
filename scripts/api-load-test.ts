/**
 * API Load Testing Script
 * Tests recommendation and offer engine APIs under load
 * 
 * Usage:
 *   npx ts-node scripts/api-load-test.ts
 */

import { prisma } from '../lib/prisma';

interface TestResult {
  endpoint: string;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  p50: number; // 50th percentile
  p95: number; // 95th percentile
  p99: number; // 99th percentile
  errors: string[];
}

class LoadTester {
  private baseUrl: string;
  private results: TestResult[] = [];

  constructor(baseUrl: string = 'http://localhost:3000') {
    this.baseUrl = baseUrl;
  }

  /**
   * Make a single API request and measure time
   */
  private async makeRequest(
    url: string,
    method: string = 'GET',
    body?: any
  ): Promise<{ success: boolean; time: number; error?: string }> {
    const startTime = Date.now();
    
    try {
      const options: RequestInit = {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
      };

      if (body) {
        options.body = JSON.stringify(body);
      }

      const response = await fetch(url, options);
      const endTime = Date.now();
      const time = endTime - startTime;

      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          time,
          error: `HTTP ${response.status}: ${errorText.substring(0, 100)}`,
        };
      }

      return { success: true, time };
    } catch (error: any) {
      const endTime = Date.now();
      return {
        success: false,
        time: endTime - startTime,
        error: error.message || 'Unknown error',
      };
    }
  }

  /**
   * Run load test for a single endpoint
   */
  async testEndpoint(
    endpoint: string,
    method: string = 'GET',
    body?: any,
    concurrency: number = 10,
    totalRequests: number = 100
  ): Promise<TestResult> {
    console.log(`\n🧪 Testing: ${method} ${endpoint}`);
    console.log(`   Concurrency: ${concurrency}, Total Requests: ${totalRequests}`);

    const url = `${this.baseUrl}${endpoint}`;
    const responseTimes: number[] = [];
    const errors: string[] = [];
    let successful = 0;
    let failed = 0;

    // Create batches for concurrent requests
    const batches = Math.ceil(totalRequests / concurrency);
    
    for (let batch = 0; batch < batches; batch++) {
      const batchSize = Math.min(concurrency, totalRequests - batch * concurrency);
      const promises: Promise<void>[] = [];

      for (let i = 0; i < batchSize; i++) {
        promises.push(
          this.makeRequest(url, method, body).then(result => {
            if (result.success) {
              successful++;
              responseTimes.push(result.time);
            } else {
              failed++;
              if (result.error) {
                errors.push(result.error);
              }
            }
          })
        );
      }

      await Promise.all(promises);
      
      // Progress indicator
      const progress = ((batch + 1) * concurrency / totalRequests * 100).toFixed(0);
      process.stdout.write(`\r   Progress: ${progress}% (${successful + failed}/${totalRequests})`);
    }

    console.log(''); // New line after progress

    // Calculate statistics
    responseTimes.sort((a, b) => a - b);
    const avg = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    const min = responseTimes[0] || 0;
    const max = responseTimes[responseTimes.length - 1] || 0;
    const p50 = responseTimes[Math.floor(responseTimes.length * 0.5)] || 0;
    const p95 = responseTimes[Math.floor(responseTimes.length * 0.95)] || 0;
    const p99 = responseTimes[Math.floor(responseTimes.length * 0.99)] || 0;

    const result: TestResult = {
      endpoint,
      totalRequests,
      successfulRequests: successful,
      failedRequests: failed,
      averageResponseTime: Math.round(avg),
      minResponseTime: min,
      maxResponseTime: max,
      p50: Math.round(p50),
      p95: Math.round(p95),
      p99: Math.round(p99),
      errors: [...new Set(errors)].slice(0, 5), // Unique errors, max 5
    };

    this.results.push(result);
    return result;
  }

  /**
   * Print test results
   */
  printResults(): void {
    console.log('\n' + '='.repeat(80));
    console.log('📊 LOAD TEST RESULTS');
    console.log('='.repeat(80));

    this.results.forEach((result, index) => {
      console.log(`\n${index + 1}. ${result.endpoint}`);
      console.log(`   Total Requests: ${result.totalRequests}`);
      console.log(`   Successful: ${result.successfulRequests} (${((result.successfulRequests / result.totalRequests) * 100).toFixed(1)}%)`);
      console.log(`   Failed: ${result.failedRequests} (${((result.failedRequests / result.totalRequests) * 100).toFixed(1)}%)`);
      console.log(`   Response Times:`);
      console.log(`     Average: ${result.averageResponseTime}ms`);
      console.log(`     Min: ${result.minResponseTime}ms`);
      console.log(`     Max: ${result.maxResponseTime}ms`);
      console.log(`     P50: ${result.p50}ms`);
      console.log(`     P95: ${result.p95}ms`);
      console.log(`     P99: ${result.p99}ms`);
      
      if (result.errors.length > 0) {
        console.log(`   Errors:`);
        result.errors.forEach(err => console.log(`     - ${err}`));
      }

      // Performance assessment
      if (result.averageResponseTime < 500) {
        console.log(`   ✅ Excellent performance`);
      } else if (result.averageResponseTime < 1000) {
        console.log(`   ✅ Good performance`);
      } else if (result.averageResponseTime < 2000) {
        console.log(`   ⚠️  Acceptable performance`);
      } else {
        console.log(`   ❌ Poor performance - needs optimization`);
      }
    });

    console.log('\n' + '='.repeat(80));
  }
}

async function testRecommendationsAPI() {
  console.log('\n🔍 Finding test session...');
  
  // Get a test session with answers
  const session = await prisma.session.findFirst({
    where: {
      category: { not: 'ACCESSORIES' },
      status: { not: 'DRAFT' },
    },
  });

  if (!session) {
    console.log('❌ No test session found. Please create a session first.');
    return;
  }

  console.log(`✅ Found session: ${session.id}`);
  console.log(`   Category: ${session.category}`);
  
  // Check answer count separately
  const answerCount = await prisma.sessionAnswer.count({
    where: { sessionId: session.id },
  });
  console.log(`   Answers: ${answerCount}`);

  const tester = new LoadTester();

  // Test 1: Recommendations API (light load)
  await tester.testEndpoint(
    `/api/public/questionnaire/sessions/${session.id}/recommendations`,
    'GET',
    undefined,
    10, // 10 concurrent requests
    50 // 50 total requests
  );

  // Test 2: Recommendations API (medium load)
  await tester.testEndpoint(
    `/api/public/questionnaire/sessions/${session.id}/recommendations`,
    'GET',
    undefined,
    25, // 25 concurrent requests
    200 // 200 total requests
  );

  // Test 3: Recommendations API (heavy load)
  await tester.testEndpoint(
    `/api/public/questionnaire/sessions/${session.id}/recommendations`,
    'GET',
    undefined,
    50, // 50 concurrent requests
    500 // 500 total requests
  );

  // Test 4: Recommendations API (extreme load)
  await tester.testEndpoint(
    `/api/public/questionnaire/sessions/${session.id}/recommendations`,
    'GET',
    undefined,
    100, // 100 concurrent requests
    1000 // 1000 total requests
  );

  tester.printResults();
}

async function testAnswerSavingAPI() {
  console.log('\n🔍 Finding test session for answer saving...');
  
  // Get a test session that's not completed
  let session = await prisma.session.findFirst({
    where: {
      status: { not: 'COMPLETED' },
    },
  });

  // Get a question (we'll use this regardless of session)
  const question = await prisma.question.findFirst({
    where: {
      category: 'EYEGLASSES', // Default category
      isActive: true,
    },
  });

  if (!question) {
    console.log('❌ No question found. Cannot test answer saving.');
    return;
  }

  // Get an answer option
  const option = await prisma.answerOption.findFirst({
    where: {
      questionId: question.id,
    },
  });

  if (!option) {
    console.log('❌ No answer option found. Cannot test answer saving.');
    return;
  }

  if (!session) {
    console.log('❌ No incomplete session found. Skipping answer saving test.');
    console.log('   (Answer saving requires an active session)');
    return;
  }

  console.log(`✅ Found session: ${session.id}`);
  console.log(`✅ Using question: ${question.id}, option: ${option.id}`);
  
  const tester = new LoadTester();

  // Test 1: Answer saving (light load)
  await tester.testEndpoint(
    `/api/public/questionnaire/sessions/${session.id}/answer`,
    'POST',
    {
      questionId: question.id,
      optionIds: [option.id],
    },
    10, // 10 concurrent requests
    50 // 50 total requests
  );

  // Test 2: Answer saving (medium load)
  await tester.testEndpoint(
    `/api/public/questionnaire/sessions/${session.id}/answer`,
    'POST',
    {
      questionId: question.id,
      optionIds: [option.id],
    },
    25, // 25 concurrent requests
    200 // 200 total requests
  );

  // Test 3: Answer saving (heavy load)
  await tester.testEndpoint(
    `/api/public/questionnaire/sessions/${session.id}/answer`,
    'POST',
    {
      questionId: question.id,
      optionIds: [option.id],
    },
    50, // 50 concurrent requests
    500 // 500 total requests
  );

  tester.printResults();
}

async function testOfferEngineAPI() {
  console.log('\n🔍 Finding test data for offer engine...');
  
  // Get a session with a selected product
  const session = await prisma.session.findFirst({
    where: {
      status: { not: 'DRAFT' },
    },
  });

  if (!session) {
    console.log('❌ No test session found.');
    return;
  }

  // Get a lens product
  const product = await prisma.lensProduct.findFirst({
    where: {
      isActive: true,
    },
  });

  if (!product) {
    console.log('❌ No lens product found.');
    return;
  }

  console.log(`✅ Using session: ${session.id}, product: ${product.id}`);

  const tester = new LoadTester();

  // Test 1: Offer engine (light load)
  await tester.testEndpoint(
    `/api/public/questionnaire/sessions/${session.id}/recalculate-offers`,
    'POST',
    {
      productId: product.id,
    },
    10, // 10 concurrent requests
    50 // 50 total requests
  );

  // Test 2: Offer engine (medium load)
  await tester.testEndpoint(
    `/api/public/questionnaire/sessions/${session.id}/recalculate-offers`,
    'POST',
    {
      productId: product.id,
    },
    25, // 25 concurrent requests
    200 // 200 total requests
  );

  // Test 3: Offer engine (heavy load)
  await tester.testEndpoint(
    `/api/public/questionnaire/sessions/${session.id}/recalculate-offers`,
    'POST',
    {
      productId: product.id,
    },
    50, // 50 concurrent requests
    500 // 500 total requests
  );

  tester.printResults();
}

async function main() {
  console.log('🚀 Starting API Load Tests...\n');
  console.log('='.repeat(80));

  try {
    // Test 1: Recommendations API
    await testRecommendationsAPI();

    // Test 2: Answer Saving API
    await testAnswerSavingAPI();

    // Test 3: Offer Engine API
    await testOfferEngineAPI();

    console.log('\n✅ All load tests completed!\n');
  } catch (error) {
    console.error('\n❌ Error during load testing:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

export { LoadTester };

