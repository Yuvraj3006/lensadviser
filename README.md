# LensTrack - Optical Store Management System

An intelligent optical store management system with AI-powered product recommendations built with Next.js, TypeScript, Prisma, and PostgreSQL.

## 🚀 Features

### Core Features
- **Multi-Store Management** - Manage multiple stores with hierarchical organization
- **Role-Based Access Control** - 4 roles: Super Admin, Admin, Store Manager, Sales Executive
- **AI-Powered Recommendations** - Intelligent product matching based on customer needs
- **Dynamic Questionnaire** - Conditional questions with multi-language support
- **Comprehensive Analytics** - Reports, conversion tracking, and performance metrics

### Customer Journey
- **5-Minute Assessment** - Quick questionnaire flow
- **Smart Product Matching** - Match score calculation with feature weighting
- **Multi-Language Support** - English, Hindi, Hinglish
- **Session Tracking** - Complete customer journey analytics

### Admin Panel
- Store Management
- User Management with role hierarchy
- Product Catalog with feature assignments
- Question Builder with conditional logic
- Feature Management
- Reports & Analytics
- Session History

## 🛠️ Tech Stack

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Styling**: Tailwind CSS
- **Authentication**: JWT + bcrypt
- **Validation**: Zod
- **Icons**: Lucide React
- **Charts**: Recharts (ready to integrate)

## 📦 Installation

### Prerequisites
- Node.js 20+
- PostgreSQL 15+
- npm or yarn

### Setup

1. **Clone and install dependencies**
```bash
cd lenstrack
npm install
```

2. **Set up environment variables**
Create a `.env` file in the root directory:
```env
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/lenstrack?schema=public"

# Authentication & Security
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production-min-32-characters"
JWT_EXPIRY="7d"

# Storage Encryption (for sensitive data in localStorage)
NEXT_PUBLIC_STORAGE_SECRET="your-storage-secret-for-encryption-min-32-characters"

# Application
NODE_ENV="development"
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# CORS (Required for production)
ALLOWED_ORIGINS="http://localhost:3000,http://127.0.0.1:3000"
```

**Generate secure secrets:**
```bash
npx tsx scripts/generate-secrets.ts
```

**See `ENV_VARIABLES_CHECKLIST.md` for complete details.**

3. **Set up the database**
```bash
# Generate Prisma Client
npm run db:generate

# Push schema to database (for development)
npm run db:push

# OR run migrations (for production)
npm run db:migrate

# Seed the database with test data
npm run db:seed
```

4. **Run the development server**
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

## 🔑 Demo Credentials

After seeding the database, use these credentials to log in:

- **Super Admin**: `superadmin@lenstrack.com` / `admin123`
- **Admin**: `admin@lenstrack.com` / `admin123`
- **Store Manager**: `manager@lenstrack.com` / `admin123`
- **Sales Executive**: `sales@lenstrack.com` / `admin123`

## 📁 Project Structure

```
lenstrack/
├── app/
│   ├── (auth)/login/          # Login page
│   ├── admin/                 # Admin panel pages
│   │   ├── layout.tsx         # Admin layout with sidebar
│   │   ├── page.tsx           # Dashboard
│   │   ├── stores/            # Store management
│   │   ├── users/             # User management
│   │   ├── products/          # Product management
│   │   ├── questions/         # Question builder
│   │   ├── features/          # Feature management
│   │   ├── reports/           # Analytics
│   │   └── sessions/          # Session history
│   ├── api/
│   │   ├── auth/              # Authentication endpoints
│   │   ├── admin/             # Admin API routes
│   │   └── questionnaire/     # Customer-facing API
│   └── layout.tsx             # Root layout with providers
├── components/
│   ├── ui/                    # Base UI components
│   ├── layout/                # Layout components
│   ├── forms/                 # Form components
│   ├── data-display/          # Data display components
│   └── questionnaire/         # Questionnaire components
├── contexts/
│   ├── AuthContext.tsx        # Authentication state
│   └── ToastContext.tsx       # Toast notifications
├── lib/
│   ├── prisma.ts              # Prisma client
│   ├── auth.ts                # JWT utilities
│   ├── errors.ts              # Error handling
│   └── validation.ts          # Zod schemas
├── middleware/
│   └── auth.middleware.ts     # Auth middleware
├── services/
│   └── recommendation.service.ts  # Recommendation engine
├── prisma/
│   ├── schema.prisma          # Database schema (13 models)
│   └── seed.ts                # Seed data
└── types/
    └── index.ts               # TypeScript types
```

## 🗄️ Database Schema

### 13 Core Models:
1. **Organization** - Multi-tenant root
2. **Store** - Individual store locations
3. **User** - Staff members with roles
4. **Product** - Product catalog
5. **Feature** - Product features (e.g., Blue Light Filter)
6. **ProductFeature** - Junction table with strength values
7. **StoreProduct** - Store-specific inventory and pricing
8. **Question** - Questionnaire questions
9. **AnswerOption** - Question options
10. **FeatureMapping** - Maps answers to feature weights
11. **Session** - Customer sessions
12. **SessionAnswer** - Session answers
13. **SessionRecommendation** - Product recommendations

## 🤖 Recommendation Engine

The recommendation engine uses a **weighted feature matching algorithm**:

1. **Collect Answers** - Get all customer responses
2. **Build Preference Vector** - Aggregate feature weights from mappings
3. **Calculate Match Scores** - Dot product of product features and preferences
4. **Apply Diversity Bonus** - Ensure brand variety in results
5. **Normalize Scores** - 0-100 scale with ranking

### Example:
```
Customer: "8+ hours screen time"
→ Mapping: blue_light_filter +1.8 weight

Product A: blue_light_filter strength 2.0 → 95% match
Product B: blue_light_filter strength 0.6 → 67% match
```

## 🔐 Security

- **Password Hashing**: bcrypt with cost factor 10
- **JWT Tokens**: 7-day expiry, secure secret, httpOnly cookies
- **Data Encryption**: AES encryption for sensitive localStorage data
- **Input Validation**: Zod schemas on all endpoints
- **SQL Injection Prevention**: Prisma parameterized queries
- **Role-Based Access**: Middleware enforcement
- **XSS Protection**: React auto-escaping, encrypted storage
- **Token Security**: httpOnly cookies (no localStorage tokens)

### Environment Variables Required

**Production:**
- `JWT_SECRET` - JWT signing key (32+ characters)
- `NEXT_PUBLIC_STORAGE_SECRET` - Encryption key for localStorage (32+ characters)
- `DATABASE_URL` - MongoDB connection string
- `NODE_ENV` - Set to `production`

**Generate Secrets:**
```bash
npx tsx scripts/generate-secrets.ts
```

See `PRODUCTION_ENV_SETUP.md` for detailed setup instructions.

## 📊 Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint

# Database
npm run db:generate  # Generate Prisma Client
npm run db:push      # Push schema to DB (dev)
npm run db:migrate   # Run migrations (prod)
npm run db:seed      # Seed test data
npm run db:studio    # Open Prisma Studio
```

## 🚧 Current Status

### ✅ Completed
- [x] Database schema with 13 models
- [x] Prisma setup with seed data
- [x] Authentication system (JWT + bcrypt)
- [x] UI component library (Button, Input, Modal, etc.)
- [x] Context providers (Auth, Toast)
- [x] Admin layout with sidebar
- [x] Recommendation engine algorithm
- [x] Login page
- [x] Dashboard page

### 🔨 In Progress
- [ ] Admin CRUD pages (Stores, Users, Products, Questions)
- [ ] API routes for all endpoints
- [ ] Customer questionnaire flow
- [ ] Reports and analytics
- [ ] Session management

### 📋 TODO
- [ ] Complete all admin pages
- [ ] Build questionnaire UI
- [ ] Implement all API endpoints
- [ ] Add charts to reports
- [ ] Add unit tests
- [ ] Add E2E tests
- [ ] Deployment configuration

## 🎯 Next Steps

1. **Complete Admin Pages**
   - Store management CRUD
   - User management with role validation
   - Product catalog with feature assignment
   - Question builder with conditional logic

2. **Build Questionnaire Flow**
   - Category selection
   - Dynamic question rendering
   - Progress tracking
   - Results display

3. **API Implementation**
   - Complete all CRUD endpoints
   - Add pagination and filtering
   - Implement report generation
   - Session lifecycle management

4. **Testing & Deployment**
   - Unit tests for services
   - Integration tests for API
   - E2E tests for critical flows
   - Docker deployment

## 📝 License

This project is proprietary and confidential.

## 👥 Contributors

Built for optical store management and customer service excellence.

---

**Version**: 1.0.0  
**Last Updated**: December 2025
