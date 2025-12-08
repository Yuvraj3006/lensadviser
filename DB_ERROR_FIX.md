# 🔧 Database 500 Error Fix

## ⚠️ **Current Error:**

```
DATABASE_CONNECTION_ERROR: Database connection timeout
```

## 🔍 **Root Cause:**

MongoDB Atlas connection is timing out. The error shows:
- `Server selection timeout: No available servers`
- `I/O error: received fatal alert: InternalError`

## ✅ **Fix Steps:**

### **1. Check MongoDB Atlas Cluster**

1. Go to: https://cloud.mongodb.com/
2. Login to your account
3. Check if cluster is **RUNNING** (not paused)
4. If paused, click **"Resume"** button
5. **Wait 2-3 minutes** for cluster to fully start

### **2. Whitelist IP Address**

1. In MongoDB Atlas dashboard
2. Go to **"Network Access"** (left sidebar)
3. Click **"Add IP Address"**
4. For development, click **"Allow Access from Anywhere"** (0.0.0.0/0)
5. Click **"Confirm"**

### **3. Verify Connection String**

Your `.env` file should have:
```
DATABASE_URL="mongodb+srv://yuvraj3062002_db_user:XA7l2riXrEFjt8B3@cluster0.ssxmcmv.mongodb.net/lenstrack?retryWrites=true&w=majority&appName=Cluster0&connectTimeoutMS=30000&serverSelectionTimeoutMS=30000"
```

### **4. Restart Server**

After fixing MongoDB Atlas:
```bash
# Stop current server (Ctrl+C)
# Then restart
npm run dev
```

### **5. Test Connection**

```bash
# Test API
curl 'http://localhost:3000/api/public/verify-store?code=MAIN-001'

# Should return:
# {"success":true,"data":{"code":"MAIN-001",...}}
```

---

## 🚀 **Quick Fix Checklist:**

- [ ] MongoDB Atlas cluster is **RUNNING** (not paused)
- [ ] IP address is **whitelisted** in Network Access
- [ ] Waited **2-3 minutes** after resuming cluster
- [ ] Server is **restarted** after fixing Atlas
- [ ] Connection string is correct in `.env`

---

## 💡 **Alternative: Use Local MongoDB**

If MongoDB Atlas continues to have issues:

1. **Install MongoDB:**
   ```bash
   brew install mongodb-community
   ```

2. **Start MongoDB:**
   ```bash
   brew services start mongodb-community
   ```

3. **Update .env:**
   ```
   DATABASE_URL="mongodb://localhost:27017/lenstrack"
   ```

4. **Push Schema & Seed:**
   ```bash
   npx prisma db push
   npm run db:seed
   ```

---

*After fixing, all APIs will work! ✅*

