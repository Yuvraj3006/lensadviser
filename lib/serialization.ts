/**
 * Utility functions for serializing Prisma data for JSON responses
 * Handles BigInt, Date, and other non-serializable types
 */

/**
 * Convert BigInt fields to Number in an object
 */
export function serializeBigInt<T extends Record<string, any>>(
  obj: T,
  bigIntFields: string[] = []
): T {
  const serialized = { ...obj };
  
  for (const field of bigIntFields) {
    if (field in serialized && typeof serialized[field] === 'bigint') {
      (serialized as any)[field] = Number(serialized[field]);
    }
  }
  
  return serialized;
}

/**
 * Serialize dates to ISO strings
 */
export function serializeDates<T extends Record<string, any>>(
  obj: T,
  dateFields: string[] = []
): T {
  const serialized = { ...obj };
  
  for (const field of dateFields) {
    if (field in serialized && serialized[field] instanceof Date) {
      (serialized as any)[field] = serialized[field].toISOString();
    }
  }
  
  return serialized;
}

/**
 * Serialize a Prisma model for JSON response
 * Handles common BigInt and Date fields
 */
export function serializePrismaModel<T extends Record<string, any>>(
  obj: T,
  options: {
    bigIntFields?: string[];
    dateFields?: string[];
  } = {}
): T {
  const { bigIntFields = [], dateFields = [] } = options;
  
  let serialized = { ...obj };
  
  // Auto-detect common BigInt fields
  const commonBigIntFields = ['usedCount', 'priority', 'rank', 'stockQuantity'];
  const allBigIntFields = [...new Set([...commonBigIntFields, ...bigIntFields])];
  
  // Auto-detect common Date fields
  const commonDateFields = ['createdAt', 'updatedAt', 'validFrom', 'validUntil', 'startedAt', 'completedAt'];
  const allDateFields = [...new Set([...commonDateFields, ...dateFields])];
  
  // Convert BigInt fields
  for (const field of allBigIntFields) {
    if (field in serialized && typeof serialized[field] === 'bigint') {
      (serialized as any)[field] = Number(serialized[field]);
    }
  }
  
  // Convert Date fields
  for (const field of allDateFields) {
    if (field in serialized && serialized[field] instanceof Date) {
      (serialized as any)[field] = serialized[field].toISOString();
    }
  }
  
  return serialized;
}

/**
 * Serialize an array of Prisma models
 */
export function serializePrismaModels<T extends Record<string, any>>(
  arr: T[],
  options?: {
    bigIntFields?: string[];
    dateFields?: string[];
  }
): T[] {
  return arr.map(item => serializePrismaModel(item, options));
}
