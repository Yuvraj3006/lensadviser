# Quick Test Checklist - Combo Flow

## 🚀 Server Status
- [ ] Dev server running on http://localhost:3000
- [ ] No build errors in console

---

## ✅ Phase 1: Basic Setup Verification

### 1. Master Switch
- [ ] Go to `/admin/settings`
- [ ] Verify `combo_offer_status` is set to `ON`
- [ ] If OFF, toggle it ON

### 2. Combo Tiers
- [ ] Go to `/admin/combo-tiers`
- [ ] Verify at least one combo tier exists and is active
- [ ] Check tier has benefits configured
- [ ] Note the `effective_price` of one tier (e.g., SILVER = ₹5000)

### 3. Brand/Lens Eligibility
- [ ] Go to `/admin/brands` (Frame brands)
- [ ] Mark at least 2-3 brands as `combo_allowed = true`
- [ ] Go to `/admin/lens-products`
- [ ] Mark at least 2-3 lens SKUs as `combo_allowed = true`
- [ ] Verify their lens brands also have `combo_allowed = true`

---

## ✅ Phase 2: REGULAR Flow Test

### Step 1: Start Session
- [ ] Go to `/questionnaire/[new-session]`
- [ ] Complete questionnaire
- [ ] **Verify:** Needs Summary screen appears ✅
- [ ] Check summary text is personalized

### Step 2: Path Choice
- [ ] **Verify:** Both options visible (Build My Glasses & Smart Value Combo)
- [ ] Click "Build My Glasses" (REGULAR)
- [ ] **Verify:** Redirects to recommendations page
- [ ] Check browser console: `purchaseContext: 'REGULAR'`

### Step 3: Product Selection
- [ ] Select a frame and lens
- [ ] **Verify:** YOPO auto-applies if eligible
- [ ] **Verify:** Category discounts apply
- [ ] Proceed to checkout

### Step 4: Checkout
- [ ] **Verify:** All offers applied correctly
- [ ] **Verify:** Final price = base - discounts
- [ ] Complete order (optional)

---

## ✅ Phase 3: COMBO Flow Test

### Step 1: Start New Session
- [ ] Start fresh session
- [ ] Complete questionnaire
- [ ] **Verify:** Needs Summary appears ✅

### Step 2: Path Choice
- [ ] Click "Smart Value Combo" (COMBO)
- [ ] **Verify:** Redirects to combo tiers page
- [ ] Check console: `purchaseContext: 'COMBO'`

### Step 3: Combo Tier Selection
- [ ] **Verify:** Combo comparison cards displayed
- [ ] Check default tier highlighting
- [ ] Select a tier (e.g., SILVER)
- [ ] **Verify:** Redirects to products page
- [ ] Check console: `selectedComboCode: 'SILVER'`

### Step 4: Product Selection
- [ ] **Verify:** Only combo-eligible frame brands shown ✅
- [ ] **Verify:** Only combo-eligible lens SKUs shown ✅
- [ ] Select a frame brand
- [ ] Select a lens SKU
- [ ] **Enter Frame MRP** (e.g., ₹5000) ✅
- [ ] **Select Second Eyewear:** Choose "Second Frame" OR "Sunglasses" ✅
- [ ] Click "Continue to Review"

### Step 5: Review Page
- [ ] **Verify:** Combo tier name and price displayed ✅
- [ ] **Verify:** Selected products shown ✅
- [ ] **Verify:** Second eyewear choice displayed ✅
- [ ] **Verify:** Benefits list shown ✅
- [ ] **Verify:** Final payable = combo effective price ✅
- [ ] Click "Proceed to Checkout"

### Step 6: Checkout (COMBO Pricing)
- [ ] Open browser DevTools → Network tab
- [ ] Check API call to `/api/offer-engine/calculate`
- [ ] **Verify Request:**
  - `purchaseContext: "COMBO"`
  - `selectedComboCode: "SILVER"`
- [ ] **Verify Response:**
  - `effectiveBase` = combo tier effective price (e.g., ₹5000)
  - `offersApplied` = empty (or only coupon)
  - `categoryDiscount` = null ✅
  - `finalPayable` = combo price (or combo price - coupon)
- [ ] **Verify:** No category/brand discounts applied ✅
- [ ] **Verify:** Combo price is final ✅

---

## ✅ Phase 4: Edge Cases

### Edge Case 1: Upgrade Suggestion
- [ ] In combo products page, select ineligible brand/lens
- [ ] **Verify:** Upgrade modal appears ✅
- [ ] Check upgrade ladder (Bronze → Silver → Gold)
- [ ] Click "Upgrade tier"
- [ ] **Verify:** Tier updated in session
- [ ] **Verify:** Products re-filtered

### Edge Case 2: Master Switch OFF
- [ ] Go to `/admin/settings`
- [ ] Set `combo_offer_status = OFF`
- [ ] Start new session
- [ ] **Verify:** Combo option NOT visible ✅
- [ ] **Verify:** Auto-redirects to REGULAR path ✅

### Edge Case 3: Second Eyewear Validation
- [ ] In combo products page
- [ ] Select frame and lens
- [ ] **Don't select second eyewear**
- [ ] Click "Continue"
- [ ] **Verify:** Error message appears ✅
- [ ] Select second eyewear
- [ ] **Verify:** Can proceed ✅

### Edge Case 4: Combo Versioning
- [ ] Select combo tier (note version)
- [ ] Update tier version in admin
- [ ] **Verify:** Existing session uses old version ✅
- [ ] Start new session
- [ ] **Verify:** New session uses new version ✅

---

## 🔍 API Verification

### Test Combo Pricing API Directly:

```bash
curl -X POST http://localhost:3000/api/offer-engine/calculate \
  -H "Content-Type: application/json" \
  -d '{
    "frame": {
      "brand": "YOUR-COMBO-ALLOWED-BRAND",
      "mrp": 5000
    },
    "lens": {
      "itCode": "YOUR-COMBO-ALLOWED-SKU",
      "price": 3000,
      "brandLine": "YOUR-LENS-BRAND"
    },
    "organizationId": "YOUR-ORG-ID",
    "purchaseContext": "COMBO",
    "selectedComboCode": "SILVER"
  }'
```

**Expected Response:**
```json
{
  "effectiveBase": 5000,  // Combo tier effective price
  "finalPayable": 5000,
  "offersApplied": [],
  "categoryDiscount": null,
  "couponDiscount": null
}
```

---

## ✅ Success Criteria

### Must Pass:
- [x] Needs Summary screen appears after questionnaire
- [x] Combo Review page shows all selections
- [x] Combo pricing applied correctly (no other discounts)
- [x] Second eyewear selection enforced
- [x] Upgrade suggestion works
- [x] Master switch controls visibility
- [x] Versioning stores correctly

### Issues Found:
1. 
2. 
3. 

---

## 🐛 Common Issues

### Issue: Combo price not applied
**Check:**
- Session has `purchaseContext: 'COMBO'`
- Session has `selectedComboCode`
- Combo tier exists and is active
- Offer engine receives both fields

### Issue: Discounts still applying
**Check:**
- Offer engine checks `isComboContext && !comboTierPrice`
- All discount logic has this check
- `recalculate-offers` API passes `purchaseContext`

### Issue: Products not filtered
**Check:**
- Brands have `combo_allowed = true`
- Lens brands have `combo_allowed = true`
- Lens SKUs have `combo_allowed = true`
- API filters correctly

---

**Status:** [ ] PASS [ ] FAIL [ ] PARTIAL
**Tester:** ___________
**Date:** ___________

