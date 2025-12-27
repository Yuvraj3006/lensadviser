/**
 * Secure Storage Utility
 * Handles encrypted storage for sensitive data and token management
 */

import { setEncryptedItem, getEncryptedItem, removeEncryptedItem } from './storage-encryption';

/**
 * Get authentication token from cookie (via API)
 * Since httpOnly cookies can't be read from JavaScript, we use an API endpoint
 */
export async function getAuthToken(): Promise<string | null> {
  try {
    const response = await fetch('/api/auth/token', {
      method: 'GET',
      credentials: 'include', // Include cookies
    });
    
    if (response.ok) {
      const data = await response.json();
      return data.data?.token || null;
    }
    return null;
  } catch (error) {
    console.error('[SecureStorage] Failed to get token:', error);
    return null;
  }
}

/**
 * Store sensitive prescription data (encrypted)
 */
export function setPrescriptionData(data: any): void {
  setEncryptedItem('lenstrack_prescription', data);
}

/**
 * Get sensitive prescription data (decrypted)
 */
export function getPrescriptionData(): any | null {
  return getEncryptedItem('lenstrack_prescription');
}

/**
 * Remove prescription data
 */
export function removePrescriptionData(): void {
  removeEncryptedItem('lenstrack_prescription');
}

/**
 * Store customer details (encrypted)
 */
export function setCustomerDetails(data: { name?: string; phone?: string; email?: string; category?: string }): void {
  setEncryptedItem('lenstrack_customer_details', data);
}

/**
 * Get customer details (decrypted)
 */
export function getCustomerDetails(): { name?: string; phone?: string; email?: string; category?: string } | null {
  return getEncryptedItem('lenstrack_customer_details');
}

/**
 * Remove customer details
 */
export function removeCustomerDetails(): void {
  removeEncryptedItem('lenstrack_customer_details');
}

/**
 * Store category ID proof data (encrypted)
 */
export function setCategoryIdProof(data: { fileName: string; fileType: string; fileSize: number; data?: string }): void {
  setEncryptedItem('lenstrack_category_id_proof', data);
}

/**
 * Get category ID proof data (decrypted)
 */
export function getCategoryIdProof(): { fileName: string; fileType: string; fileSize: number; data?: string } | null {
  return getEncryptedItem('lenstrack_category_id_proof');
}

/**
 * Remove category ID proof data
 */
export function removeCategoryIdProof(): void {
  removeEncryptedItem('lenstrack_category_id_proof');
}

/**
 * Store non-sensitive data (not encrypted)
 * Use for store code, language, etc.
 */
export function setNonSensitiveItem(key: string, value: any): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`[SecureStorage] Failed to store ${key}:`, error);
  }
}

/**
 * Get non-sensitive data
 */
export function getNonSensitiveItem<T>(key: string): T | null {
  try {
    const item = localStorage.getItem(key);
    if (!item) return null;
    return JSON.parse(item) as T;
  } catch (error) {
    console.error(`[SecureStorage] Failed to retrieve ${key}:`, error);
    return null;
  }
}

/**
 * Remove non-sensitive data
 */
export function removeNonSensitiveItem(key: string): void {
  localStorage.removeItem(key);
}

