# Vercel Environment Variables Setup

## Required Environment Variables

Backend ko work karne ke liye Vercel pe ye environment variables configure karni hain:

### 1. Database Connection
```
DATABASE_URL=mongodb+srv://username:password@cluster.mongodb.net/database?retryWrites=true&w=majority
```

### 2. JWT Authentication
```
JWT_SECRET=your-very-secure-secret-key-here-minimum-32-characters
JWT_EXPIRY=7d
```

### 3. Node Environment (Optional)
```
NODE_ENV=production
```

## Vercel mein kaise add karein:

1. Vercel Dashboard mein jao: https://vercel.com/dashboard
2. Apni project select karo
3. **Settings** → **Environment Variables** pe jao
4. Har variable add karo:
   - **Name**: `DATABASE_URL`
   - **Value**: Apna MongoDB connection string
   - **Environment**: Production, Preview, Development (sabme add karo)

5. Same process se add karo:
   - `JWT_SECRET` (strong random string)
   - `JWT_EXPIRY` (default: `7d`)

## Important Notes:

- ✅ `.env` file git mein commit nahi hota (security ke liye)
- ✅ Vercel pe manually environment variables add karni padti hain
- ✅ MongoDB Atlas se connection string copy karo
- ✅ JWT_SECRET ko strong random string banana chahiye

## MongoDB Atlas Setup:

1. MongoDB Atlas account banao
2. Cluster create karo
3. Database user create karo
4. Connection string copy karo
5. Vercel pe `DATABASE_URL` mein paste karo

## Test karna:

Environment variables add karne ke baad:
1. Vercel pe redeploy karo
2. `/api/health/db` endpoint test karo
3. Database connection verify karo

