/**
 * Storage Encryption Utility
 * Encrypts/decrypts sensitive data before storing in localStorage
 * Uses AES encryption with a secret key
 */

import CryptoJS from 'crypto-js';

// Use environment variable or fallback (should be set in production)
const STORAGE_SECRET = process.env.NEXT_PUBLIC_STORAGE_SECRET || 'lenstrack-storage-secret-change-in-production';

/**
 * Encrypt data before storing in localStorage
 */
export function encryptData(data: string): string {
  try {
    return CryptoJS.AES.encrypt(data, STORAGE_SECRET).toString();
  } catch (error) {
    console.error('[StorageEncryption] Encryption failed:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypt data retrieved from localStorage
 */
export function decryptData(encryptedData?: string): string | null {
  try {
    if (!encryptedData) {
      return null;
    }

    const bytes = CryptoJS.AES.decrypt(encryptedData, STORAGE_SECRET);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    
    if (!decrypted) {
      return null;
    }
    
    return decrypted;
  } catch (error) {
    console.error('[StorageEncryption] Decryption failed:', error);
    return null;
  }
}

/**
 * Safely store encrypted data in localStorage
 */
export function setEncryptedItem(key: string, value: any): void {
  try {
    const jsonString = JSON.stringify(value);
    const encrypted = encryptData(jsonString);
    localStorage.setItem(key, encrypted);
  } catch (error) {
    console.error(`[StorageEncryption] Failed to store ${key}:`, error);
    throw error;
  }
}

/**
 * Safely retrieve and decrypt data from localStorage
 */
export function getEncryptedItem<T>(key: string): T | null {
  try {
    const encrypted = localStorage.getItem(key);
    if (!encrypted) {
      return null;
    }
    
    const decrypted = decryptData(encrypted);
    if (!decrypted) {
      localStorage.removeItem(key);
      return null;
    }
    return JSON.parse(decrypted) as T;
  } catch (error) {
    console.error(`[StorageEncryption] Failed to retrieve ${key}:`, error);
    // If decryption fails, try to remove corrupted data
    localStorage.removeItem(key);
    return null;
  }
}

/**
 * Remove encrypted item from localStorage
 */
export function removeEncryptedItem(key: string): void {
  localStorage.removeItem(key);
}

/**
 * Check if encrypted item exists
 */
export function hasEncryptedItem(key: string): boolean {
  return localStorage.getItem(key) !== null;
}

