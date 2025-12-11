# API 400/500 Errors - Diagnosis & Fix Guide

## 🔍 Common Issues Found

### 1. **Async Params Handling** ✅ (Mostly Fixed)
- **Status**: Most routes correctly handle `params` as `Promise<{ id: string }>`
- **Issue**: Next.js 15 requires `await params` before accessing route parameters
- **Fixed Routes**: Most routes are using `const { id } = await params;`
- **Check**: All routes with dynamic segments should await params

### 2. **Error Handling** ✅ (Good Coverage)
- **Status**: Most routes have try-catch blocks
- **Pattern**: Using `handleApiError(error)` for consistent error responses
- **Issue**: Some routes might not catch all error types

### 3. **Validation Errors (400)**
Common causes:
- Missing required fields in request body
- Invalid data types (e.g., string instead of number)
- Zod validation failures
- Missing authentication tokens
- Invalid route parameters

### 4. **Server Errors (500)**
Common causes:
- Database connection issues (MongoDB Atlas)
- Prisma query errors (P2002, P2011, P2012, etc.)
- Missing null checks before accessing object properties
- Type mismatches (BigInt, Date serialization)
- Missing await on async operations

## 📋 Diagnostic Checklist

### For 400 Errors:
- [ ] Check request body structure matches schema
- [ ] Verify all required fields are present
- [ ] Check data types (numbers vs strings)
- [ ] Validate authentication token is present
- [ ] Check route parameters are valid
- [ ] Review Zod validation schemas

### For 500 Errors:
- [ ] Check database connection (MongoDB Atlas status)
- [ ] Verify Prisma client is initialized
- [ ] Check for null/undefined before property access
- [ ] Verify all async operations have `await`
- [ ] Check for BigInt/Date serialization issues
- [ ] Review error logs for Prisma error codes

## 🔧 Common Prisma Error Codes

| Code | Meaning | HTTP Status | Fix |
|------|---------|-------------|-----|
| P2002 | Unique constraint violation | 409 | Check for duplicate entries |
| P2003 | Foreign key constraint | 400 | Verify referenced record exists |
| P2011 | Null constraint violation | 400 | Check required fields |
| P2012 | Missing required value | 400 | Verify all required fields |
| P2019 | Input error | 400 | Check field types and values |
| P2025 | Record not found | 404 | Verify record exists |
| P2010 | Connection timeout | 503 | Check MongoDB connection |

## 🛠️ Quick Fixes

### Fix 1: Add Missing Try-Catch
```typescript
export async function GET(request: NextRequest) {
  try {
    // Your code here
  } catch (error) {
    return handleApiError(error);
  }
}
```

### Fix 2: Handle Async Params
```typescript
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params; // ✅ Correct
    // NOT: const { id } = params; // ❌ Wrong
  } catch (error) {
    return handleApiError(error);
  }
}
```

### Fix 3: Add Null Checks
```typescript
// ❌ Bad
const name = user.profile.name;

// ✅ Good
const name = user?.profile?.name || 'Unknown';
```

### Fix 4: Handle JSON Parsing
```typescript
let body;
try {
  body = await request.json();
} catch (parseError) {
  throw new ValidationError('Invalid JSON in request body');
}
```

### Fix 5: Serialize BigInt/Date
```typescript
function deepSerialize(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'bigint') return Number(obj);
  if (obj instanceof Date) return obj.toISOString();
  if (Array.isArray(obj)) return obj.map(item => deepSerialize(item));
  if (typeof obj === 'object') {
    const serialized: any = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        serialized[key] = deepSerialize(obj[key]);
      }
    }
    return serialized;
  }
  return obj;
}
```

## 🔍 Routes to Check

### High Priority (Recently Modified):
1. `/api/auth/session` - Authentication issues
2. `/api/order/create` - Order creation errors
3. `/api/admin/lens-products` - Product management
4. `/api/admin/lenses` - Lens management
5. `/api/admin/benefits/all` - Benefits API

### Common Error Patterns:
1. **Missing await on params**: Check all routes with `[id]` or `[sessionId]`
2. **Missing validation**: Check POST/PUT routes for Zod schemas
3. **Database queries**: Check for null checks before accessing relations
4. **JSON parsing**: Check all routes that parse request body

## 📊 Error Logging

All errors should be logged with:
```typescript
console.error('[RouteName] Error:', error);
console.error('[RouteName] Error type:', typeof error);
console.error('[RouteName] Error message:', error?.message);
console.error('[RouteName] Error stack:', error?.stack);
```

## 🚀 Testing Steps

1. **Check Database Connection**:
   ```bash
   curl http://localhost:3000/api/health/db
   ```

2. **Test Authentication**:
   ```bash
   curl -H "Authorization: Bearer <token>" http://localhost:3000/api/auth/session
   ```

3. **Check Specific Routes**:
   - Test with valid data
   - Test with missing fields
   - Test with invalid data types
   - Test with invalid IDs

## 📝 Next Steps

1. Review error logs in console/terminal
2. Check MongoDB Atlas connection status
3. Verify environment variables are set
4. Test individual routes with Postman/curl
5. Check for TypeScript compilation errors
6. Review Prisma schema matches database

## 🔗 Related Files

- `lib/errors.ts` - Error handling utilities
- `lib/prisma.ts` - Database connection
- `middleware/auth.middleware.ts` - Authentication
- `API_ERROR_FIXES_SUMMARY.md` - Previous fixes
