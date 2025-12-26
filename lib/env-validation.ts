/**
 * Environment Variable Validation
 * Validates all required environment variables on startup
 * Fails fast if configuration is invalid
 */

import { z } from 'zod';

/**
 * Environment variable schema
 * Validates all required and optional environment variables
 */
const envSchema = z.object({
  // Required
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  
  // Optional with defaults
  JWT_EXPIRY: z.string().default('7d'),
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  NEXT_PUBLIC_STORAGE_SECRET: z.string().min(32).optional(),
  ALLOWED_ORIGINS: z.string().optional(),
  REDIS_URL: z.string().url().optional(),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
});

/**
 * Validated environment variables
 * Type-safe access to environment variables
 */
export type Env = z.infer<typeof envSchema>;

let validatedEnv: Env | null = null;

/**
 * Validate and return environment variables
 * Throws error if validation fails
 */
export function getEnv(): Env {
  if (validatedEnv) {
    return validatedEnv;
  }

  try {
    validatedEnv = envSchema.parse(process.env);
    return validatedEnv;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.issues.map(e => `${e.path.join('.')}: ${e.message}`).join('\n');
      throw new Error(
        `Environment variable validation failed:\n${missingVars}\n\n` +
        'Please check your .env file and ensure all required variables are set.'
      );
    }
    throw error;
  }
}

/**
 * Validate environment variables on module load (for server-side)
 * This ensures the app fails fast on startup if config is wrong
 */
if (typeof window === 'undefined') {
  try {
    getEnv();
  } catch (error) {
    console.error('❌ Environment validation failed:', error);
    // In production, we might want to exit the process
    if (process.env.NODE_ENV === 'production') {
      console.error('Exiting due to invalid environment configuration');
      process.exit(1);
    }
  }
}

/**
 * Helper to check if we're in production
 */
export function isProduction(): boolean {
  return getEnv().NODE_ENV === 'production';
}

/**
 * Helper to check if we're in development
 */
export function isDevelopment(): boolean {
  return getEnv().NODE_ENV === 'development';
}

