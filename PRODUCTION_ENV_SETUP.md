# 🚀 Production Environment Variables Setup

## Quick Setup Guide

### Step 1: Generate Secrets

Run the secret generator script:
```bash
npx tsx scripts/generate-secrets.ts
```

This will output:
```
JWT_SECRET=<64-character-hex-string>
NEXT_PUBLIC_STORAGE_SECRET=<64-character-hex-string>
```

### Step 2: Set in Your Deployment Platform

#### For Vercel:
1. Go to your project → Settings → Environment Variables
2. Add each variable:
   - **Name:** `JWT_SECRET`
   - **Value:** `<generated-jwt-secret>`
   - **Environment:** Production, Preview, Development
   
   - **Name:** `NEXT_PUBLIC_STORAGE_SECRET`
   - **Value:** `<generated-storage-secret>`
   - **Environment:** Production, Preview, Development
3. Click "Save"
4. Redeploy your application

#### For Railway:
1. Go to your project → Variables
2. Click "New Variable"
3. Add:
   - `JWT_SECRET` = `<generated-jwt-secret>`
   - `NEXT_PUBLIC_STORAGE_SECRET` = `<generated-storage-secret>`
4. Save and redeploy

#### For Other Platforms:
Add the environment variables in your platform's configuration:
- **Render:** Environment → Environment Variables
- **Heroku:** Settings → Config Vars
- **AWS/Docker:** Add to `.env` or environment configuration

### Step 3: Verify Setup

After deployment, verify:
1. ✅ Login works correctly
2. ✅ Prescription data saves/loads (encrypted)
3. ✅ Customer details save/load (encrypted)
4. ✅ No console errors about encryption

---

## Required Environment Variables

### Production (Required)
```bash
DATABASE_URL="mongodb://..."
JWT_SECRET="<64-character-hex-string>"
NEXT_PUBLIC_STORAGE_SECRET="<64-character-hex-string>"
NODE_ENV="production"
```

### Optional (Recommended)
```bash
ALLOWED_ORIGINS="https://yourdomain.com"
JWT_EXPIRY="7d"
```

---

## Security Checklist

- [ ] Generated unique secrets (different from development)
- [ ] Set `NEXT_PUBLIC_STORAGE_SECRET` (64 characters)
- [ ] Set `JWT_SECRET` (64 characters)
- [ ] Set `NODE_ENV=production`
- [ ] Verified secrets are NOT in Git
- [ ] Tested encryption/decryption after deployment
- [ ] Verified httpOnly cookies are working

---

## Example Values (DO NOT USE IN PRODUCTION)

These are examples - generate your own:

```bash
# Example JWT_SECRET (64 chars)
JWT_SECRET=a4a106523746e82b4cfd753582ebb1f328bf027e126ea12d504b2b6d731aaaff

# Example NEXT_PUBLIC_STORAGE_SECRET (64 chars)
NEXT_PUBLIC_STORAGE_SECRET=00241d26b0f17c8329bacc3153b1567d9e48f87d5a40ffd878fca8c9935667f0
```

**⚠️ Generate your own secrets using:**
```bash
npx tsx scripts/generate-secrets.ts
```

---

## Troubleshooting

### Issue: "Failed to decrypt data"
**Solution:** 
- Ensure `NEXT_PUBLIC_STORAGE_SECRET` is set in production
- Verify it's the same value across all instances
- Check it's at least 32 characters

### Issue: "Encryption failed"
**Solution:**
- Verify `NEXT_PUBLIC_STORAGE_SECRET` is set correctly
- Ensure it's a valid hex string (64 characters)
- Redeploy after setting the variable

### Issue: Data not persisting
**Solution:**
- Check browser console for errors
- Verify encryption/decryption is working
- Test with a fresh browser session

---

*For detailed security information, see `DEPLOYMENT_SECURITY.md`*

