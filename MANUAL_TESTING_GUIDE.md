# 🧪 MANUAL TESTING GUIDE
## LensTrack Offer Engine - Complete Testing Checklist

---

## ✅ **PRE-TEST SETUP**

1. **Start Server:**
   ```bash
   npm run dev
   ```

2. **Verify Database:**
   - Check if seed data is loaded
   - Organization should exist
   - Admin user should exist: `admin@lenstrack.com` / `admin123`

---

## 📋 **TEST CHECKLIST**

### **1. DATABASE SCHEMA VERIFICATION** ✅

#### Test 1.1: Product Model
- [ ] Open Prisma Studio: `npx prisma studio`
- [ ] Check Product table has:
  - `itCode` field (String, optional)
  - `brandLine` field (Enum: BrandLine, optional)
  - `yopoEligible` field (Boolean, default false)
  - `subCategory` field (String, optional)

#### Test 1.2: Session Model
- [ ] Check Session table has:
  - `customerCategory` field (Enum: CustomerCategory, optional)

#### Test 1.3: Offer Engine Models
- [ ] Check OfferRule table exists with all fields
- [ ] Check CategoryDiscount table exists
- [ ] Check Coupon table exists
- [ ] Check OfferApplicationLog table exists

#### Test 1.4: Enums
- [ ] Verify BrandLine enum values:
  - DIGI360_ADVANCED, DIGI360_ESSENTIAL, DRIVEXPERT, BLUEXPERT, PROGRESSIVE_PLUS, STANDARD, PREMIUM, OTHER
- [ ] Verify CustomerCategory enum values:
  - STUDENT, DOCTOR, TEACHER, ARMED_FORCES, SENIOR_CITIZEN, CORPORATE, REGULAR
- [ ] Verify DiscountType enum values:
  - PERCENTAGE, FLAT_AMOUNT, YOPO_LOGIC, FREE_ITEM, COMBO_PRICE
- [ ] Verify OfferRuleType enum values:
  - YOPO, FREE_LENS, COMBO_PRICE, PERCENT_OFF, FLAT_OFF, BOGO_50

---

### **2. ADMIN UI TESTS** ✅

#### Test 2.1: Login
- [ ] Go to: `http://localhost:3000/admin-login`
- [ ] Login with: `admin@lenstrack.com` / `admin123`
- [ ] Should redirect to `/admin` dashboard
- [ ] Sidebar should show all navigation items

#### Test 2.2: Offer Rules Management (`/admin/offers/rules`)
- [ ] Page loads without errors
- [ ] List of offer rules displays (may be empty initially)
- [ ] Click "Add Offer Rule" button
- [ ] Fill form:
  - Name: "Test YOPO Offer"
  - Code: "TEST_YOPO_001"
  - Offer Type: "YOPO"
  - Discount Type: "YOPO_LOGIC"
  - Discount Value: 0 (not used for YOPO)
  - Priority: 100
  - Is Active: Yes
  - Frame Brand: Leave empty (applies to all)
  - Lens Brand Lines: Select "DIGI360_ADVANCED"
  - Start Date: Today
  - End Date: 1 year from now
- [ ] Click "Create"
- [ ] Rule should appear in list
- [ ] Click "Edit" on the rule
- [ ] Modify priority to 50
- [ ] Save changes
- [ ] Click "Delete" and confirm
- [ ] Rule should be removed

#### Test 2.3: Category Discounts (`/admin/offers/category-discounts`)
- [ ] Page loads without errors
- [ ] List of category discounts displays
- [ ] Click "Add Category Discount"
- [ ] Fill form:
  - Customer Category: "STUDENT"
  - Brand Code: "*" (for all brands)
  - Discount Percent: 15
  - Max Discount: 500
  - Is Active: Yes
  - Start Date: Today
  - End Date: 1 year from now
- [ ] Click "Create"
- [ ] Discount should appear in list
- [ ] Edit and delete functionality works

#### Test 2.4: Coupons Management (`/admin/offers/coupons`)
- [ ] Page loads without errors
- [ ] List of coupons displays
- [ ] Click "Add Coupon"
- [ ] Fill form:
  - Code: "WELCOME10"
  - Description: "Welcome 10% Off"
  - Discount Type: "PERCENTAGE"
  - Discount Value: 10
  - Max Discount: 200
  - Min Cart Value: 1000
  - Max Usage Per User: 1
  - Max Usage Global: 100
  - Is Active: Yes
  - Start Date: Today
  - End Date: 1 year from now
- [ ] Click "Create"
- [ ] Coupon should appear in list
- [ ] Edit and delete functionality works

#### Test 2.5: Offer Calculator (`/admin/offers/calculator`)
- [ ] Page loads without errors
- [ ] Fill Frame Details:
  - Frame Brand: "LENSTRACK"
  - Sub-Category: "ESSENTIAL"
  - Frame MRP: 2000
  - Frame Type: "FULL_RIM"
- [ ] Fill Lens Details:
  - IT Code: "D360ASV"
  - Lens Price: 3000
  - Brand Line: "DIGI360_ADVANCED"
  - YOPO Eligible: Checked
- [ ] Select Customer Category: "STUDENT"
- [ ] Enter Coupon Code: "WELCOME10"
- [ ] Click "Calculate Offers"
- [ ] Results panel should show:
  - Frame MRP: ₹2,000
  - Lens Price: ₹3,000
  - Base Total: ₹5,000
  - Primary Offer (YOPO): Should show discount
  - Category Discount (STUDENT): Should show 15% discount
  - Coupon Discount (WELCOME10): Should show 10% discount
  - Final Payable: Calculated correctly
  - Total Savings: Calculated correctly
- [ ] Enable "Second Pair" toggle
- [ ] Enter Second Pair Frame MRP: 1500
- [ ] Enter Second Pair Lens Price: 2000
- [ ] Click "Calculate Offers" again
- [ ] Second Pair Discount should appear
- [ ] Final Payable should include both pairs

---

### **3. CUSTOMER FLOW TESTS** ✅

#### Test 3.1: Questionnaire Start
- [ ] Go to: `http://localhost:3000/questionnaire`
- [ ] Select Category: "Eyeglasses"
- [ ] Enter Customer Name: "Test Customer"
- [ ] Enter Phone: "9876543210"
- [ ] **Select Customer Category: "STUDENT"** (NEW FEATURE)
- [ ] Click "Start Questionnaire"
- [ ] Should redirect to question page

#### Test 3.2: Answer Questions
- [ ] Answer all questions
- [ ] Click "Next" after each answer
- [ ] Progress bar should update
- [ ] After last question, should redirect to recommendations

#### Test 3.3: Recommendations Page
- [ ] Recommendations should load
- [ ] Each product should show:
  - Match percentage
  - Price breakdown
  - Available offers
- [ ] **Coupon Code Section** should be visible (NEW FEATURE)
- [ ] **Second Pair Toggle** should be visible (NEW FEATURE)

#### Test 3.4: Apply Coupon Code
- [ ] Enter coupon code: "WELCOME10"
- [ ] Click "Apply" button
- [ ] Should show success toast
- [ ] Price breakdown should update:
  - Primary offer (if any)
  - Category discount (STUDENT 15%)
  - **Coupon discount (WELCOME10 10%)** (NEW FEATURE)
  - Final payable should be updated
- [ ] Invalid coupon should show error

#### Test 3.5: Second Pair Flow
- [ ] Select a product
- [ ] Enable "Buy Second Pair?" toggle
- [ ] Input fields should appear:
  - Second Pair Frame MRP
  - Second Pair Lens Price
- [ ] Enter values:
  - Second Pair Frame MRP: 1500
  - Second Pair Lens Price: 2000
- [ ] Click "Apply" on coupon (or recalculate)
- [ ] Price breakdown should show:
  - First pair total
  - **Second Pair Discount** (NEW FEATURE)
  - Combined final payable
- [ ] Second pair discount should be calculated correctly

#### Test 3.6: Offer Breakdown Display
- [ ] Verify all discounts show separately:
  - Primary Offer (YOPO/Combo/Percentage/Flat)
  - Category Discount (if applicable)
  - Coupon Discount (if applied)
  - Second Pair Discount (if enabled)
- [ ] Final Payable should be correct
- [ ] Total Savings should be correct

---

### **4. API ENDPOINT TESTS** ✅

#### Test 4.1: Offer Calculation API
**Using Browser Console or Postman:**

```javascript
// Test Basic Calculation
fetch('http://localhost:3000/api/offers/calculate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    frame: { brand: 'LENSTRACK', mrp: 2000 },
    lens: { itCode: 'D360ASV', price: 3000, brandLine: 'DIGI360_ADVANCED', yopoEligible: true },
    customerCategory: 'STUDENT',
    couponCode: 'WELCOME10',
    organizationId: 'YOUR_ORG_ID' // Get from JWT token or database
  })
})
.then(r => r.json())
.then(console.log);
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "frameMRP": 2000,
    "lensPrice": 3000,
    "baseTotal": 5000,
    "effectiveBase": 2500,
    "offersApplied": [...],
    "priceComponents": [...],
    "categoryDiscount": {...},
    "couponDiscount": {...},
    "finalPayable": 2000
  }
}
```

#### Test 4.2: Recalculate Offers API
**After creating a session:**
```javascript
fetch('http://localhost:3000/api/public/questionnaire/sessions/SESSION_ID/recalculate-offers', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    productId: 'PRODUCT_ID',
    couponCode: 'WELCOME10',
    secondPair: {
      enabled: true,
      firstPairTotal: 5000,
      secondPairFrameMRP: 1500,
      secondPairLensPrice: 2000
    }
  })
})
.then(r => r.json())
.then(console.log);
```

---

### **5. OFFER ENGINE LOGIC TESTS** ✅

#### Test 5.1: Waterfall Priority
1. Create a COMBO_PRICE offer rule
2. Create a YOPO offer rule
3. Calculate with both applicable
4. **Verify:** COMBO_PRICE applies (higher priority)

#### Test 5.2: YOPO Logic
1. Create YOPO offer rule for DIGI360_ADVANCED
2. Calculate with:
   - Frame MRP: 2000
   - Lens Price: 3000
   - YOPO Eligible: true
3. **Verify:** Discount = min(2000, 3000) * 0.5 = 1000
4. **Verify:** Final = 2000 + 3000 - 1000 = 4000

#### Test 5.3: Category Discount
1. Create STUDENT category discount (15%, max ₹500)
2. Calculate with customerCategory: "STUDENT"
3. **Verify:** 15% discount applied after primary offer
4. **Verify:** Max discount cap respected

#### Test 5.4: Coupon Discount
1. Create coupon "WELCOME10" (10%, max ₹200, min cart ₹1000)
2. Calculate with couponCode: "WELCOME10"
3. **Verify:** 10% discount applied after category discount
4. **Verify:** Min cart value validation works
5. **Verify:** Max discount cap respected

#### Test 5.5: Second Pair Discount
1. Create second pair offer rule (50% off)
2. Calculate with secondPair enabled
3. **Verify:** Discount applied only on second pair
4. **Verify:** First pair total used correctly

---

## ✅ **SUCCESS CRITERIA**

### All Tests Should Pass:
- [ ] Database schema matches specification
- [ ] All admin pages load and function correctly
- [ ] Offer calculator works with all inputs
- [ ] Customer flow works end-to-end
- [ ] Coupon code applies correctly
- [ ] Second pair flow works correctly
- [ ] All discounts show separately in breakdown
- [ ] Final prices calculate correctly
- [ ] No console errors
- [ ] No TypeScript errors

---

## 🐛 **KNOWN ISSUES TO CHECK**

1. **Organization ID in Session:**
   - Session endpoint may not return organizationId
   - May need to get from JWT token or database

2. **Offer Calculation Errors:**
   - Check if organizationId is passed correctly
   - Verify offer rules exist in database
   - Check date ranges for active offers

3. **UI Issues:**
   - Check if all form fields validate correctly
   - Verify date pickers work
   - Check if dropdowns populate correctly

---

## 📝 **TEST RESULTS TEMPLATE**

```
Date: ___________
Tester: ___________

Database Schema: ✅ / ❌
Admin UI: ✅ / ❌
Customer Flow: ✅ / ❌
API Endpoints: ✅ / ❌
Offer Logic: ✅ / ❌

Issues Found:
1. 
2. 
3. 

Notes:
```

---

**Happy Testing! 🎉**

