# ✅ Production Environment Variables Checklist

## ✅ Already Added (3/6 Required)

### 1. ✅ DATABASE_URL
- **Status:** ✅ Added (All Environments)
- **Value:** Your database connection string
- **Note:** Good! ✅

### 2. ✅ JWT_SECRET
- **Status:** ✅ Added (All Environments)
- **Value:** `f1bbbbed8ab784fdc0de644f7c9df15b136ba6bfda9cd9fc4f9a1fd4797c37db`
- **Note:** Good! ✅

### 3. ✅ NEXT_PUBLIC_STORAGE_SECRET
- **Status:** ⚠️ Added (Production Only)
- **Issue:** Should be in **All Environments** (Development, Preview, Production)
- **Why:** Used in browser for encrypting sensitive data
- **Action:** Add to Development and Preview environments too

---

## ⚠️ Missing Required Variables (3/6)

### 4. ❌ NEXT_PUBLIC_APP_URL
- **Status:** ❌ **MISSING**
- **Required:** Yes
- **Description:** Base URL of your application
- **Development:** `http://localhost:3000`
- **Production:** `https://yourdomain.com` (your actual domain)
- **Why Needed:** Used for generating links, redirects, API calls
- **Action:** Add this variable

### 5. ❌ ALLOWED_ORIGINS
- **Status:** ❌ **MISSING**
- **Required:** Yes (for production security)
- **Description:** Comma-separated list of allowed origins for CORS
- **Development:** `http://localhost:3000,http://127.0.0.1:3000`
- **Production:** `https://yourdomain.com,https://www.yourdomain.com` (your actual domains)
- **Why Needed:** Prevents unauthorized origin access (security)
- **Action:** Add this variable

### 6. ⚠️ NODE_ENV
- **Status:** Usually auto-set by platform
- **Required:** Usually automatic
- **Development:** `development`
- **Production:** `production`
- **Note:** Most platforms set this automatically, but verify it's set to `production`

---

## 📋 Optional Variables

### 7. JWT_EXPIRY
- **Status:** Optional (has default)
- **Default:** `7d` (7 days)
- **Description:** JWT token expiration time
- **Action:** Only add if you want to change from default

---

## 🔧 Action Items

### Immediate Actions:

1. **Add NEXT_PUBLIC_APP_URL**
   ```
   Name: NEXT_PUBLIC_APP_URL
   Value (Production): https://yourdomain.com
   Value (Development): http://localhost:3000
   Environments: All Environments
   ```

2. **Add ALLOWED_ORIGINS**
   ```
   Name: ALLOWED_ORIGINS
   Value (Production): https://yourdomain.com,https://www.yourdomain.com
   Value (Development): http://localhost:3000,http://127.0.0.1:3000
   Environments: All Environments
   ```

3. **Fix NEXT_PUBLIC_STORAGE_SECRET**
   ```
   Current: Production Only
   Should Be: All Environments (Development, Preview, Production)
   Action: Add to Development and Preview environments
   ```

---

## ✅ Complete Setup Example

### For Vercel/Railway:

**Production Environment:**
```env
DATABASE_URL=<your-production-db-url>
JWT_SECRET=f1bbbbed8ab784fdc0de644f7c9df15b136ba6bfda9cd9fc4f9a1fd4797c37db
NEXT_PUBLIC_STORAGE_SECRET=<your-storage-secret>
NEXT_PUBLIC_APP_URL=https://yourdomain.com
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
NODE_ENV=production
```

**Development Environment:**
```env
DATABASE_URL=<your-dev-db-url>
JWT_SECRET=f1bbbbed8ab784fdc0de644f7c9df15b136ba6bfda9cd9fc4f9a1fd4797c37db
NEXT_PUBLIC_STORAGE_SECRET=<your-storage-secret>
NEXT_PUBLIC_APP_URL=http://localhost:3000
ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
NODE_ENV=development
```

---

## 🔒 Security Notes

1. **NEXT_PUBLIC_STORAGE_SECRET** should be same across all environments OR different (both are valid)
   - Same: Easier to manage, data can be shared
   - Different: More secure, data isolated per environment

2. **ALLOWED_ORIGINS** in production should ONLY include your actual domains
   - Never use `*` (wildcard) in production
   - Include both `www` and non-`www` versions if you use both

3. **NEXT_PUBLIC_APP_URL** must match your actual domain
   - Use HTTPS in production
   - No trailing slash

---

## ✅ Verification Checklist

After adding all variables:

- [ ] `DATABASE_URL` is set (All Environments) ✅
- [ ] `JWT_SECRET` is set (All Environments) ✅
- [ ] `NEXT_PUBLIC_STORAGE_SECRET` is set (All Environments) ⚠️
- [ ] `NEXT_PUBLIC_APP_URL` is set (All Environments) ❌
- [ ] `ALLOWED_ORIGINS` is set (All Environments) ❌
- [ ] `NODE_ENV` is set to `production` in production ✅ (usually auto)

---

## 🚀 Quick Add Commands

If using Vercel CLI:
```bash
vercel env add NEXT_PUBLIC_APP_URL production
vercel env add ALLOWED_ORIGINS production
vercel env add NEXT_PUBLIC_STORAGE_SECRET development
vercel env add NEXT_PUBLIC_STORAGE_SECRET preview
```

---

*Last Updated: 2025-01-23*

