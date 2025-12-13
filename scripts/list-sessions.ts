/**
 * List Recent Sessions
 * 
 * Run: npx tsx scripts/list-sessions.ts
 * 
 * This script lists recent sessions so you can pick a sessionId for debugging
 */

import { prisma } from '../lib/prisma';

async function listSessions() {
  console.log('📋 Recent Sessions:');
  console.log('='.repeat(80));

  try {
    const sessions = await prisma.session.findMany({
      orderBy: {
        startedAt: 'desc',
      },
      take: 20,
      select: {
        id: true,
        category: true,
        status: true,
        customerName: true,
        startedAt: true,
        storeId: true,
      },
    });

    if (sessions.length === 0) {
      console.log('❌ No sessions found');
      return;
    }

    // Get store names
    const storeIds = [...new Set(sessions.map(s => s.storeId))];
    const stores = await prisma.store.findMany({
      where: { id: { in: storeIds } },
      select: {
        id: true,
        name: true,
      },
    });
    const storeMap = new Map(stores.map(s => [s.id, s.name]));

    // Get answer counts
    const sessionIds = sessions.map(s => s.id);
    const answerCounts = await prisma.sessionAnswer.groupBy({
      by: ['sessionId'],
      where: { sessionId: { in: sessionIds } },
      _count: {
        sessionId: true,
      },
    });
    const answerCountMap = new Map(answerCounts.map(a => [a.sessionId, a._count.sessionId]));

    console.log('\n');
    sessions.forEach((session, index) => {
      const storeName = storeMap.get(session.storeId) || 'Unknown';
      const answerCount = answerCountMap.get(session.id) || 0;
      const date = session.startedAt.toLocaleString('en-IN', { 
        timeZone: 'Asia/Kolkata',
        dateStyle: 'short',
        timeStyle: 'short',
      });

      console.log(`${index + 1}. ${session.id}`);
      console.log(`   Category: ${session.category}`);
      console.log(`   Status: ${session.status}`);
      console.log(`   Customer: ${session.customerName || 'N/A'}`);
      console.log(`   Store: ${storeName}`);
      console.log(`   Answers: ${answerCount}`);
      console.log(`   Started: ${date}`);
      console.log('');
    });

    console.log('='.repeat(80));
    console.log(`\n💡 To debug a session, run:`);
    console.log(`   npx tsx scripts/debug-recommendations.ts <sessionId>`);
    console.log(`\n   Example:`);
    if (sessions.length > 0) {
      console.log(`   npx tsx scripts/debug-recommendations.ts ${sessions[0].id}`);
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

listSessions();

