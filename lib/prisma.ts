import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

// Enhanced Prisma client with better connection handling
export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

// Connection health check with retry
let connectionRetries = 0;
const MAX_RETRIES = 3;

async function ensureConnection() {
  try {
    // Test connection with a simple query
    await prisma.store.count();
    connectionRetries = 0;
    return true;
  } catch (error: any) {
    connectionRetries++;
    if (connectionRetries < MAX_RETRIES) {
      console.log(`Connection retry ${connectionRetries}/${MAX_RETRIES}...`);
      await new Promise(resolve => setTimeout(resolve, 2000));
      return ensureConnection();
    }
    console.error('Failed to connect after retries:', error?.message || error);
    throw error; // Re-throw to be handled by caller
  }
}

// Try to establish connection on startup
if (process.env.NODE_ENV !== 'production') {
  ensureConnection().catch(() => {
    // Connection will be retried on first query
  });
}

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Export connection helper
export { ensureConnection };

