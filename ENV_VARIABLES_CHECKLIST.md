# 🔐 Environment Variables Checklist

## ✅ Required Variables (Must Set)

### 1. Database
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/lenstrack?schema=public"
```
- **Required:** Yes
- **Description:** Database connection string
- **Development:** Local database
- **Production:** Production database URL

---

### 2. JWT Secret
```env
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production-min-32-characters"
```
- **Required:** Yes
- **Description:** Secret key for JWT token generation
- **Minimum Length:** 32 characters
- **Generate:** `npx tsx scripts/generate-secrets.ts`
- **Security:** Must be unique and strong in production

---

### 3. Storage Encryption Secret
```env
NEXT_PUBLIC_STORAGE_SECRET="your-storage-secret-for-encryption-min-32-characters"
```
- **Required:** Yes (for security)
- **Description:** Secret key for encrypting sensitive data in localStorage
- **Minimum Length:** 32 characters
- **Generate:** `npx tsx scripts/generate-secrets.ts`
- **Security:** Must be unique and strong in production
- **Note:** `NEXT_PUBLIC_` prefix is required (used in browser)

---

### 4. Node Environment
```env
NODE_ENV="development"
```
- **Required:** Yes
- **Values:** `development` | `production` | `test`
- **Description:** Environment mode

---

### 5. App URL
```env
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```
- **Required:** Yes
- **Description:** Base URL of your application
- **Development:** `http://localhost:3000`
- **Production:** `https://yourdomain.com`
- **Note:** `NEXT_PUBLIC_` prefix is required (used in browser)

---

## ⚠️ Security Variables (Required for Production)

### 6. CORS Allowed Origins
```env
ALLOWED_ORIGINS="http://localhost:3000,http://127.0.0.1:3000"
```
- **Required:** Yes (for production)
- **Description:** Comma-separated list of allowed origins for CORS
- **Development:** Localhost allowed by default
- **Production:** MUST be set to your actual domain(s)
- **Example:** `ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com`
- **Security:** Prevents unauthorized origin access

---

## 📋 Optional Variables

### 7. JWT Expiry
```env
JWT_EXPIRY="7d"
```
- **Required:** No (has default)
- **Default:** `7d` (7 days)
- **Description:** JWT token expiration time
- **Format:** `1d`, `7d`, `30d`, `1h`, etc.

---

## 🚀 Quick Setup

### Development Setup:
```bash
# 1. Copy example file
cp .env.example .env

# 2. Generate secrets
npx tsx scripts/generate-secrets.ts

# 3. Update .env with generated secrets
# Copy JWT_SECRET and NEXT_PUBLIC_STORAGE_SECRET to .env

# 4. Set database URL
# Update DATABASE_URL with your database connection string
```

### Production Setup:
```bash
# 1. Generate production secrets
npx tsx scripts/generate-secrets.ts

# 2. Set in your deployment platform:
# - Vercel: Project Settings → Environment Variables
# - Railway: Project → Variables
# - Other: Follow platform-specific instructions

# 3. Required variables:
DATABASE_URL=<production-database-url>
JWT_SECRET=<generated-secret-64-chars>
NEXT_PUBLIC_STORAGE_SECRET=<generated-secret-64-chars>
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://yourdomain.com
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

---

## ✅ Verification Checklist

- [ ] `DATABASE_URL` is set and valid
- [ ] `JWT_SECRET` is set (32+ characters)
- [ ] `NEXT_PUBLIC_STORAGE_SECRET` is set (32+ characters)
- [ ] `NODE_ENV` is set (`development` or `production`)
- [ ] `NEXT_PUBLIC_APP_URL` is set
- [ ] `ALLOWED_ORIGINS` is set (for production)
- [ ] All secrets are unique (not default values)
- [ ] Production secrets are different from development

---

## 🔒 Security Notes

1. **Never commit `.env` to Git**
   - Already in `.gitignore`
   - Use `.env.example` for documentation

2. **Use Strong Secrets**
   - Minimum 32 characters
   - Use `scripts/generate-secrets.ts` for generation
   - Different secrets for dev/prod

3. **Production Requirements**
   - `ALLOWED_ORIGINS` must be set
   - `NEXT_PUBLIC_APP_URL` must be HTTPS
   - `JWT_SECRET` must be strong and unique
   - `NEXT_PUBLIC_STORAGE_SECRET` must be strong and unique

---

## 📚 Related Documentation

- **Environment Setup:** `ENV_SETUP_COMPLETE.md`
- **Production Setup:** `PRODUCTION_ENV_SETUP.md`
- **Security Fixes:** `SECURITY_FIXES_COMPLETE.md`
- **Storage Secret Explanation:** `WHY_STORAGE_SECRET.md`

---

*Last Updated: 2025-01-23*

