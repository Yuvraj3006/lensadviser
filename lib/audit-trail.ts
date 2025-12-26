/**
 * Audit Trail Utilities
 * Provides helpers for tracking who created/updated/deleted records
 * Note: Schema needs createdBy, updatedBy, deletedBy fields added for full implementation
 */

import { TokenPayload } from './auth';

/**
 * Audit fields to add when creating a record
 */
export function getCreateAuditFields(user: TokenPayload) {
  return {
    // TODO: Add these fields to schema
    // createdBy: user.userId,
    // updatedBy: user.userId,
  };
}

/**
 * Audit fields to add when updating a record
 */
export function getUpdateAuditFields(user: TokenPayload) {
  return {
    // TODO: Add these fields to schema
    // updatedBy: user.userId,
  };
}

/**
 * Audit fields to add when deleting a record
 */
export function getDeleteAuditFields(user: TokenPayload) {
  return {
    // TODO: Add these fields to schema
    // deletedBy: user.userId,
  };
}

/**
 * Combine audit fields with soft delete
 */
export function getSoftDeleteWithAudit(user: TokenPayload) {
  return {
    isActive: false,
    // TODO: Add these fields to schema
    // deletedBy: user.userId,
    // deletedAt: new Date(),
  };
}

