# 🚀 LensTrack - Production Deployment Guide

## Pre-Deployment Checklist

### **Environment Setup:**
- [ ] PostgreSQL production database created
- [ ] Environment variables configured
- [ ] JWT_SECRET is strong (32+ characters)
- [ ] Database backups configured
- [ ] SSL certificates ready (for HTTPS)

---

## **Environment Variables**

Create `.env.production`:

```env
# Database (Production)
DATABASE_URL="postgresql://user:password@your-db-host:5432/lenstrack?schema=public&connection_limit=10&pool_timeout=20"

# JWT Configuration (IMPORTANT: Change these!)
JWT_SECRET="CHANGE-THIS-TO-A-VERY-LONG-RANDOM-STRING-MIN-32-CHARS"
JWT_EXPIRY="7d"

# App Configuration
NODE_ENV="production"
NEXT_PUBLIC_APP_URL="https://yourdomain.com"

# Optional: Rate Limiting
RATE_LIMIT_WINDOW=60000
```

---

## **Deployment Options**

### **Option 1: Vercel (Recommended for Next.js)**

```bash
# 1. Install Vercel CLI
npm i -g vercel

# 2. Login
vercel login

# 3. Link project
vercel link

# 4. Add environment variables in Vercel dashboard
# Go to: Project Settings → Environment Variables
# Add all variables from .env.production

# 5. Deploy
vercel --prod
```

**Database:** Use Vercel Postgres or external PostgreSQL (Neon, Supabase)

---

### **Option 2: Docker Deployment**

Create `Dockerfile`:
```dockerfile
FROM node:20-alpine AS base

# Dependencies
FROM base AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# Builder
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

# Runner
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

Create `docker-compose.yml`:
```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://postgres:postgres@db:5432/lenstrack
      - JWT_SECRET=your-secret-key
      - NODE_ENV=production
    depends_on:
      - db

  db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=lenstrack
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=postgres
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

volumes:
  postgres_data:
```

**Deploy:**
```bash
# Build and run
docker-compose up -d

# Run migrations
docker-compose exec app npx prisma migrate deploy

# Check logs
docker-compose logs -f app
```

---

### **Option 3: VPS/Cloud Server**

```bash
# 1. SSH into your server
ssh user@your-server-ip

# 2. Install dependencies
sudo apt update
sudo apt install -y nodejs npm postgresql nginx

# 3. Clone repository
git clone <your-repo>
cd lenstrack

# 4. Install packages
npm install

# 5. Configure environment
cp .env.example .env
nano .env  # Edit with production values

# 6. Run database migration
npx prisma migrate deploy

# 7. Build application
npm run build

# 8. Install PM2 for process management
npm install -g pm2

# 9. Start app
pm2 start npm --name "lenstrack" -- start
pm2 save
pm2 startup

# 10. Configure Nginx reverse proxy
sudo nano /etc/nginx/sites-available/lenstrack
```

**Nginx configuration:**
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

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/lenstrack /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# Setup SSL with Let's Encrypt
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

---

## **Post-Deployment Steps**

### **1. Run Database Migrations:**
```bash
npx prisma migrate deploy
```

### **2. Seed Initial Data (First time only):**
```bash
npm run db:seed
```

### **3. Verify Application:**
- [ ] Login works
- [ ] Dashboard loads
- [ ] Can create stores/users
- [ ] Questionnaire flow works
- [ ] Reports load correctly

### **4. Security Checklist:**
- [ ] Changed default JWT_SECRET
- [ ] Changed default admin passwords
- [ ] HTTPS enabled
- [ ] Database backups configured
- [ ] Firewall configured
- [ ] CORS properly configured

---

## **Database Backup**

### **Automated Backups:**
```bash
# Create backup script
cat > backup.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump lenstrack > /backups/lenstrack_$DATE.sql
# Keep only last 30 days
find /backups -name "lenstrack_*.sql" -mtime +30 -delete
EOF

chmod +x backup.sh

# Add to crontab (daily at 2 AM)
crontab -e
# Add: 0 2 * * * /path/to/backup.sh
```

### **Restore from Backup:**
```bash
psql lenstrack < /backups/lenstrack_20251206_020000.sql
```

---

## **Monitoring & Logs**

### **PM2 Monitoring:**
```bash
# View logs
pm2 logs lenstrack

# Monitor resources
pm2 monit

# Restart app
pm2 restart lenstrack
```

### **Error Tracking:**
Consider adding Sentry for production error tracking.

---

## **Performance Optimization**

### **Database:**
```sql
-- Create additional indexes if needed
CREATE INDEX idx_sessions_created ON "Session"(started_at DESC);
CREATE INDEX idx_sessions_store_status ON "Session"(store_id, status);
```

### **Next.js:**
```bash
# Enable standalone output for smaller Docker images
# In next.config.ts:
output: 'standalone'
```

---

## **Scaling Considerations**

### **Database Connection Pooling:**
Update `DATABASE_URL`:
```
postgresql://user:pass@host:5432/lenstrack?connection_limit=20&pool_timeout=30
```

### **Multiple Instances:**
```bash
# With PM2
pm2 start npm --name "lenstrack" -i 4 -- start
```

---

## **Health Checks**

Create `/api/health/route.ts`:
```typescript
export async function GET() {
  return Response.json({ status: 'ok', timestamp: new Date().toISOString() });
}
```

---

## **Common Issues**

### **Issue: Out of Memory**
```bash
# Increase Node memory
NODE_OPTIONS="--max-old-space-size=4096" npm start
```

### **Issue: Database Connection Timeout**
```
Increase connection_limit in DATABASE_URL
Check PostgreSQL max_connections setting
```

### **Issue: Slow Queries**
```bash
# Enable query logging
# In prisma/schema.prisma:
log: ['query', 'info', 'warn', 'error']

# Analyze slow queries
EXPLAIN ANALYZE <query>
```

---

## **Support & Maintenance**

### **Regular Tasks:**
- Weekly: Review error logs
- Monthly: Database cleanup (old sessions)
- Quarterly: Security updates

### **Update Dependencies:**
```bash
npm outdated
npm update
npm audit fix
```

---

**🎉 Your LensTrack application is production-ready!**

