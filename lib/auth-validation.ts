import { z } from 'zod';

// Auth Schemas - Isolated to avoid module load issues
export const LoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

