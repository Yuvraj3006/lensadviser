# 🔒 Deployment Security Guide

## Environment Variables Setup

### Required Environment Variables

#### 1. JWT_SECRET
**Purpose:** Signing key for JWT tokens  
**Length:** Minimum 32 characters  
**Generate:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

#### 2. NEXT_PUBLIC_STORAGE_SECRET
**Purpose:** Encryption key for localStorage sensitive data  
**Length:** Minimum 32 characters  
**Generate:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

#### 3. DATABASE_URL
**Purpose:** MongoDB connection string  
**Format:** `mongodb://[username:password@]host:port/database`

#### 4. NODE_ENV
**Purpose:** Environment mode  
**Values:** `development` | `production`

#### 5. ALLOWED_ORIGINS (Optional)
**Purpose:** CORS allowed origins  
**Format:** Comma-separated URLs  
**Example:** `https://yourdomain.com,https://www.yourdomain.com`

---

## Quick Setup

### Generate All Secrets at Once
```bash
npx tsx scripts/generate-secrets.ts
```

This will generate:
- `JWT_SECRET` (32 bytes hex)
- `NEXT_PUBLIC_STORAGE_SECRET` (32 bytes hex)

### Manual Generation
```bash
# JWT Secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Storage Secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Deployment Platform Setup

### Vercel
1. Go to Project Settings → Environment Variables
2. Add each variable:
   - `JWT_SECRET` = `<generated-secret>`
   - `NEXT_PUBLIC_STORAGE_SECRET` = `<generated-secret>`
   - `DATABASE_URL` = `<your-mongodb-connection-string>`
   - `NODE_ENV` = `production`
3. Select "Production" environment for all
4. Redeploy

### Railway
1. Go to Project → Variables
2. Add each variable (same as above)
3. Redeploy

### Other Platforms
Add environment variables in your platform's settings:
- **Render:** Environment → Environment Variables
- **Heroku:** Settings → Config Vars
- **AWS/Docker:** `.env` file or environment configuration

---

## Security Checklist

### Pre-Deployment
- [ ] Generate unique secrets for production
- [ ] Never commit secrets to Git
- [ ] Use different secrets for dev/staging/production
- [ ] Set `NODE_ENV=production`
- [ ] Configure CORS with `ALLOWED_ORIGINS`
- [ ] Enable HTTPS only (Secure cookies)

### Post-Deployment
- [ ] Test login/logout functionality
- [ ] Verify httpOnly cookies are set
- [ ] Test encrypted data storage/retrieval
- [ ] Check that tokens are NOT in localStorage
- [ ] Verify API authentication works
- [ ] Test sensitive data encryption/decryption

---

## Security Best Practices

### 1. Secret Management
- ✅ Use different secrets for each environment
- ✅ Rotate secrets every 90 days
- ✅ Never log or expose secrets
- ✅ Use secret management services (AWS Secrets Manager, etc.)

### 2. Cookie Security
- ✅ httpOnly: Prevents JavaScript access
- ✅ Secure: HTTPS only (production)
- ✅ SameSite: Lax (CSRF protection)
- ✅ Max-Age: 7 days (reasonable expiry)

### 3. Data Encryption
- ✅ All sensitive data encrypted before localStorage
- ✅ Encryption key stored in environment variable
- ✅ AES encryption with crypto-js
- ✅ Automatic decryption on retrieval

### 4. API Security
- ✅ All admin APIs require authentication
- ✅ Token validation on every request
- ✅ Role-based authorization
- ✅ Secure API client with automatic token injection

---

## Troubleshooting

### Issue: "Failed to decrypt data"
**Solution:** Ensure `NEXT_PUBLIC_STORAGE_SECRET` is set and matches across all instances

### Issue: "No token found"
**Solution:** Check that cookies are enabled and httpOnly cookies are working

### Issue: "Encryption failed"
**Solution:** Verify `NEXT_PUBLIC_STORAGE_SECRET` is at least 32 characters

### Issue: "Invalid token"
**Solution:** Check `JWT_SECRET` is set correctly and matches the signing key

---

## Environment File Template

Create `.env.local` for local development (DO NOT COMMIT):

```bash
# .env.local (DO NOT COMMIT TO GIT)
DATABASE_URL="mongodb://localhost:27017/lenstrack"
JWT_SECRET="<generate-32-char-secret>"
NEXT_PUBLIC_STORAGE_SECRET="<generate-32-char-secret>"
NODE_ENV="development"
ALLOWED_ORIGINS="http://localhost:3000"
```

---

## Verification Commands

```bash
# Check if secrets are set (local)
echo $JWT_SECRET
echo $NEXT_PUBLIC_STORAGE_SECRET

# Generate new secrets
npx tsx scripts/generate-secrets.ts

# Test encryption (in browser console)
# Should work if NEXT_PUBLIC_STORAGE_SECRET is set
localStorage.setItem('test', 'encrypted-data')
```

---

*Last Updated: 2025-01-23*

