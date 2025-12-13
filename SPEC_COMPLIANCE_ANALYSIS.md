# Spec Compliance Analysis - Combo + Regular Purchase Flow

## ✅ IMPLEMENTED (Matches Spec)

### 1. Purchase Contexts ✅
- ✅ REGULAR, COMBO, YOPO contexts defined
- ✅ Mutually exclusive enforcement
- ✅ Session stores purchaseContext

### 2. Master Switch ✅
- ✅ Config.combo_offer_status = ON/OFF
- ✅ Path choice auto-redirects when OFF
- ✅ Admin UI for toggle

### 3. Questionnaire Flow ✅
- ✅ Mandatory questionnaire
- ✅ Needs Profile generation
- ✅ Needs Summary screen

### 4. Combo Tiers ✅
- ✅ ComboTier model with benefits
- ✅ Comparison cards UI
- ✅ Default highlighting logic (backup_need + lens_complexity)

### 5. Eligibility Rules ✅
- ✅ Brand-wise for frames (combo_allowed)
- ✅ SKU-wise + brand cross-check for lenses
- ✅ Double-lock enforcement

### 6. Combo Pricing ✅
- ✅ Offer engine applies combo tier effective_price
- ✅ Blocks all discounts except coupon
- ✅ Final authoritative price

### 7. Upgrade Suggestion ✅
- ✅ Modal component
- ✅ T1, T2, T3 triggers implemented
- ✅ Upgrade ladder (Bronze → Silver → Gold → Platinum)

### 8. Admin Controls ✅
- ✅ Settings page (master switch)
- ✅ Combo Tiers CRUD
- ✅ Brand/lens eligibility flags

---

## ❌ GAPS (Need Fixing)

### GAP 1: T4 Trigger - BOTH_OPTIONS ❌
**Spec:** T4 - Customer wants both options (2nd eyewear + sunglasses)
**Current:** validate-selection has T4 comment but logic incomplete
**Fix:** Check if both FRAME and SUN selected, trigger upgrade

### GAP 2: Needs Profile Fetch in Combo Tiers ❌
**Spec:** Default tier based on needs profile
**Current:** fetchNeedsProfile exists but doesn't actually fetch
**Fix:** Call needs-profile API endpoint

### GAP 3: Cart Context Lock ❌
**Spec:** Once item added, lock purchase_context. Switching = cart reset
**Current:** No cart entity, no context lock logic
**Fix:** Add context lock check on path switch

### GAP 4: Voucher Policy ❌
**Spec:** Voucher issued at checkout, not usable on same bill
**Current:** No voucher model/implementation
**Fix:** Add Voucher model and enforcement

### GAP 5: ComboRules Entity (Optional) ⚠️
**Spec:** Rule-based enforcement (FRAME_BRAND_ALLOW, etc.)
**Current:** Using brand flags only
**Status:** Optional per spec, can be Phase 2

### GAP 6: Combo Tier Detail Page with Tabs ⚠️
**Spec:** Screen 3 - Tier Detail with tabs (Benefits, Rules, Preview)
**Current:** Basic CRUD, no detail page with tabs
**Status:** Can be Phase 2

### GAP 7: Analytics Events ❌
**Spec:** Capture questionnaire_started, path_selected, etc.
**Current:** No analytics tracking
**Status:** Phase 2

### GAP 8: Prescription Entry Order ⚠️
**Spec:** Step 1 - Prescription entry (before questionnaire)
**Current:** Prescription can be before or after frame entry
**Status:** Flow works, but order may differ

---

## 🔧 FIXES NEEDED

### Fix 1: T4 Trigger - BOTH_OPTIONS
**File:** `app/api/combo/validate-selection/route.ts`
**Action:** Complete T4 logic to check if both FRAME and SUN selected

### Fix 2: Needs Profile Fetch
**File:** `app/questionnaire/[sessionId]/combo/tiers/page.tsx`
**Action:** Actually fetch needs profile from API

### Fix 3: Cart Context Lock
**File:** `app/questionnaire/[sessionId]/path-choice/page.tsx`
**Action:** Check if items in cart, show warning/reset on context switch

### Fix 4: Voucher Model & Policy
**Files:** `prisma/schema.prisma`, `app/api/order/create/route.ts`
**Action:** Add Voucher model, enforce "not usable on same bill"

---

## 📊 COMPLIANCE SCORE

**Critical (Must Fix):** 3 gaps
**Important (Should Fix):** 2 gaps  
**Optional (Phase 2):** 3 gaps

**Overall Compliance:** ~85%

