# 🚀 Quick Deploy Guide - LensTrack

## ⚡ **Fastest Way to Deploy**

### **Step 1: Fix MongoDB Atlas (5 minutes)**

1. **Go to MongoDB Atlas:** https://cloud.mongodb.com/
2. **Resume Cluster** (if paused):
   - Click on your cluster
   - Click "Resume" button
   - Wait 2-3 minutes
3. **Whitelist IP:**
   - Go to "Network Access"
   - Click "Add IP Address"
   - Click "Allow Access from Anywhere" (0.0.0.0/0)
   - Click "Confirm"

### **Step 2: Test Database Connection**

```bash
npm run db:test
```

**Expected Output:**
```
✅ All tests passed! Database is ready for deployment! 🚀
```

**If error:**
- Check MongoDB Atlas cluster is running
- Wait 2-3 minutes after resuming
- Verify IP is whitelisted

### **Step 3: Setup Database**

```bash
# Generate Prisma client
npm run db:generate

# Push schema to database
npm run db:push

# Seed with test data
npm run db:seed
```

### **Step 4: Deploy to Vercel**

```bash
# Install Vercel CLI (if not installed)
npm i -g vercel

# Login
vercel login

# Link project
vercel link

# Add environment variables in Vercel Dashboard:
# - DATABASE_URL (from .env)
# - JWT_SECRET (change to strong random string!)
# - JWT_EXPIRY="7d"
# - NODE_ENV="production"
# - NEXT_PUBLIC_APP_URL="https://your-domain.vercel.app"

# Deploy
vercel --prod
```

### **Step 5: Setup Database on Production**

After deployment, run:

```bash
# Pull production env
vercel env pull .env.production

# Setup database
npm run deploy:setup
```

---

## ✅ **Deployment Checklist**

- [ ] MongoDB Atlas cluster is RUNNING
- [ ] IP whitelisted in Network Access
- [ ] Database connection test passes (`npm run db:test`)
- [ ] Schema pushed (`npm run db:push`)
- [ ] Database seeded (`npm run db:seed`)
- [ ] Environment variables set in Vercel
- [ ] JWT_SECRET changed to strong random string
- [ ] Application deployed
- [ ] Production database setup complete

---

## 🐛 **Common Issues**

### **Database Connection Timeout**
```bash
# Check connection
npm run db:test

# If fails:
# 1. Resume MongoDB Atlas cluster
# 2. Whitelist IP (0.0.0.0/0 for Vercel)
# 3. Wait 2-3 minutes
```

### **Prisma Client Not Found**
```bash
npm run db:generate
```

### **Schema Not Synced**
```bash
npm run db:push
```

---

## 📚 **Full Documentation**

- **MongoDB Setup:** `MONGODB_SETUP.md`
- **Deployment Guide:** `DEPLOYMENT_MONGODB.md`
- **Database Fix:** `DB_ERROR_FIX.md`

---

**Ready to deploy? Start with Step 1! 🚀**

