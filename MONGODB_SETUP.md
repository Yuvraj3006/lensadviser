# 🍃 LensTrack - MongoDB Setup Guide

## ✅ **MongoDB में Switch कर दिया!**

Ab aapka LensTrack application **MongoDB** use kar raha hai! MongoDB setup bahut easy hai! 🚀

---

## 🎯 **Option 1: MongoDB Atlas (Cloud - Recommended) ⭐**

**सबसे आसान option! No local setup needed!**

### **Step 1: Create Free Account**
1. Go to: https://www.mongodb.com/cloud/atlas/register
2. Sign up with email
3. Verify email

### **Step 2: Create Cluster**
1. Click "Create" button
2. Select **FREE M0 Cluster**
3. Choose region: `ap-south-1 (Mumbai)` for India
4. Cluster name: `LensTrack`
5. Click "Create Cluster" (takes 3-5 minutes)

### **Step 3: Create Database User**
1. Click "Database Access" (left sidebar)
2. Click "Add New Database User"
3. Username: `lenstrack`
4. Password: `LensTrack@123` (note it down!)
5. User Privileges: `Read and write to any database`
6. Click "Add User"

### **Step 4: Allow Network Access**
1. Click "Network Access" (left sidebar)
2. Click "Add IP Address"
3. Click "Allow Access from Anywhere" (for development)
4. Confirm

### **Step 5: Get Connection String**
1. Click "Database" (left sidebar)
2. Click "Connect" button on your cluster
3. Click "Connect your application"
4. Copy the connection string:
```
mongodb+srv://lenstrack:<password>@lenstrack.xxxxx.mongodb.net/?retryWrites=true&w=majority
```

### **Step 6: Update .env**
Create `/Users/yuvrajsingh/lenstrack/.env`:
```env
DATABASE_URL="mongodb+srv://lenstrack:LensTrack@123@lenstrack.xxxxx.mongodb.net/lenstrack?retryWrites=true&w=majority"
JWT_SECRET="your-super-secret-jwt-key-min-32-characters-change-this"
JWT_EXPIRY="7d"
NODE_ENV="development"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

**Replace:**
- `<password>` with `LensTrack@123`
- `xxxxx` with your actual cluster ID

---

## 🎯 **Option 2: Local MongoDB**

### **macOS Installation:**
```bash
# Install via Homebrew
brew tap mongodb/brew
brew install mongodb-community@7.0

# Start MongoDB
brew services start mongodb-community@7.0

# Verify it's running
brew services list | grep mongodb
```

### **Update .env:**
```env
DATABASE_URL="mongodb://localhost:27017/lenstrack"
JWT_SECRET="your-super-secret-jwt-key-min-32-characters-change-this"
JWT_EXPIRY="7d"
NODE_ENV="development"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

---

## 🚀 **After MongoDB Setup (Both Options)**

### **Run These Commands:**
```bash
cd /Users/yuvrajsingh/lenstrack

# Generate Prisma Client
npm run db:generate

# Push schema to MongoDB
npm run db:push

# Seed with test data
npm run db:seed

# Start dev server
npm run dev
```

**Expected Output:**
```
✅ Cleaned existing data
✅ Created organization: LensTrack Demo
✅ Created stores: Main Store - Mumbai, Branch Store - Pune
✅ Created users: Super Admin, Admin, Manager, Sales
✅ Created features for Eyeglasses
✅ Created products
✅ Created product features
✅ Created store products
✅ Created questions with options and mappings
✅ Created sample session with answers and recommendations

🎉 Seed completed successfully!
```

### **Open & Test:**
1. Open: http://localhost:3000
2. Login: `admin@lenstrack.com` / `admin123`
3. ✅ Everything works!

---

## 💡 **MongoDB Atlas Benefits (Recommended)**

✅ **Free Forever** - 512 MB storage  
✅ **No Installation** - Cloud-based  
✅ **Auto Backups** - Data safety  
✅ **Global Access** - From anywhere  
✅ **Easy Scaling** - Upgrade when needed  
✅ **Built-in Monitoring** - Performance insights  

---

## 🔧 **Troubleshooting**

### **Issue: "Connection refused"**
**Solution:**
- MongoDB Atlas: Check Network Access (allow your IP)
- Local: Start MongoDB: `brew services start mongodb-community@7.0`

### **Issue: "Authentication failed"**
**Solution:**
- Check username/password in connection string
- MongoDB Atlas: Verify database user credentials

### **Issue: "Database not found"**
**Solution:**
- MongoDB creates database automatically on first write
- Just run `npm run db:seed`

---

## 📊 **View Your Data**

### **Prisma Studio (Works with MongoDB!):**
```bash
npm run db:studio
```
Opens at: http://localhost:5555

### **MongoDB Compass (Optional):**
- Download: https://www.mongodb.com/products/compass
- Connect with your connection string
- Visual database browser

### **MongoDB Atlas Dashboard:**
- Login to Atlas
- Click "Browse Collections"
- See all your data visually

---

## ⚡ **Quick Commands**

```bash
# Generate Prisma Client
npm run db:generate

# Push schema (creates collections)
npm run db:push

# Seed data
npm run db:seed

# View data
npm run db:studio

# Start app
npm run dev
```

---

## 🎊 **MongoDB vs PostgreSQL**

| Feature | PostgreSQL | MongoDB |
|---------|------------|---------|
| **Setup** | Requires local install | Cloud option available |
| **Free Tier** | Self-hosted only | Atlas Free (512 MB) |
| **Schema** | Rigid | Flexible |
| **Scaling** | Vertical | Horizontal |
| **JSON Support** | Good | Native |
| **Best For** | Complex queries | Fast development |

**आपके use case के लिए MongoDB perfect hai!** ✨

---

## 🎯 **What Changed?**

### **Schema Changes:**
- ✅ IDs: `@id @default(auto()) @map("_id") @db.ObjectId`
- ✅ Foreign Keys: `String @db.ObjectId`
- ✅ Decimal → Float (prices)
- ✅ Relationships updated

### **No Code Changes Needed!**
- ✅ API routes work same
- ✅ Pages work same
- ✅ Components work same
- ✅ Logic unchanged

**Just different database, same app!** 🎉

---

## 🚀 **Next Steps:**

### **For Development:**
1. Setup MongoDB Atlas (5 minutes)
2. Update .env with connection string
3. Run db:push and db:seed
4. Start npm run dev
5. ✅ Done!

### **For Production:**
1. MongoDB Atlas Shared Cluster ($0.08/hr ~$60/month)
2. Or MongoDB Atlas Serverless (Pay per use)
3. Enable backups
4. Set up monitoring
5. Deploy app

---

## 📝 **Updated .env Example**

Create `/Users/yuvrajsingh/lenstrack/.env`:

```env
# MongoDB Atlas (Recommended)
DATABASE_URL="mongodb+srv://lenstrack:YourPassword@lenstrack.xxxxx.mongodb.net/lenstrack?retryWrites=true&w=majority"

# OR Local MongoDB
# DATABASE_URL="mongodb://localhost:27017/lenstrack"

# JWT Configuration
JWT_SECRET="change-this-to-a-very-long-random-string-min-32-characters"
JWT_EXPIRY="7d"

# App Configuration
NODE_ENV="development"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

---

## 🎊 **Ready to Go!**

MongoDB setup kar lo aur phir:
```bash
npm run db:generate
npm run db:push
npm run db:seed
npm run dev
```

**Open: http://localhost:3000**  
**Login: admin@lenstrack.com / admin123**

**✅ Everything will work perfectly with MongoDB!** 🎉

---

**MongoDB = Easier Setup + Cloud Ready! ☁️**

