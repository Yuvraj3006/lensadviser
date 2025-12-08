# 🚀 LensTrack - MongoDB Deployment Guide

## ⚠️ **IMPORTANT: MongoDB Atlas Setup Required**

Aapka application **MongoDB Atlas** use kar raha hai. Deploy karne se pehle MongoDB Atlas configure karna **MUST** hai!

---

## 📋 **Pre-Deployment Checklist**

### **MongoDB Atlas Setup:**
- [ ] MongoDB Atlas cluster **RUNNING** hai (paused nahi)
- [ ] Database user created hai
- [ ] IP whitelist configured hai (production ke liye specific IPs)
- [ ] Connection string ready hai
- [ ] Database seeded hai (test data)

### **Environment Variables:**
- [ ] `DATABASE_URL` set hai
- [ ] `JWT_SECRET` strong hai (32+ characters)
- [ ] `NODE_ENV=production` set hai
- [ ] `NEXT_PUBLIC_APP_URL` set hai

---

## 🔧 **Step 1: MongoDB Atlas Configuration**

### **1.1 Check Cluster Status**

1. Go to: https://cloud.mongodb.com/
2. Login to your account
3. Check cluster status:
   - ✅ **RUNNING** = Good
   - ⏸️ **PAUSED** = Click "Resume" button
   - ⏳ Wait 2-3 minutes after resuming

### **1.2 Whitelist IP Addresses**

**For Production:**
1. Go to **"Network Access"** (left sidebar)
2. Click **"Add IP Address"**
3. Add your deployment platform IPs:
   - **Vercel**: `0.0.0.0/0` (all IPs) OR specific Vercel IPs
   - **Railway/Render**: `0.0.0.0/0` (recommended)
   - **VPS**: Your server's IP address
4. Click **"Confirm"**

**⚠️ Security Note:** For production, prefer specific IPs over `0.0.0.0/0`

### **1.3 Verify Database User**

1. Go to **"Database Access"** (left sidebar)
2. Check if user exists: `yuvraj3062002_db_user`
3. If not, create new user:
   - Username: `lenstrack_prod`
   - Password: Strong password (save it!)
   - Privileges: `Read and write to any database`

### **1.4 Get Connection String**

1. Go to **"Database"** (left sidebar)
2. Click **"Connect"** on your cluster
3. Click **"Connect your application"**
4. Copy connection string:
   ```
   mongodb+srv://<username>:<password>@cluster0.ssxmcmv.mongodb.net/lenstrack?retryWrites=true&w=majority
   ```

---

## 🚀 **Step 2: Deploy to Vercel (Recommended)**

### **2.1 Install Vercel CLI**
```bash
npm i -g vercel
```

### **2.2 Login**
```bash
vercel login
```

### **2.3 Link Project**
```bash
vercel link
```

### **2.4 Add Environment Variables**

Go to Vercel Dashboard → Your Project → Settings → Environment Variables

Add these:
```env
DATABASE_URL="mongodb+srv://yuvraj3062002_db_user:XA7l2riXrEFjt8B3@cluster0.ssxmcmv.mongodb.net/lenstrack?retryWrites=true&w=majority&appName=Cluster0"
JWT_SECRET="CHANGE-THIS-TO-A-VERY-LONG-RANDOM-STRING-MIN-32-CHARS"
JWT_EXPIRY="7d"
NODE_ENV="production"
NEXT_PUBLIC_APP_URL="https://your-domain.vercel.app"
```

**⚠️ IMPORTANT:** 
- Change `JWT_SECRET` to a strong random string
- Update `NEXT_PUBLIC_APP_URL` with your actual domain

### **2.5 Deploy**
```bash
vercel --prod
```

### **2.6 Run Database Setup**

After deployment, run these commands:

```bash
# Generate Prisma client
npx prisma generate

# Push schema to database
npx prisma db push

# Seed database (first time only)
npm run db:seed
```

**Or use Vercel CLI:**
```bash
vercel env pull .env.production
npx prisma db push
npm run db:seed
```

---

## 🐳 **Step 3: Deploy with Docker**

### **3.1 Create Dockerfile**

```dockerfile
FROM node:20-alpine AS base

# Install dependencies
FROM base AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# Build application
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

EXPOSE 3000
ENV PORT=3000

CMD ["node", "server.js"]
```

### **3.2 Update next.config.ts**

Add this to enable standalone output:
```typescript
output: 'standalone',
```

### **3.3 Create docker-compose.yml**

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - JWT_SECRET=${JWT_SECRET}
      - JWT_EXPIRY=7d
      - NODE_ENV=production
      - NEXT_PUBLIC_APP_URL=http://localhost:3000
    restart: unless-stopped
```

### **3.4 Deploy**

```bash
# Build and run
docker-compose up -d

# Setup database
docker-compose exec app npx prisma db push
docker-compose exec app npm run db:seed

# Check logs
docker-compose logs -f app
```

---

## 🖥️ **Step 4: Deploy to VPS/Server**

### **4.1 Server Setup**

```bash
# SSH into server
ssh user@your-server-ip

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2
sudo npm install -g pm2
```

### **4.2 Clone & Setup**

```bash
# Clone repository
git clone <your-repo-url>
cd lenstrack

# Install dependencies
npm install

# Create .env file
nano .env
```

Add to `.env`:
```env
DATABASE_URL="mongodb+srv://yuvraj3062002_db_user:XA7l2riXrEFjt8B3@cluster0.ssxmcmv.mongodb.net/lenstrack?retryWrites=true&w=majority&appName=Cluster0"
JWT_SECRET="CHANGE-THIS-TO-A-VERY-LONG-RANDOM-STRING"
JWT_EXPIRY="7d"
NODE_ENV="production"
NEXT_PUBLIC_APP_URL="https://yourdomain.com"
```

### **4.3 Database Setup**

```bash
# Generate Prisma client
npx prisma generate

# Push schema
npx prisma db push

# Seed database
npm run db:seed
```

### **4.4 Build & Start**

```bash
# Build application
npm run build

# Start with PM2
pm2 start npm --name "lenstrack" -- start
pm2 save
pm2 startup
```

### **4.5 Setup Nginx (Optional)**

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## ✅ **Step 5: Post-Deployment Verification**

### **5.1 Test Database Connection**

```bash
# Test connection
curl https://your-domain.com/api/health/db

# Should return:
# {"success":true,"data":{"connected":true,"storeCount":X}}
```

### **5.2 Test Application**

- [ ] Homepage loads
- [ ] Store verification works
- [ ] Questionnaire flow works
- [ ] Admin login works
- [ ] All APIs respond correctly

### **5.3 Check Logs**

**Vercel:**
- Go to Vercel Dashboard → Deployments → View Logs

**Docker:**
```bash
docker-compose logs -f app
```

**PM2:**
```bash
pm2 logs lenstrack
```

---

## 🔒 **Security Checklist**

- [ ] Changed default `JWT_SECRET`
- [ ] MongoDB Atlas IP whitelist configured
- [ ] Database user has strong password
- [ ] HTTPS enabled (Vercel auto-enables)
- [ ] Environment variables not in git
- [ ] `.env` file in `.gitignore`

---

## 🐛 **Troubleshooting**

### **Issue: Database Connection Timeout**

**Solution:**
1. Check MongoDB Atlas cluster is running
2. Verify IP is whitelisted
3. Check connection string is correct
4. Wait 2-3 minutes after resuming cluster

### **Issue: Prisma Client Not Found**

**Solution:**
```bash
npx prisma generate
```

### **Issue: Schema Not Synced**

**Solution:**
```bash
npx prisma db push
```

### **Issue: Seed Data Missing**

**Solution:**
```bash
npm run db:seed
```

---

## 📊 **Monitoring**

### **MongoDB Atlas Monitoring:**
- Go to MongoDB Atlas → Metrics
- Monitor: Connections, Operations, Storage

### **Application Monitoring:**
- Vercel: Built-in analytics
- PM2: `pm2 monit`
- Add Sentry for error tracking

---

## 🔄 **Database Backup**

MongoDB Atlas provides automatic backups for paid tiers. For free tier:

```bash
# Manual backup (using mongodump)
mongodump --uri="your-connection-string" --out=/backups/lenstrack-$(date +%Y%m%d)
```

---

## ✅ **Deployment Complete!**

Aapka LensTrack application ab production mein ready hai! 🎉

**Next Steps:**
1. Test all features
2. Monitor logs for errors
3. Setup automated backups
4. Configure monitoring alerts

---

**Need Help?** Check:
- MongoDB Atlas Docs: https://docs.atlas.mongodb.com/
- Vercel Docs: https://vercel.com/docs
- Prisma Docs: https://www.prisma.io/docs

