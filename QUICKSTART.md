# 🚀 LensTrack - Quick Start Guide

## Setup in 5 Minutes! ⏱️

### **Prerequisites:**
- Node.js 20+
- PostgreSQL 15+ running locally

---

## **Step 1: Database Setup**

### **Start PostgreSQL:**
```bash
# macOS (if using Homebrew)
brew services start postgresql@15

# OR check if already running
psql --version
```

### **Create Database:**
```bash
# Login to PostgreSQL
psql postgres

# Create database
CREATE DATABASE lenstrack;

# Exit
\q
```

---

## **Step 2: Install & Configure**

```bash
# Navigate to project
cd /Users/yuvrajsingh/lenstrack

# Install dependencies (if not done)
npm install

# Push schema to database
npm run db:push

# Seed with test data
npm run db:seed
```

**Expected output:**
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

Login credentials:
-----------------------------------
Super Admin: superadmin@lenstrack.com / admin123
Admin:       admin@lenstrack.com / admin123
Manager:     manager@lenstrack.com / admin123
Sales:       sales@lenstrack.com / admin123
-----------------------------------
```

---

## **Step 3: Run the App**

```bash
npm run dev
```

Open browser: **http://localhost:3000**

---

## **Step 4: Test the Complete Flow**

### **🎯 Test 1: Admin Panel (2 minutes)**

1. **Login**
   - Go to http://localhost:3000/login
   - Email: `admin@lenstrack.com`
   - Password: `admin123`
   - Click "Sign In"

2. **Dashboard**
   - See session statistics
   - View recent sessions

3. **Create a Store**
   - Click "Stores" in sidebar
   - Click "Add Store"
   - Fill form:
     - Code: `TEST-001`
     - Name: `Test Store`
     - City: `Delhi`
   - Click "Create"
   - ✅ Store created!

4. **Create a User**
   - Click "Users" in sidebar
   - Click "Add User"
   - Fill form:
     - Name: `Test Sales`
     - Email: `test@lenstrack.com`
     - Password: `Test1234`
     - Role: `Sales Executive`
     - Store: Select "Main Store"
   - Click "Create"
   - ✅ User created!

5. **Create a Feature**
   - Click "Features" in sidebar
   - Click "Add Feature"
   - Fill form:
     - Key: `uv_protection`
     - Name: `UV Protection`
     - Description: `100% UV protection`
     - Category: `Eyeglasses`
   - Click "Create"
   - ✅ Feature created!

6. **Create a Product**
   - Click "Products" in sidebar
   - Click "Add Product"
   - Fill form:
     - SKU: `TEST-001`
     - Name: `Test Eyeglasses`
     - Category: `Eyeglasses`
     - Brand: `TestBrand`
     - Price: `2999`
   - Check features (e.g., Blue Light Filter, strength 1.5)
   - Click "Create"
   - ✅ Product created with features!

---

### **🎯 Test 2: Customer Questionnaire (3 minutes)**

1. **Logout and Login as Sales**
   - Logout from top-right
   - Login with: `sales@lenstrack.com` / `admin123`

2. **Start Questionnaire**
   - Go to `/questionnaire` (or add to sidebar)
   - OR directly: http://localhost:3000/questionnaire

3. **Select Category**
   - Click "Eyeglasses" card
   - Enter customer details (optional):
     - Name: `Rahul Kumar`
     - Phone: `+91-9876543210`
   - Click "Start Questionnaire"

4. **Answer Questions**
   - Question 1: Select "8-12 hours" (screen time)
   - Click "Next"
   - Question 2: Select "Indoor (AC office)"
   - Click "Next"
   - Question 3: Select "31-40 years"
   - Click "Get Recommendations"

5. **View Recommendations**
   - See 3 products with match scores
   - Product with highest match (95%+) ranked #1
   - See match percentage bars
   - See prices and stock status

6. **Select Product**
   - Click "Select This Product" on any product
   - ✅ Session converted!
   - Redirected to sessions list

---

### **🎯 Test 3: View Session & Reports**

1. **View Sessions**
   - Click "Sessions" in sidebar
   - See your newly created session
   - Click "View" button
   - See all answers and recommendations
   - Selected product highlighted in green
   - ✅ Complete session history!

2. **View Reports**
   - Click "Reports" in sidebar
   - View Overview Report:
     - Total sessions
     - Conversion rate
     - Daily trend chart
   - Change to "Store-wise Performance"
   - See all stores comparison
   - Change to "Category Breakdown"
   - See sessions by category
   - ✅ Analytics working!

---

## **🎊 Congratulations!**

You've successfully:
- ✅ Set up the database
- ✅ Created stores, users, features, and products
- ✅ Ran a complete customer questionnaire
- ✅ Got AI-powered recommendations
- ✅ Converted a session
- ✅ Viewed analytics and reports

---

## **🔑 Key URLs:**

- **Login**: http://localhost:3000/login
- **Dashboard**: http://localhost:3000/admin
- **Stores**: http://localhost:3000/admin/stores
- **Users**: http://localhost:3000/admin/users
- **Features**: http://localhost:3000/admin/features
- **Products**: http://localhost:3000/admin/products
- **Questions**: http://localhost:3000/admin/questions
- **Sessions**: http://localhost:3000/admin/sessions
- **Reports**: http://localhost:3000/admin/reports
- **Questionnaire**: http://localhost:3000/questionnaire

---

## **📊 Database Management:**

```bash
# View database in GUI
npm run db:studio

# Re-seed database (resets all data)
npm run db:seed

# Create a migration
npm run db:migrate
```

---

## **🐛 Troubleshooting:**

### Issue: "Cannot connect to database"
**Solution:**
```bash
# Check if PostgreSQL is running
brew services list

# Start PostgreSQL
brew services start postgresql@15

# Check connection
psql -d lenstrack -c "SELECT 1"
```

### Issue: "Prisma Client not generated"
**Solution:**
```bash
npm run db:generate
```

### Issue: "Port 3000 already in use"
**Solution:**
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# OR run on different port
PORT=3001 npm run dev
```

---

## **🎯 Next Steps:**

1. **Customize** - Add your own products, features, questions
2. **Extend** - Add more report types, export features
3. **Deploy** - Ready for production deployment
4. **Scale** - Add more stores and users

---

**Ready to revolutionize your optical store! 👓✨**

