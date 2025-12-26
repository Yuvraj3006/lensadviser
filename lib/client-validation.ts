/**
 * Client-Side Validation Utilities
 * Provides Zod schemas and validation helpers for frontend forms
 */

import { z } from 'zod';
import { passwordSchema } from './password-validation';

/**
 * Re-export commonly used schemas for client-side validation
 */
export { LoginSchema, CreateUserSchema, UpdateUserSchema, CreateStoreSchema } from './validation';
export { passwordSchema, validatePassword, getPasswordStrength, getPasswordStrengthLabel } from './password-validation';

/**
 * Client-side form validation helper
 * Returns formatted errors for display in forms
 */
export function formatZodErrors(error: z.ZodError): Record<string, string> {
  const formatted: Record<string, string> = {};
  
  error.errors.forEach((err) => {
    const path = err.path.join('.');
    if (!formatted[path]) {
      formatted[path] = err.message;
    }
  });
  
  return formatted;
}

/**
 * Validate form data on client side
 * Returns { valid: boolean, errors?: Record<string, string> }
 */
export function validateFormData<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { valid: true; data: T } | { valid: false; errors: Record<string, string> } {
  try {
    const validated = schema.parse(data);
    return { valid: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        valid: false,
        errors: formatZodErrors(error),
      };
    }
    return {
      valid: false,
      errors: { _general: 'Validation failed' },
    };
  }
}

/**
 * React hook helper for form validation
 * Use this in React components for real-time validation
 */
export function useFormValidation<T>(schema: z.ZodSchema<T>) {
  return {
    validate: (data: unknown) => validateFormData(schema, data),
    formatErrors: (error: z.ZodError) => formatZodErrors(error),
  };
}

