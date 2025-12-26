/**
 * Generate Secure Secrets for Production
 * Run: npx tsx scripts/generate-secrets.ts
 */

import { randomBytes } from 'crypto';

function generateSecret(length: number = 32): string {
  return randomBytes(length).toString('hex');
}

console.log('\n🔐 Generating Secure Secrets for Production\n');
console.log('='.repeat(80));
console.log('\n📋 Copy these values to your production environment variables:\n');

const jwtSecret = generateSecret(32);
const storageSecret = generateSecret(32);

console.log('JWT_SECRET=' + jwtSecret);
console.log('\nNEXT_PUBLIC_STORAGE_SECRET=' + storageSecret);

console.log('\n' + '='.repeat(80));
console.log('\n⚠️  IMPORTANT SECURITY NOTES:');
console.log('1. Never commit these secrets to version control');
console.log('2. Store them securely in your deployment platform (Vercel, Railway, etc.)');
console.log('3. Use different secrets for development and production');
console.log('4. Rotate secrets periodically (every 90 days recommended)');
console.log('5. Keep secrets at least 32 characters long');
console.log('\n✅ Secrets generated successfully!\n');

