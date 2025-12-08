# 🔧 Database Connection Fix Guide

## ⚠️ **Current Issue**

MongoDB Atlas connection is failing with:
```
Server selection timeout: No available servers
I/O error: received fatal alert: InternalError
```

## 🔍 **Root Cause**

This is a **MongoDB Atlas configuration issue**, not a code issue. Possible causes:

1. **IP Address Not Whitelisted** - MongoDB Atlas requires IP whitelisting
2. **MongoDB Atlas Cluster Paused** - Free tier clusters auto-pause after inactivity
3. **Network/Firewall Issues** - Connection blocked by network
4. **SSL/TLS Handshake Failure** - Certificate or connection issues

---

## ✅ **Solution Steps**

### **Step 1: Check MongoDB Atlas Cluster Status**

1. Go to [MongoDB Atlas Dashboard](https://cloud.mongodb.com/)
2. Check if your cluster is **running** (not paused)
3. If paused, click **"Resume"** to wake it up
4. Wait 2-3 minutes for cluster to fully start

### **Step 2: Whitelist Your IP Address**

1. In MongoDB Atlas, go to **Network Access**
2. Click **"Add IP Address"**
3. Click **"Allow Access from Anywhere"** (for development) OR
4. Add your current IP address
5. Click **"Confirm"**

### **Step 3: Verify Connection String**

Your current connection string:
```
mongodb+srv://yuvraj3062002_db_user:XA7l2riXrEFjt8B3@cluster0.ssxmcmv.mongodb.net/lenstrack?retryWrites=true&w=majority&appName=Cluster0&connectTimeoutMS=30000&serverSelectionTimeoutMS=30000
```

**Verify:**
- Username and password are correct
- Database name is `lenstrack`
- Cluster URL is correct

### **Step 4: Test Connection**

```bash
# Test direct connection
node -e "require('dotenv').config(); const { PrismaClient } = require('@prisma/client'); const prisma = new PrismaClient(); prisma.\$connect().then(() => { console.log('✅ Connected!'); return prisma.\$disconnect(); }).catch(e => console.log('❌ Error:', e.message));"
```

### **Step 5: Seed Database (if empty)**

```bash
# Run seed script
npm run db:seed
```

---

## 🔄 **Alternative: Use Local MongoDB (Development)**

If MongoDB Atlas continues to have issues, you can use local MongoDB:

1. **Install MongoDB locally:**
   ```bash
   brew install mongodb-community  # macOS
   # OR download from mongodb.com
   ```

2. **Start MongoDB:**
   ```bash
   brew services start mongodb-community  # macOS
   ```

3. **Update .env:**
   ```
   DATABASE_URL="mongodb://localhost:27017/lenstrack"
   ```

4. **Push schema:**
   ```bash
   npx prisma db push
   ```

5. **Seed database:**
   ```bash
   npm run db:seed
   ```

---

## ✅ **After Fixing Connection**

1. **Test API:**
   ```bash
   curl 'http://localhost:3000/api/public/verify-store?code=MAIN-001'
   ```

2. **Expected Response:**
   ```json
   {
     "success": true,
     "data": {
       "id": "...",
       "code": "MAIN-001",
       "name": "Main Store - Mumbai",
       ...
     }
   }
   ```

3. **Test Complete Flow:**
   - Store code verification ✅
   - Category selection ✅
   - Questionnaire ✅
   - Recommendations ✅
   - Offers ✅

---

## 📋 **Quick Checklist**

- [ ] MongoDB Atlas cluster is running (not paused)
- [ ] IP address is whitelisted in Network Access
- [ ] Connection string is correct in `.env`
- [ ] Database is seeded with test data
- [ ] Prisma client is generated (`npx prisma generate`)
- [ ] Schema is pushed (`npx prisma db push`)

---

*Last Updated: DB Connection Fix Guide*

