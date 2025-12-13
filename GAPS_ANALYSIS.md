# Combo + Regular Purchase Flow - GAPS ANALYSIS

## ✅ IMPLEMENTED FEATURES

### 1. Database Schema ✅
- ✅ Config model (combo_offer_status)
- ✅ NeedsProfile model
- ✅ ComboTier model
- ✅ ComboBenefit model
- ✅ Session.purchaseContext & selectedComboCode
- ✅ Brand/LensBrand/LensProduct combo_allowed & yopo_allowed fields

### 2. API Endpoints ✅
- ✅ GET /api/config
- ✅ GET /api/combo/tiers
- ✅ GET /api/brands?context=COMBO
- ✅ GET /api/lens-skus?context=COMBO
- ✅ POST /api/combo/validate-selection
- ✅ PATCH /api/public/questionnaire/sessions/[sessionId] (purchase context update)

### 3. Backend Services ✅
- ✅ NeedsProfileService (generates profile from questionnaire)
- ✅ Offer Engine: COMBO context blocks discounts
- ✅ Offer Engine: REGULAR context YOPO auto-apply
- ✅ Order creation validation (blocks offer stacking in COMBO)

### 4. Frontend Components ✅
- ✅ Path Choice screen (REGULAR vs COMBO)
- ✅ Combo Tier Comparison Cards
- ✅ Upgrade Suggestion Modal
- ✅ Combo Products Selection page

### 5. Admin UI ✅
- ✅ Settings page (master switch)
- ✅ Combo Tiers CRUD page

---

## ❌ CRITICAL GAPS (Must Fix Before Go-Live)

### 1. **Needs Summary Screen** ❌ MISSING
**Spec Requirement:** Step 3 - Show 1-2 line summary after questionnaire
**Current State:** Questionnaire → directly goes to path-choice
**Impact:** HIGH - Missing trust-building step
**Location:** Should be between questionnaire completion and path-choice
**Required:** `/questionnaire/[sessionId]/needs-summary`

### 2. **Combo Review Page** ❌ MISSING
**Spec Requirement:** Step 5B.4 - Review before billing
**Current State:** Combo products page → tries to go to `/combo/review` (doesn't exist)
**Impact:** CRITICAL - Combo flow breaks at review step
**Location:** `/questionnaire/[sessionId]/combo/review`
**Required:** 
- Show selected tier
- Show selected products
- Show combo effective price
- Show benefits
- Proceed to checkout

### 3. **Combo Pricing Application** ❌ INCOMPLETE
**Spec Requirement:** COMBO context must use combo tier effective_price as final price
**Current State:** 
- Offer engine blocks discounts in COMBO ✅
- BUT: Combo tier effective_price is NOT applied to final price ❌
- Offer engine doesn't know about selected combo tier
**Impact:** CRITICAL - Combo pricing not enforced
**Required:**
- Pass `selectedComboCode` to offer engine
- Fetch combo tier effective_price
- Apply as final price (override baseTotal)
- Ensure no other discounts apply

### 4. **Second Eyewear Selection in Combo** ❌ MISSING
**Spec Requirement:** 
- Combo benefits include "2nd Eyewear (Frame/Sun)" 
- Customer must choose exactly ONE: Frame OR Sun
- Policy: EXACTLY_ONE option
**Current State:** 
- Combo products page only has Frame + Lens selection
- No second eyewear selection
- No validation for "exactly one" rule
**Impact:** HIGH - Incomplete combo flow
**Required:**
- Add second eyewear selection in combo products page
- Validate exactly one option (Frame OR Sun)
- Store selection in session/cart

### 5. **Combo Versioning** ❌ MISSING
**Spec Requirement:** 
- Each combo publish creates a version
- Cart stores combo_version_used
- Active carts continue on same version
**Current State:** 
- No versioning system
- No combo_version field in Session/Cart
**Impact:** MEDIUM - Can't safely update combos mid-day
**Required:**
- Add `comboVersion` to ComboTier model
- Add `comboVersionUsed` to Session model
- Store version when tier is selected
- Use stored version for pricing (not current version)

### 6. **Combo Program Entity** ❌ MISSING (Optional but Recommended)
**Spec Requirement:** 
- Optional container for multiple programs (e.g., "Standard Combos", "Diwali Combos")
- Fields: program_id, program_name, status, start_date, end_date
**Current State:** Not implemented
**Impact:** LOW - Can be added later
**Required:** Only if multiple combo programs needed

### 7. **Combo Rules Entity** ❌ MISSING
**Spec Requirement:**
- Rules define what is allowed inside a combo tier
- Rule types: FRAME_BRAND_ALLOW, LENS_SKU_ALLOW, SECOND_EYEWEAR_CHOICE, OFFER_STACK_POLICY, etc.
- Currently using brand flags (combo_allowed) but no explicit rules table
**Current State:** 
- Eligibility checked via brand flags ✅
- But no explicit rules table for complex policies
**Impact:** MEDIUM - Hard to manage complex combo rules
**Required:** Only if complex rule management needed

### 8. **Cart Context Lock** ⚠️ PARTIAL
**Spec Requirement:**
- Once item added, lock purchase_context
- Switching context = cart reset
**Current State:**
- Session has purchaseContext ✅
- But no explicit cart entity/model
- No cart reset logic on context switch
**Impact:** MEDIUM - Need to ensure context doesn't mix
**Required:**
- Add cart reset logic when switching context
- Validate context consistency at checkout

### 9. **Voucher Policy Enforcement** ❌ MISSING
**Spec Requirement:**
- Voucher issued at checkout
- Not usable on same bill
- Valid from next day, valid for 90 days
**Current State:**
- Voucher logic not implemented
- No voucher model/table
**Impact:** MEDIUM - Voucher feature not implemented
**Required:**
- Voucher model
- Issue voucher at combo checkout
- Block voucher usage on same bill

### 10. **Analytics Events** ❌ MISSING
**Spec Requirement:**
- Capture events: questionnaire_started, path_selected, combo_tier_selected, upgrade_prompt_shown, etc.
**Current State:** No analytics tracking
**Impact:** LOW - Can be added later
**Required:** Analytics service integration

---

## ⚠️ PARTIAL IMPLEMENTATIONS (Need Completion)

### 1. **Combo Products Page** ⚠️ INCOMPLETE
**Current State:**
- ✅ Frame brand selection
- ✅ Lens SKU selection
- ❌ Second eyewear selection (missing)
- ❌ Frame MRP input (missing - needed for combo pricing)
- ❌ Lens price display (missing)

**Required:**
- Add second eyewear selection (Frame OR Sun)
- Add frame MRP input field
- Show lens price
- Validate all required selections

### 2. **Upgrade Suggestion Logic** ⚠️ INCOMPLETE
**Current State:**
- ✅ Modal component exists
- ✅ Validation endpoint exists
- ❌ Upgrade action doesn't update tier in session
- ❌ Cart items not re-validated after upgrade

**Required:**
- Update session.selectedComboCode on upgrade
- Re-validate cart items after tier upgrade
- Handle ineligible items after upgrade

### 3. **Offer Engine - Combo Price Application** ⚠️ INCOMPLETE
**Current State:**
- ✅ Blocks discounts in COMBO ✅
- ❌ Doesn't apply combo tier effective_price
- ❌ Doesn't receive selectedComboCode

**Required:**
- Add selectedComboCode to OfferCalculationInput
- Fetch combo tier in offer engine
- Apply effective_price as final price
- Ensure baseTotal = effective_price (no discounts)

### 4. **Checkout Integration** ⚠️ NEEDS VERIFICATION
**Current State:**
- ✅ Order creation validates offer stacking
- ❌ Doesn't verify combo tier exists
- ❌ Doesn't verify combo benefits are present
- ❌ Doesn't enforce second eyewear choice

**Required:**
- Validate combo tier is active
- Verify all combo benefits are in cart
- Enforce second eyewear exactly one rule
- Apply combo effective_price as final price

---

## 📋 DETAILED GAP BREAKDOWN

### GAP #1: Needs Summary Screen
**Priority:** HIGH
**File:** `/app/questionnaire/[sessionId]/needs-summary/page.tsx` (CREATE)
**Requirements:**
- Show 1-2 line summary from NeedsProfile
- Example: "Based on your usage, we recommend comfortable lenses for long screen time and a backup option."
- Show recommended direction (REGULAR vs COMBO hint)
- Continue button → path-choice

### GAP #2: Combo Review Page
**Priority:** CRITICAL
**File:** `/app/questionnaire/[sessionId]/combo/review/page.tsx` (CREATE)
**Requirements:**
- Display selected combo tier
- Display selected products (Frame, Lens, Second Eyewear)
- Display combo effective price
- Display benefits list
- Show final payable amount
- Proceed to checkout button

### GAP #3: Combo Pricing in Offer Engine
**Priority:** CRITICAL
**File:** `services/offer-engine.service.ts` (UPDATE)
**Current Issue:**
```typescript
// Current: COMBO context blocks discounts but doesn't apply combo price
if (isComboContext) {
  // Blocks discounts ✅
  // BUT: Doesn't apply combo tier effective_price ❌
}
```

**Required Fix:**
```typescript
// Need to:
1. Add selectedComboCode to OfferCalculationInput
2. Fetch ComboTier by selectedComboCode
3. Set effectiveBase = comboTier.effectivePrice
4. Ensure no other calculations override this
```

### GAP #4: Second Eyewear Selection
**Priority:** HIGH
**File:** `/app/questionnaire/[sessionId]/combo/products/page.tsx` (UPDATE)
**Required:**
- Add "Second Eyewear" section
- Radio buttons: "Second Frame" OR "Sunglasses"
- Validate exactly one is selected
- Store selection in session/cart
- Pass to review page

### GAP #5: Combo Versioning
**Priority:** MEDIUM
**Files:** 
- `prisma/schema.prisma` (UPDATE)
- `app/api/admin/combo-tiers/route.ts` (UPDATE)
- `services/offer-engine.service.ts` (UPDATE)

**Required:**
- Add `comboVersion` (Int) to ComboTier
- Add `comboVersionUsed` to Session
- Store version when tier selected
- Use stored version for pricing

### GAP #6: Cart Context Lock & Reset
**Priority:** MEDIUM
**Files:**
- Context switching logic (CREATE/UPDATE)
**Required:**
- Detect context switch
- Reset cart on context switch
- Show confirmation modal
- Clear selected products

### GAP #7: Voucher System
**Priority:** MEDIUM (Can be Phase 2)
**Files:**
- Voucher model (CREATE)
- Voucher issue logic (CREATE)
- Voucher validation (CREATE)

---

## 🎯 PRIORITY ORDER FOR FIXES

### Phase 1: CRITICAL (Must Fix Before Go-Live)
1. **Combo Review Page** - Flow breaks without it
2. **Combo Pricing Application** - Core functionality
3. **Second Eyewear Selection** - Required for combo benefits

### Phase 2: HIGH (Should Fix Before Go-Live)
4. **Needs Summary Screen** - Trust building
5. **Combo Products Page Completion** - Frame MRP, lens price display
6. **Upgrade Logic Completion** - Tier update on upgrade

### Phase 3: MEDIUM (Can be Post-Launch)
7. **Combo Versioning** - Safety feature
8. **Cart Context Lock** - Data integrity
9. **Voucher System** - Feature enhancement

### Phase 4: LOW (Nice to Have)
10. **Analytics Events** - Tracking
11. **Combo Program Entity** - Advanced management
12. **Combo Rules Entity** - Advanced rule management

---

## 🔧 QUICK FIXES NEEDED

### Fix #1: Combo Pricing in Offer Engine
**Location:** `services/offer-engine.service.ts`
**Change:**
```typescript
// Add to OfferCalculationInput
selectedComboCode?: string | null;

// In calculateOffers, if COMBO context:
if (isComboContext && input.selectedComboCode) {
  const comboTier = await prisma.comboTier.findUnique({
    where: { comboCode: input.selectedComboCode },
  });
  if (comboTier) {
    effectiveBase = comboTier.effectivePrice; // Override with combo price
    // Clear all offersApplied (combo price is final)
    offersApplied = [];
  }
}
```

### Fix #2: Create Combo Review Page
**Location:** `/app/questionnaire/[sessionId]/combo/review/page.tsx`
**Required:**
- Fetch session (get selectedComboCode, purchaseContext)
- Fetch combo tier details
- Display selected products
- Show final price
- Link to checkout

### Fix #3: Add Second Eyewear Selection
**Location:** `/app/questionnaire/[sessionId]/combo/products/page.tsx`
**Add:**
- Radio group for "Second Frame" vs "Sunglasses"
- Validation: exactly one required
- Store in session

---

## 📊 IMPLEMENTATION STATUS SUMMARY

| Feature | Status | Priority | Estimated Effort |
|---------|--------|----------|------------------|
| Needs Summary Screen | ❌ Missing | HIGH | 2 hours |
| Combo Review Page | ❌ Missing | CRITICAL | 4 hours |
| Combo Pricing Application | ⚠️ Incomplete | CRITICAL | 3 hours |
| Second Eyewear Selection | ❌ Missing | HIGH | 3 hours |
| Combo Versioning | ❌ Missing | MEDIUM | 4 hours |
| Cart Context Lock | ⚠️ Partial | MEDIUM | 2 hours |
| Voucher System | ❌ Missing | MEDIUM | 6 hours |
| Analytics Events | ❌ Missing | LOW | 4 hours |
| Combo Program Entity | ❌ Missing | LOW | 3 hours |
| Combo Rules Entity | ❌ Missing | LOW | 5 hours |

**Total Critical Gaps:** 3
**Total High Priority Gaps:** 3
**Total Medium Priority Gaps:** 3
**Total Low Priority Gaps:** 3

---

## ✅ NEXT STEPS

1. **IMMEDIATE:** Fix combo pricing application in offer engine
2. **IMMEDIATE:** Create combo review page
3. **IMMEDIATE:** Add second eyewear selection
4. **SOON:** Create needs summary screen
5. **SOON:** Complete upgrade logic
6. **LATER:** Add versioning, vouchers, analytics

