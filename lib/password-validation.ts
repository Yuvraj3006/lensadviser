/**
 * Password Validation
 * Enforces strong password policy
 */

import { z } from 'zod';

/**
 * Common passwords that should be rejected
 */
const COMMON_PASSWORDS = [
  'password',
  '123456',
  '12345678',
  '123456789',
  '1234567890',
  'admin',
  'admin123',
  'password123',
  'qwerty',
  'abc123',
  'letmein',
  'welcome',
  'monkey',
  '1234567',
  'sunshine',
  'princess',
  'dragon',
  'passw0rd',
  'master',
  'hello',
  'freedom',
  'whatever',
  'qazwsx',
  'trustno1',
  'jordan23',
  'harley',
  'hunter',
  'robert',
  'matthew',
  'jordan',
  'michelle',
  'charlie',
  'andrew',
  'michael',
  'shadow',
  'superman',
  'qwerty123',
  'football',
  'baseball',
  'iloveyou',
  'jennifer',
  'hockey',
  'asshole',
  'fuckyou',
  '1234',
  'soccer',
  'anthony',
  'fuckme',
  'joshua',
  'tigger',
  'suckit',
  'fuck',
  'daniel',
  'summer',
  'winter',
  'spring',
  'jessica',
  'computer',
  'internet',
];

/**
 * Password validation schema
 * Enforces:
 * - Minimum 12 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 * - At least one special character
 */
export const passwordSchema = z
  .string()
  .min(12, 'Password must be at least 12 characters long')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character')
  .refine(
    (password) => !COMMON_PASSWORDS.includes(password.toLowerCase()),
    'Password is too common. Please choose a more unique password.'
  );

/**
 * Validate password strength
 * @param password - Password to validate
 * @returns Validation result with error message if invalid
 */
export function validatePassword(password: string): { valid: boolean; error?: string } {
  try {
    passwordSchema.parse(password);
    return { valid: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        valid: false,
        error: error.issues[0]?.message || 'Password does not meet requirements',
      };
    }
    return {
      valid: false,
      error: 'Invalid password format',
    };
  }
}

/**
 * Check if password is common (without full validation)
 * Useful for client-side checks
 */
export function isCommonPassword(password: string): boolean {
  return COMMON_PASSWORDS.includes(password.toLowerCase());
}

/**
 * Get password strength score (0-4)
 * 0 = very weak
 * 1 = weak
 * 2 = fair
 * 3 = good
 * 4 = strong
 */
export function getPasswordStrength(password: string): number {
  let score = 0;

  // Length check
  if (password.length >= 12) score++;
  if (password.length >= 16) score++;

  // Character variety
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  // Penalty for common passwords
  if (isCommonPassword(password)) {
    score = Math.max(0, score - 2);
  }

  // Cap at 4
  return Math.min(4, Math.floor(score / 2));
}

/**
 * Get password strength label
 */
export function getPasswordStrengthLabel(password: string): string {
  const strength = getPasswordStrength(password);
  const labels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'];
  return labels[strength] || 'Very Weak';
}

