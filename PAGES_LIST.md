# 📄 LensTrack - Complete Pages List

## 🎯 **Total Pages: 24**

---

## 🏠 **Public Pages (Customer-Facing)**

### **1. Homepage**
- `app/page.tsx` - Main landing page

### **2. Questionnaire Flow**
- `app/questionnaire/page.tsx` - Store verification & category selection
- `app/questionnaire/[sessionId]/page.tsx` - Questionnaire questions
- `app/questionnaire/[sessionId]/recommendations/page.tsx` - Lens recommendations with offers

### **3. Lens Advisor (Wizard Flow)**
- `app/lens-advisor/page.tsx` - Complete Lens Advisor wizard (RX → Frame → Questions → Recommendations)
- `app/lens-advisor/quick-price/page.tsx` - Quick price check flow (fast flow for phone enquiries)

---

## 🔐 **Authentication Pages**

### **4. Login Pages**
- `app/(auth)/login/page.tsx` - Staff login page
- `app/admin-login/page.tsx` - Admin login page

---

## 👨‍💼 **Admin Dashboard Pages**

### **5. Admin Dashboard**
- `app/admin/page.tsx` - Admin dashboard/home

### **6. Store Management**
- `app/admin/stores/page.tsx` - Store list & management

### **7. User Management**
- `app/admin/users/page.tsx` - User list & management

### **8. Product Management**
- `app/admin/products/page.tsx` - Product list & management
- `app/admin/lenses/page.tsx` - Lens products list
- `app/admin/lenses/[id]/page.tsx` - Lens details (5 tabs: General, Specs, Features, Benefits, Answer Boosts)

### **9. Feature Management**
- `app/admin/features/page.tsx` - Feature list & management

### **10. Question Management**
- `app/admin/questions/page.tsx` - Question list & management
- `app/admin/questionnaire/page.tsx` - Questionnaire builder with tree view

### **11. Prescription Management**
- `app/admin/prescriptions/page.tsx` - Prescription list & management

### **12. Offer Management**
- `app/admin/offers/rules/page.tsx` - Offer rules management
- `app/admin/offers/category-discounts/page.tsx` - Category discount management
- `app/admin/offers/coupons/page.tsx` - Coupon management
- `app/admin/offers/calculator/page.tsx` - Offer calculator tool

### **13. Session Management**
- `app/admin/sessions/page.tsx` - Session list & management

### **14. Reports**
- `app/admin/reports/page.tsx` - Reports & analytics

---

## 📊 **Page Summary by Category**

| Category | Count | Pages |
|----------|-------|-------|
| **Public (Customer)** | 5 | Homepage, Questionnaire (3), Lens Advisor (2) |
| **Authentication** | 2 | Login pages |
| **Admin Dashboard** | 17 | Dashboard, Stores, Users, Products, Lenses, Features, Questions, Questionnaire, Prescriptions, Offers (4), Sessions, Reports |
| **Total** | **24** | |

---

## 🎨 **Key Features by Page**

### **Customer Pages:**
- ✅ Store verification
- ✅ Category selection (Eyeglasses, Sunglasses, Contact Lenses, Accessories)
- ✅ Customer details form
- ✅ Interactive questionnaire
- ✅ Lens recommendations with scoring
- ✅ Offer calculation & breakdown
- ✅ Coupon code application
- ✅ Prescription entry (RX input)
- ✅ Frame entry
- ✅ Price matrix view
- ✅ Lens comparison

### **Admin Pages:**
- ✅ Complete CRUD for all entities
- ✅ Lens management with 5-tab interface
- ✅ Questionnaire builder with tree view
- ✅ Offer rule management
- ✅ Category discounts
- ✅ Coupon management
- ✅ Session tracking
- ✅ Reports & analytics
- ✅ Prescription management

---

## 🔗 **Page Routes**

### **Public Routes:**
- `/` - Homepage
- `/questionnaire` - Questionnaire start
- `/questionnaire/[sessionId]` - Questionnaire questions
- `/questionnaire/[sessionId]/recommendations` - Recommendations
- `/lens-advisor` - Lens Advisor wizard
- `/lens-advisor/quick-price` - Quick price check

### **Auth Routes:**
- `/login` - Staff login
- `/admin-login` - Admin login

### **Admin Routes:**
- `/admin` - Dashboard
- `/admin/stores` - Stores
- `/admin/users` - Users
- `/admin/products` - Products
- `/admin/lenses` - Lenses
- `/admin/lenses/[id]` - Lens details
- `/admin/features` - Features
- `/admin/questions` - Questions
- `/admin/questionnaire` - Questionnaire builder
- `/admin/prescriptions` - Prescriptions
- `/admin/offers/rules` - Offer rules
- `/admin/offers/category-discounts` - Category discounts
- `/admin/offers/coupons` - Coupons
- `/admin/offers/calculator` - Offer calculator
- `/admin/sessions` - Sessions
- `/admin/reports` - Reports

---

## ✅ **All Pages Status: COMPLETE**

Sabhi pages implement ho chuki hain aur documentation ke according match karti hain! 🎉

