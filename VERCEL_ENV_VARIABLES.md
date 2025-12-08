# Vercel Environment Variables - Exact Values

## Vercel Dashboard mein ye exact variables add karo:

### 1. DATABASE_URL (Required)
```
mongodb+srv://yuvraj3062002_db_user:XA7l2riXrEFjt8B3@cluster0.ssxmcmv.mongodb.net/lenstrack?retryWrites=true&w=majority&appName=Cluster0&connectTimeoutMS=60000&serverSelectionTimeoutMS=60000&socketTimeoutMS=60000&maxPoolSize=10&minPoolSize=1
```

**Vercel Settings:**
- **Name**: `DATABASE_URL`
- **Value**: (upar wala string)
- **Environment**: ✅ Production, ✅ Preview, ✅ Development (sabme add karo)

---

### 2. JWT_SECRET (Required)
```
lenstrack-super-secret-jwt-key-min-32-characters-production-ready-2025
```

**Vercel Settings:**
- **Name**: `JWT_SECRET`
- **Value**: (upar wala string)
- **Environment**: ✅ Production, ✅ Preview, ✅ Development

---

### 3. JWT_EXPIRY (Optional - Default hai)
```
7d
```

**Vercel Settings:**
- **Name**: `JWT_EXPIRY`
- **Value**: `7d`
- **Environment**: ✅ Production, ✅ Preview, ✅ Development

---

### 4. NODE_ENV (Optional - Vercel automatically set karta hai)
```
production
```

**Note**: Vercel automatically `NODE_ENV=production` set karta hai, manually add karne ki zarurat nahi.

---

## Step-by-Step Vercel Setup:

1. **Vercel Dashboard** kholo: https://vercel.com/dashboard
2. Apni project **lensadviser** select karo
3. **Settings** tab pe click karo
4. Left sidebar se **Environment Variables** select karo
5. Har variable add karo:

### Variable 1: DATABASE_URL
- Click **"Add New"**
- **Key**: `DATABASE_URL`
- **Value**: 
  ```
  mongodb+srv://yuvraj3062002_db_user:XA7l2riXrEFjt8B3@cluster0.ssxmcmv.mongodb.net/lenstrack?retryWrites=true&w=majority&appName=Cluster0&connectTimeoutMS=60000&serverSelectionTimeoutMS=60000&socketTimeoutMS=60000&maxPoolSize=10&minPoolSize=1
  ```
- **Environment**: Production, Preview, Development (sabme check karo)
- **Save** karo

### Variable 2: JWT_SECRET
- Click **"Add New"**
- **Key**: `JWT_SECRET`
- **Value**: 
  ```
  lenstrack-super-secret-jwt-key-min-32-characters-production-ready-2025
  ```
- **Environment**: Production, Preview, Development (sabme check karo)
- **Save** karo

### Variable 3: JWT_EXPIRY
- Click **"Add New"**
- **Key**: `JWT_EXPIRY`
- **Value**: `7d`
- **Environment**: Production, Preview, Development (sabme check karo)
- **Save** karo

---

## After Adding Variables:

1. **Deployments** tab pe jao
2. Latest deployment ke right side pe **"..."** (three dots) click karo
3. **"Redeploy"** select karo
4. Wait karo build complete hone tak

---

## Verification:

Deploy ke baad test karo:
- `https://your-app.vercel.app/api/health/db` - Database connection check
- `https://your-app.vercel.app/api/auth/login` - Authentication test

---

## Important Security Notes:

⚠️ **Never commit `.env` file to git** (already gitignored hai)
⚠️ **JWT_SECRET** ko production mein strong random string banana chahiye
⚠️ **DATABASE_URL** mein password sensitive hai, share mat karo

