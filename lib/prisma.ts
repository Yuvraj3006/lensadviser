import { PrismaClient } from '@prisma/client';

// #region agent log
console.log('[DEBUG] lib/prisma.ts: Module loading started', { hasDatabaseUrl: !!process.env.DATABASE_URL });
// #endregion

const globalForPrisma = global as unknown as { prisma: PrismaClient };

// Enhanced Prisma client with better connection handling
// Standard Next.js Prisma pattern
// #region agent log
console.log('[DEBUG] lib/prisma.ts: Before PrismaClient creation', { hasGlobalPrisma: !!globalForPrisma.prisma });
// #endregion

let prismaInstance: PrismaClient;
try {
  prismaInstance = globalForPrisma.prisma || new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });
  // #region agent log
  console.log('[DEBUG] lib/prisma.ts: PrismaClient created successfully', { isNew: !globalForPrisma.prisma });
  // #endregion
} catch (error: any) {
  // #region agent log
  console.error('[DEBUG] lib/prisma.ts: PrismaClient creation failed', { error: error?.message, stack: error?.stack });
  // #endregion
  throw error;
}

export const prisma = prismaInstance;

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

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
// Disabled to prevent blocking module load - connection will be established on first query
// if (process.env.NODE_ENV !== 'production') {
//   ensureConnection().catch(() => {
//     // Connection will be retried on first query
//   });
// }


// Export connection helper
export { ensureConnection };

