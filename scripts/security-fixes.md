# Security Fixes Implementation Guide

## Critical Fixes (Do First)

### 1. Update Next.js (URGENT)
```bash
npm update next@latest
npm audit fix
```

### 2. Fix XSS in innerHTML Usage

**File:** `app/questionnaire/[sessionId]/order-success/[orderId]/page.tsx`

**Before:**
```typescript
tempDiv.innerHTML = receiptHTML;
```

**After:**
```typescript
import DOMPurify from 'dompurify';
tempDiv.innerHTML = DOMPurify.sanitize(receiptHTML);
```

**Install:**
```bash
npm install dompurify
npm install --save-dev @types/dompurify
```

### 3. Add Rate Limiting

**Create:** `middleware/rate-limit.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server';

const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export function rateLimit(
  maxRequests: number = 100,
  windowMs: number = 60000 // 1 minute
) {
  return (request: NextRequest) => {
    const ip = request.ip || request.headers.get('x-forwarded-for') || 'unknown';
    const now = Date.now();
    const record = rateLimitMap.get(ip);

    if (!record || now > record.resetTime) {
      rateLimitMap.set(ip, { count: 1, resetTime: now + windowMs });
      return null;
    }

    if (record.count >= maxRequests) {
      return NextResponse.json(
        { error: 'Too many requests, please try again later' },
        { status: 429 }
      );
    }

    record.count++;
    return null;
  };
}
```

### 4. Add Security Headers

**Update:** `next.config.ts`
```typescript
const nextConfig: NextConfig = {
  // ... existing config
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:;",
          },
        ],
      },
    ];
  },
};
```

### 5. Configure CORS

**Create:** `middleware/cors.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server';

const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'];

export function cors(request: NextRequest) {
  const origin = request.headers.get('origin');
  
  if (origin && allowedOrigins.includes(origin)) {
    return {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'true',
    };
  }
  
  return {};
}
```

### 6. Encrypt LocalStorage Data

**Create:** `lib/storage-encryption.ts`
```typescript
import CryptoJS from 'crypto-js';

const SECRET_KEY = process.env.NEXT_PUBLIC_STORAGE_SECRET || 'default-secret-change-in-production';

export function encryptData(data: string): string {
  return CryptoJS.AES.encrypt(data, SECRET_KEY).toString();
}

export function decryptData(encryptedData: string): string {
  const bytes = CryptoJS.AES.decrypt(encryptedData, SECRET_KEY);
  return bytes.toString(CryptoJS.enc.Utf8);
}
```

**Install:**
```bash
npm install crypto-js
npm install --save-dev @types/crypto-js
```

### 7. Implement CSRF Protection

**Create:** `lib/csrf.ts`
```typescript
import { randomBytes } from 'crypto';

export function generateCSRFToken(): string {
  return randomBytes(32).toString('hex');
}

export function validateCSRFToken(token: string, sessionToken: string): boolean {
  // Implement token validation logic
  return token === sessionToken;
}
```

## Testing After Fixes

1. Run security audit: `npx tsx scripts/security-audit.ts`
2. Run npm audit: `npm audit`
3. Test XSS protection
4. Test rate limiting
5. Test CORS configuration

