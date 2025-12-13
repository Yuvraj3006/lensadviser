# Combo + Regular Purchase Flow - Complete Testing Guide

## ✅ All Gaps Fixed - Ready for Testing

### Fixed Components:
1. ✅ Combo Review Page
2. ✅ Combo Pricing Application in Offer Engine
3. ✅ Second Eyewear Selection
4. ✅ Needs Summary Screen
5. ✅ Combo Versioning
6. ✅ Upgrade Logic
7. ✅ Frame MRP Input

---

## 🧪 Automated Test Script

Run the test script to verify backend logic:

```bash
npx tsx scripts/test-combo-flow.ts
```

This will test:
- Master switch configuration
- Combo tiers availability
- Combo pricing in offer engine
- Versioning logic
- Eligibility filtering

---

## 📋 Manual Testing Checklist

### Phase 1: Basic Flow (REGULAR Path)

#### Step 1: Questionnaire Completion
- [ ] Start new session
- [ ] Complete questionnaire
- [ ] Verify Needs Summary screen appears
- [ ] Check summary text is personalized

#### Step 2: Path Choice (REGULAR)
- [ ] Select "Build My Glasses" (REGULAR)
- [ ] Verify redirects to recommendations page
- [ ] Check session has `purchaseContext: 'REGULAR'`

#### Step 3: Product Selection (REGULAR)
- [ ] Select frame and lens
- [ ] Verify YOPO auto-applies if eligible
- [ ] Check category discounts apply
- [ ] Verify brand offers apply

#### Step 4: Checkout (REGULAR)
- [ ] Verify all offers are applied
- [ ] Check final price calculation
- [ ] Complete order

---

### Phase 2: Combo Flow

#### Step 1: Questionnaire Completion
- [ ] Start new session
- [ ] Complete questionnaire
- [ ] Verify Needs Summary screen appears

#### Step 2: Path Choice (COMBO)
- [ ] Verify combo option is visible (if master switch is ON)
- [ ] Select "Smart Value Combo" (COMBO)
- [ ] Check session has `purchaseContext: 'COMBO'`

#### Step 3: Combo Tier Selection
- [ ] Verify combo comparison cards are displayed
- [ ] Check default tier highlighting (based on Needs Profile)
- [ ] Select a combo tier (e.g., SILVER)
- [ ] Verify session has `selectedComboCode` and `comboVersionUsed`

#### Step 4: Product Selection (COMBO)
- [ ] Verify only combo-eligible frame brands are shown
- [ ] Verify only combo-eligible lens SKUs are shown (double-lock)
- [ ] Select frame brand
- [ ] Select lens SKU
- [ ] **Enter Frame MRP** (required field)
- [ ] **Select Second Eyewear** (Frame OR Sunglasses - exactly one)
- [ ] Click "Continue to Review"

#### Step 5: Upgrade Suggestion (if triggered)
- [ ] Try selecting ineligible brand/lens
- [ ] Verify upgrade modal appears
- [ ] Check upgrade ladder (Bronze → Silver → Gold → Platinum)
- [ ] Test "Upgrade tier" action
- [ ] Test "Switch to Regular" action
- [ ] Test "Change selection" action

#### Step 6: Review Page
- [ ] Verify combo tier name and price displayed
- [ ] Check selected products are shown
- [ ] Verify second eyewear choice is displayed
- [ ] Check benefits list is shown
- [ ] Verify final payable = combo effective price
- [ ] Click "Proceed to Checkout"

#### Step 7: Checkout (COMBO)
- [ ] Verify combo price is applied in offer engine
- [ ] Check NO category discounts applied
- [ ] Check NO brand discounts applied
- [ ] Check NO YOPO applied
- [ ] Verify coupon can be applied (if provided)
- [ ] Check final price = combo price - coupon (if any)
- [ ] Complete order

---

### Phase 3: Edge Cases

#### Master Switch OFF
- [ ] Set `combo_offer_status = 'OFF'` in admin
- [ ] Verify combo option NOT visible in path choice
- [ ] Verify direct combo URLs fail safely
- [ ] Check only REGULAR path is available

#### Combo Versioning
- [ ] Select combo tier (version 1)
- [ ] Update combo tier version in admin
- [ ] Verify existing session uses old version
- [ ] Check new sessions use new version

#### Context Switching
- [ ] Start in COMBO context
- [ ] Try switching to REGULAR
- [ ] Verify cart reset or warning shown
- [ ] Check no mixed context items allowed

#### Eligibility Edge Cases
- [ ] Try selecting brand with `combo_allowed = false`
- [ ] Verify upgrade suggestion appears
- [ ] Try selecting lens with brand allowed but SKU not allowed
- [ ] Verify upgrade suggestion appears

---

## 🔍 API Testing

### Test Combo Pricing API

```bash
# Test COMBO context with combo tier
curl -X POST http://localhost:3000/api/offer-engine/calculate \
  -H "Content-Type: application/json" \
  -d '{
    "frame": {
      "brand": "Test Brand",
      "mrp": 5000
    },
    "lens": {
      "itCode": "TEST001",
      "price": 3000,
      "brandLine": "Test Brand Line"
    },
    "organizationId": "your-org-id",
    "purchaseContext": "COMBO",
    "selectedComboCode": "SILVER"
  }'
```

**Expected:**
- `effectiveBase` = combo tier effective price
- `offersApplied` = empty (or only coupon)
- `categoryDiscount` = null
- `finalPayable` = combo price (or combo price - coupon)

### Test REGULAR Context YOPO

```bash
# Test REGULAR context with YOPO-eligible brands
curl -X POST http://localhost:3000/api/offer-engine/calculate \
  -H "Content-Type: application/json" \
  -d '{
    "frame": {
      "brand": "YOPO-ELIGIBLE-BRAND",
      "mrp": 5000
    },
    "lens": {
      "itCode": "YOPO-ELIGIBLE-SKU",
      "price": 3000,
      "brandLine": "YOPO-ELIGIBLE-BRAND"
    },
    "organizationId": "your-org-id",
    "purchaseContext": "REGULAR"
  }'
```

**Expected:**
- YOPO auto-applied if all eligibility checks pass
- `offersApplied` contains YOPO offer
- `effectiveBase` = higher of frame or lens price

---

## 🐛 Common Issues & Solutions

### Issue 1: Combo price not applied
**Symptom:** Final price is frame + lens, not combo price
**Check:**
- Session has `purchaseContext: 'COMBO'`
- Session has `selectedComboCode`
- Combo tier exists and is active
- Offer engine receives both fields

### Issue 2: Discounts still applying in COMBO
**Symptom:** Category/brand discounts showing in COMBO
**Check:**
- Offer engine checks `isComboContext && !comboTierPrice`
- All discount logic has this check
- `recalculate-offers` API passes `purchaseContext`

### Issue 3: Second eyewear not saving
**Symptom:** Review page doesn't show second eyewear
**Check:**
- Selection saved in localStorage
- Review page reads from localStorage
- Format matches expected structure

### Issue 4: Upgrade modal not appearing
**Symptom:** Ineligible selection doesn't trigger upgrade
**Check:**
- Validation API called correctly
- Upgrade suggestion logic in validate-selection endpoint
- Modal component receives correct data

---

## ✅ Success Criteria

### Must Pass:
1. ✅ Combo OFF removes combo UI completely
2. ✅ Questionnaire mandatory before path selection
3. ✅ REGULAR path YOPO auto-applies when eligible
4. ✅ COMBO path blocks all discounts except coupon
5. ✅ Combo price is final authoritative price
6. ✅ Second eyewear exactly one option enforced
7. ✅ Upgrade suggestion triggers on ineligible selection
8. ✅ Combo version stored and used correctly

### Nice to Have:
- Analytics events captured
- Smooth UX transitions
- Error handling for edge cases

---

## 📊 Test Results Template

```
Date: ___________
Tester: ___________

Phase 1: REGULAR Flow
- [ ] Questionnaire → Needs Summary
- [ ] Path Choice → REGULAR
- [ ] Product Selection
- [ ] YOPO Auto-Apply
- [ ] Checkout

Phase 2: COMBO Flow
- [ ] Questionnaire → Needs Summary
- [ ] Path Choice → COMBO
- [ ] Combo Tier Selection
- [ ] Product Selection (eligibility)
- [ ] Second Eyewear Selection
- [ ] Upgrade Suggestion
- [ ] Review Page
- [ ] Checkout (combo pricing)

Phase 3: Edge Cases
- [ ] Master Switch OFF
- [ ] Versioning
- [ ] Context Switching
- [ ] Eligibility Edge Cases

Issues Found:
1. 
2. 
3. 

Status: [ ] PASS [ ] FAIL [ ] PARTIAL
```

---

## 🚀 Ready for Production

Once all tests pass:
1. ✅ All gaps fixed
2. ✅ Schema changes applied
3. ✅ Backend logic verified
4. ✅ Frontend flow complete
5. ✅ Edge cases handled

**GO-LIVE CHECKLIST:**
- [ ] All automated tests pass
- [ ] Manual testing complete
- [ ] Master switch configured
- [ ] Combo tiers created
- [ ] Brands/lenses marked as combo-allowed
- [ ] Production database migrated
- [ ] Monitoring set up

---

**Last Updated:** After all gaps fixed
**Status:** ✅ Ready for Testing

