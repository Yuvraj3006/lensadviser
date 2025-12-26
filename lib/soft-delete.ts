/**
 * Soft Delete Utilities
 * Provides helpers for soft delete functionality
 * Note: Schema needs deletedAt fields added for full implementation
 */

/**
 * Soft delete filter - excludes deleted records
 * Use this in Prisma where clauses
 */
export function notDeletedFilter() {
  // For now, we use isActive: true as soft delete
  // TODO: Add deletedAt field to schema and update this
  return {
    isActive: true,
    // Future: deletedAt: null
  };
}

/**
 * Include deleted filter - includes deleted records
 */
export function includeDeletedFilter() {
  return {};
}

/**
 * Only deleted filter - only deleted records
 */
export function onlyDeletedFilter() {
  // For now, we use isActive: false as deleted
  // TODO: Add deletedAt field to schema and update this
  return {
    isActive: false,
    // Future: deletedAt: { not: null }
  };
}

/**
 * Soft delete data - what to set when soft deleting
 */
export function softDeleteData() {
  // For now, we set isActive to false
  // TODO: Add deletedAt field and set it
  return {
    isActive: false,
    // Future: deletedAt: new Date()
  };
}

/**
 * Restore data - what to set when restoring
 */
export function restoreData() {
  return {
    isActive: true,
    // Future: deletedAt: null
  };
}

