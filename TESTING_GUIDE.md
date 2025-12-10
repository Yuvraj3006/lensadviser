# Testing Guide - After Error Fixes

## ✅ Dev Server Status

**Status**: ✅ Running on http://localhost:3000
**Database**: ✅ Connected (7 stores found)

## 🧪 Testing Steps

### 1. Test Health Check API
```bash
curl http://localhost:3000/api/health/db
```
**Expected**: `{"success":true,"data":{"connected":true,...}}`

### 2. Test Recommendations API

**Step 1**: Create a session
```bash
POST /api/public/questionnaire/sessions
{
  "storeCode": "MAIN-001",
  "category": "EYEGLASSES"
}
```

**Step 2**: Submit answers
```bash
POST /api/public/questionnaire/sessions/{sessionId}/answer
{
  "questionId": "...",
  "optionIds": ["..."]
}
```

**Step 3**: Get recommendations
```bash
GET /api/public/questionnaire/sessions/{sessionId}/recommendations
```

**Expected Response**:
- ✅ `success: true`
- ✅ `recommendations` array with products
- ✅ Each product has `bandPricing` field
- ✅ Each product has `indexRecommendation` field
- ✅ `fourLensOutput` object present

### 3. Check Console for Errors

**Common Errors to Watch For**:
- ❌ "Benefit not found" - Should be handled gracefully now
- ❌ "Cannot read property 'code' of undefined" - Should be fixed
- ❌ "VisionType is not defined" - Should be fixed
- ❌ 500 Internal Server Error - Should be resolved

### 4. Test Band Pricing

**Via Admin Panel**:
1. Go to `/admin/lenses/{lensId}/band-pricing`
2. Create a band pricing rule (e.g., 6-8D = ₹1000 extra)
3. Test with prescription in that range

**Expected**: Band pricing should be applied and shown in recommendations

## 🔍 Debugging

If you see 500 errors:

1. **Check server logs** in terminal
2. **Check browser console** for frontend errors
3. **Check Network tab** for API response details
4. **Look for specific error messages**:
   - "Session not found" → Session ID issue
   - "No answers found" → Need to submit answers first
   - "Benefit not found" → Benefit mapping issue (should be handled now)
   - "Product not found" → Product data issue

## 📝 Error Logging

All errors are now logged with:
- Error message
- Stack trace
- Context (sessionId, etc.)

Check terminal output for detailed error logs.
