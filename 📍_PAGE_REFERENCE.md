# 📍 LensTrack - Complete Page Reference

## 🔗 **All URLs (11 Pages + 27 APIs)**

---

## 🌐 **Frontend Pages**

### **Public Pages:**
| Page | URL | Description | Status |
|------|-----|-------------|--------|
| **Home** | `/` | Auto-redirects to login/admin | ✅ Working |
| **Login** | `/login` | Beautiful split-screen login | ✅ Working |

### **Admin Panel:**
| Page | URL | Description | Status |
|------|-----|-------------|--------|
| **Dashboard** | `/admin` | Stats, trends, recent sessions | ✅ Working |
| **Stores** | `/admin/stores` | Manage store locations | ✅ Full CRUD |
| **Users** | `/admin/users` | Manage staff with roles | ✅ Full CRUD |
| **Features** | `/admin/features` | Product features catalog | ✅ Full CRUD |
| **Products** | `/admin/products` | Products with feature assignment | ✅ Full CRUD |
| **Questions** | `/admin/questions` | View questions list | ✅ Read-only |
| **Sessions** | `/admin/sessions` | Customer session history | ✅ View + Details |
| **Reports** | `/admin/reports` | Analytics & insights | ✅ 3 report types |

### **Customer Questionnaire:**
| Page | URL | Description | Status |
|------|-----|-------------|--------|
| **Start** | `/questionnaire` | Category selection + customer details | ✅ Working |
| **Questions** | `/questionnaire/[sessionId]` | Dynamic question flow + recommendations | ✅ Working |

---

## 🔌 **API Endpoints**

### **🔐 Authentication (3 endpoints)**
```
POST   /api/auth/login          ✅ Email/password login
GET    /api/auth/session        ✅ Validate token
POST   /api/auth/logout         ✅ Logout user
```

### **🏪 Stores Management (4 endpoints)**
```
GET    /api/admin/stores                 ✅ List stores
POST   /api/admin/stores                 ✅ Create store
PUT    /api/admin/stores/[id]            ✅ Update store
DELETE /api/admin/stores/[id]            ✅ Deactivate store
GET    /api/admin/stores/[id]/stats      ✅ Store statistics
```

### **👥 Users Management (3 endpoints)**
```
GET    /api/admin/users         ✅ List users
POST   /api/admin/users         ✅ Create user (with role validation)
PUT    /api/admin/users/[id]    ✅ Update user
DELETE /api/admin/users/[id]    ✅ Deactivate user
```

### **✨ Features Management (3 endpoints)**
```
GET    /api/admin/features         ✅ List features
POST   /api/admin/features         ✅ Create feature
PUT    /api/admin/features/[id]    ✅ Update feature
DELETE /api/admin/features/[id]    ✅ Deactivate feature
```

### **📦 Products Management (3 endpoints)**
```
GET    /api/admin/products         ✅ List products with features
POST   /api/admin/products         ✅ Create product
PUT    /api/admin/products/[id]    ✅ Update product
DELETE /api/admin/products/[id]    ✅ Deactivate product
```

### **❓ Questions (1 endpoint)**
```
GET    /api/admin/questions     ✅ List questions with options
```

### **📋 Sessions (2 endpoints)**
```
GET    /api/admin/sessions         ✅ List all sessions
GET    /api/admin/sessions/[id]    ✅ Session details (answers + recommendations)
```

### **📊 Reports (1 endpoint)**
```
GET    /api/admin/reports?type=overview    ✅ Overview stats + trend
GET    /api/admin/reports?type=store       ✅ Store-wise performance
GET    /api/admin/reports?type=category    ✅ Category breakdown
```

### **🎯 Customer Questionnaire (3 endpoints)**
```
POST   /api/questionnaire/sessions              ✅ Start new session
POST   /api/questionnaire/sessions/[id]/answer  ✅ Submit answer
POST   /api/questionnaire/sessions/[id]/select  ✅ Select product (conversion)
```

---

## 🎨 **UI Components Available**

| Component | File | Usage |
|-----------|------|-------|
| **Button** | `components/ui/Button.tsx` | Variants: primary, secondary, danger, ghost, outline |
| **Input** | `components/ui/Input.tsx` | Text, email, password, textarea |
| **Select** | `components/ui/Select.tsx` | Dropdown with options |
| **Modal** | `components/ui/Modal.tsx` | Sizes: sm, md, lg, full |
| **Badge** | `components/ui/Badge.tsx` | Colors: blue, green, red, yellow, purple, cyan |
| **Toast** | `components/ui/Toast.tsx` | Types: success, error, warning, info |
| **Card** | `components/ui/Card.tsx` | Container with padding |
| **StatCard** | `components/ui/Card.tsx` | Dashboard stats with trends |
| **DataTable** | `components/data-display/DataTable.tsx` | Sortable table with actions |
| **EmptyState** | `components/ui/EmptyState.tsx` | No data placeholder |
| **Spinner** | `components/ui/Spinner.tsx` | Loading indicator |
| **Sidebar** | `components/layout/Sidebar.tsx` | Navigation menu |

---

## 🗂️ **Database Models**

| Model | Purpose | Key Fields |
|-------|---------|------------|
| **Organization** | Multi-tenant root | name, code |
| **Store** | Store locations | code, name, city, GST |
| **User** | Staff members | email, role, storeId |
| **Product** | Product catalog | SKU, name, brand, price |
| **Feature** | Product attributes | key, name, category |
| **ProductFeature** | Feature assignment | productId, featureId, strength |
| **StoreProduct** | Store inventory | storeId, productId, stock, price |
| **Question** | Questions | textEn/Hi/HiEn, category, order |
| **AnswerOption** | Answer choices | key, textEn/Hi/HiEn, icon |
| **FeatureMapping** | Answer → Feature | questionId, optionKey, weight |
| **Session** | Customer sessions | customer, category, status |
| **SessionAnswer** | Responses | sessionId, questionId, optionId |
| **SessionRecommendation** | AI results | sessionId, productId, matchScore |

---

## 🔑 **Demo Accounts**

| Role | Email | Password | Can Do |
|------|-------|----------|--------|
| **Super Admin** | superadmin@lenstrack.com | admin123 | Everything |
| **Admin** | admin@lenstrack.com | admin123 | Manage stores/users |
| **Manager** | manager@lenstrack.com | admin123 | Manage store staff |
| **Sales** | sales@lenstrack.com | admin123 | Run questionnaires |

---

## 📚 **Documentation Files**

| File | Purpose |
|------|---------|
| **README.md** | Project overview & setup |
| **QUICKSTART.md** | 5-minute setup guide |
| **DEPLOYMENT.md** | Production deployment |
| **START_HERE.md** | Quick reference |
| **📚_COMPLETE_GUIDE.md** | Comprehensive guide |
| **🎉_IMPLEMENTATION_COMPLETE.md** | Achievement summary |
| **🎉_IMPLEMENTATION_SUMMARY_हिंदी.md** | Hindi summary |
| **📍_PAGE_REFERENCE.md** | This file! |
| **FINAL_STATUS.md** | Implementation status |
| **PROGRESS.md** | Development history |

---

## 🛠️ **NPM Scripts**

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run db:generate` | Generate Prisma Client |
| `npm run db:push` | Push schema to database |
| `npm run db:migrate` | Run migrations (production) |
| `npm run db:seed` | Seed test data |
| `npm run db:studio` | Open Prisma Studio |

---

## 🎯 **Common URLs for Testing**

### **After Login:**
```
http://localhost:3000/admin                    → Dashboard
http://localhost:3000/admin/stores             → Stores
http://localhost:3000/admin/users              → Users
http://localhost:3000/admin/features           → Features
http://localhost:3000/admin/products           → Products
http://localhost:3000/admin/questions          → Questions
http://localhost:3000/admin/sessions           → Sessions
http://localhost:3000/admin/reports            → Reports
http://localhost:3000/questionnaire            → Start questionnaire
```

---

## 🔍 **Quick Navigation**

### **Want to:**
- **Setup?** → See QUICKSTART.md
- **Deploy?** → See DEPLOYMENT.md
- **Understand features?** → See 📚_COMPLETE_GUIDE.md
- **See what's done?** → See 🎉_IMPLEMENTATION_COMPLETE.md
- **Test the app?** → See START_HERE.md

---

**🎊 Everything is documented, everything is working!**

**Ready to launch! 🚀**

