# 🌐 Public Questionnaire Access Guide

## How to Access Questionnaire Without Login

### ✅ **Store Code System Implemented**

Your questionnaire is now publicly accessible using **Store Codes**! No login required for customers.

---

## 🔑 **Store Codes**

Each store has a unique code that customers can use to access the questionnaire.

### **Your Store Codes:**

| Store Name | Store Code | City |
|------------|------------|------|
| Main Store - Mumbai | `MAIN-001` | Mumbai |
| Branch Store - Pune | `BRANCH-001` | Pune |

---

## 🚀 **How Customers Access:**

### **Step 1: Visit Questionnaire Page**
```
https://yourwebsite.com/questionnaire
```

### **Step 2: Enter Store Code**
Customer will see a screen asking for store code:
- They enter: `MAIN-001` (or the code you give them)
- Click "Continue"

### **Step 3: Start Questionnaire**
- Choose category (Eyeglasses/Sunglasses/etc.)
- Fill optional details (name, phone)
- Start answering questions!

---

## 📱 **For Store Staff:**

### **How to Share Access:**

1. **QR Code** (Recommended):
   - Create a QR code with: `https://yoursite.com/questionnaire?store=MAIN-001`
   - Print and display in store
   - Customers scan → Auto-filled store code

2. **Verbal**:
   - Tell customer: "Visit lenstrack.com/questionnaire"
   - "Enter store code: MAIN-001"

3. **WhatsApp/SMS**:
   ```
   Visit: https://yoursite.com/questionnaire
   Store Code: MAIN-001
   ```

---

## 🏪 **Managing Store Codes**

### **View All Stores & Codes:**
1. Login to Admin Panel
2. Go to **Stores** page
3. See all store codes

### **Create New Store Code:**
1. Go to **Stores** → Add Store
2. Enter Store Code (e.g., `DELHI-001`)
3. Fill other details
4. Save

### **Share the New Code:**
- Give it to that store's staff
- They can share with customers

---

## 🔐 **Security Features:**

✅ **Store Code Validation:**
- Only active stores work
- Invalid codes are rejected
- Store info is cached locally

✅ **No Authentication Required:**
- Customers don't need accounts
- Just store code access

✅ **Session Tracking:**
- Each session is linked to correct store
- Staff can view all sessions from their store

---

## 📊 **How It Works Internally:**

```
Customer enters code (MAIN-001)
         ↓
System verifies code in database
         ↓
Code valid? → Load store info
         ↓
Store saved in browser (localStorage)
         ↓
Customer selects category
         ↓
System creates session for that store
         ↓
Questions loaded
         ↓
Customer answers
         ↓
Recommendations shown
```

---

## 🎯 **API Endpoints Created:**

### 1. **Verify Store Code**
```
GET /api/public/verify-store?code=MAIN-001
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "...",
    "code": "MAIN-001",
    "name": "Main Store - Mumbai",
    "city": "Mumbai",
    "state": "Maharashtra"
  }
}
```

### 2. **Start Session (Public)**
```
POST /api/public/questionnaire/sessions
{
  "storeCode": "MAIN-001",
  "category": "EYEGLASSES",
  "customerName": "Rahul Sharma",
  "customerPhone": "+91-9876543210"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "sessionId": "...",
    "questions": [...],
    "totalQuestions": 3
  }
}
```

---

## 📝 **Files Modified:**

1. ✅ `app/questionnaire/page.tsx` - Added store code verification UI
2. ✅ `app/api/public/verify-store/route.ts` - Store code validation API
3. ✅ `app/api/public/questionnaire/sessions/route.ts` - Public session creation

---

## 🎨 **UI Changes:**

### **Before:**
- Required login to access
- Auth-protected

### **After:**
- **Store Code Screen** (first time)
- Beautiful gradient UI
- "Change Store" option
- Store info display

---

## 💡 **Deployment Tips:**

### **1. Share Links:**
```
Basic: https://yoursite.com/questionnaire
With Code: https://yoursite.com/questionnaire?store=MAIN-001
```

### **2. Create Marketing Materials:**
- Print QR codes with store codes
- Add to business cards
- Display in store

### **3. For Multiple Branches:**
- Each branch gets unique code
- Track sessions per branch
- View analytics per store

---

## 🚨 **Important Notes:**

1. **Store Code is Case-Insensitive:**
   - `main-001`, `MAIN-001`, `Main-001` all work

2. **Store Must Be Active:**
   - Inactive stores won't work
   - Activate in Admin → Stores

3. **Code is Saved Locally:**
   - Customer doesn't need to re-enter
   - "Change Store" button to reset

4. **Session Assignment:**
   - Sessions auto-assigned to first active store user
   - Usually sales executive

---

## ✅ **Testing:**

### **Test Now:**
1. Open: `http://localhost:3000/questionnaire`
2. Enter: `MAIN-001`
3. Click Continue
4. Should see category selection!

### **Test Invalid Code:**
1. Enter: `INVALID-123`
2. Should show error: "Invalid store code"

---

## 🎉 **Summary:**

**Problem Solved:**
- ✅ No login required for customers
- ✅ Store-based access control
- ✅ Easy sharing via codes
- ✅ Professional public-facing UI

**Your Store Codes:**
- `MAIN-001` (Mumbai)
- `BRANCH-001` (Pune)

**Share these codes with customers to let them access the questionnaire!** 🚀

---

**Created:** December 6, 2025  
**Status:** ✅ **LIVE & WORKING**

