# 🚀 LensTrack - Access URLs Guide

## ✅ **Simple Setup - 2 URLs Only!**

---

## 🌐 **Customer Access (Public)**

### **Main URL:**
```
https://yoursite.com/
```

**Kya Hoga:**
- Direct questionnaire open hoga
- Secret key se auto-access (MAIN-001 store)
- No login, no store code needed!

**Perfect For:**
- Customers
- Walk-ins
- Social media sharing
- WhatsApp links
- Business cards

---

## 👨‍💼 **Admin Access (Staff Only)**

### **Admin URL:**
```
https://yoursite.com/login
```
**Or:**
```
https://yoursite.com/admin-login
```

**Kya Hoga:**
- Login page khulega
- Staff login karenge
- Admin panel access

**Login Credentials:**
| Email | Password | Role |
|-------|----------|------|
| superadmin@lenstrack.com | admin123 | Super Admin |
| admin@lenstrack.com | admin123 | Admin |
| manager@lenstrack.com | admin123 | Manager |
| sales@lenstrack.com | admin123 | Sales |

---

## 🔑 **Secret Key System:**

**Your Secret Key:** `LENSTRACK2025`

### **How It Works:**

1. **URL with key:**
   ```
   yoursite.com/questionnaire?key=LENSTRACK2025
   ```
   → Auto-bypass store code → Direct access

2. **URL without key:**
   ```
   yoursite.com/questionnaire
   ```
   → Agar saved store hai localStorage mein → Direct access
   → Nahi toh store code mangega

3. **Base URL:**
   ```
   yoursite.com/
   ```
   → Redirect to `/questionnaire`
   → Secret key check karega
   → Auto-access de dega

---

## 📱 **Share Kaise Karein:**

### **For Customers (Simple):**
```
Visit: yoursite.com
```
That's it! Ek hi link!

### **WhatsApp Template:**
```
👓 Get your perfect eyewear!
🔗 Visit: yoursite.com
📋 Answer 3 quick questions
✨ Get personalized recommendations
```

### **Social Media:**
```
🌟 Find Your Perfect Eyewear
Visit yoursite.com for AI-powered recommendations!
```

### **In-Store Display:**
```
┌─────────────────────────┐
│   📱 Scan to Start      │
│                         │
│   [QR Code]             │
│   yoursite.com          │
│                         │
│   Find Your Perfect     │
│   Eyewear in 3 Minutes! │
└─────────────────────────┘
```

---

## 🛡️ **Security:**

**Public Access:** ✅
- No sensitive data exposed
- Only questionnaire accessible
- Sessions tracked properly

**Admin Access:** 🔐
- Separate login required
- JWT token authentication
- Role-based permissions

**Secret Key:** 🔑
- Hardcoded: `LENSTRACK2025`
- Change in code if needed
- Auto-selects default store (MAIN-001)

---

## 🎯 **URL Structure:**

```
├── yoursite.com/                    → Questionnaire (Public)
├── yoursite.com/questionnaire       → Questionnaire (Public)
├── yoursite.com/questionnaire?key=  → With secret key
│
├── yoursite.com/login               → Admin Login
├── yoursite.com/admin-login         → Admin Login (alternate)
│
└── yoursite.com/admin/*             → Admin Panel (Protected)
```

---

## 📊 **Complete Flow:**

### **Customer Flow:**
```
1. Visit: yoursite.com
   ↓
2. Secret key auto-verify (LENSTRACK2025)
   ↓
3. Store auto-selected (MAIN-001)
   ↓
4. Category selection screen
   ↓
5. Customer details (optional)
   ↓
6. Questions
   ↓
7. Recommendations
```

### **Admin Flow:**
```
1. Visit: yoursite.com/login
   ↓
2. Enter credentials
   ↓
3. Dashboard
   ↓
4. Manage stores, products, questions, etc.
```

---

## ⚙️ **Technical Details:**

**Secret Key Location:**
- File: `app/questionnaire/page.tsx`
- Line: `if (secretKey === 'LENSTRACK2025')`

**Default Store:**
- Code: `MAIN-001`
- Name: Main Store - Mumbai

**To Change Secret Key:**
1. Edit `app/questionnaire/page.tsx`
2. Find: `secretKey === 'LENSTRACK2025'`
3. Change to your new key
4. Save & deploy

---

## 🎉 **Final URLs:**

### **Share These:**

**Public (Customer):**
```
yoursite.com
```
✅ One simple URL!

**Admin (Staff):**
```
yoursite.com/login
```
🔐 Login required

---

## 📝 **Summary:**

✅ **Base URL** → Direct questionnaire  
✅ **Secret Key** → `LENSTRACK2025`  
✅ **Auto-Access** → No store code needed  
✅ **Admin Separate** → `/login` route  
✅ **One Link** → Easy sharing

**Bilkul simple! Customers ko sirf base URL do!** 🚀

---

**Created:** December 6, 2025  
**Status:** ✅ **READY TO DEPLOY**

