# Combo + Regular Purchase Flow - Testing Guide

## ✅ Setup Complete

1. ✅ Database migration applied (`npx prisma db push`)
2. ✅ Combo tiers seeded (Bronze, Silver, Gold, Platinum)
3. ✅ `combo_offer_status` set to `ON`
4. ✅ Sample brands and lens products enabled for combo

## 🧪 Testing Checklist

### 1. Config & Master Switch Test

**Test: Combo OFF should hide combo option**
- [ ] Set `combo_offer_status` to `OFF` in Config table
- [ ] Start questionnaire session
- [ ] Complete questionnaire
- [ ] Verify: Path choice screen should auto-redirect to REGULAR (no combo option shown)

**Test: Combo ON should show both options**
- [ ] Set `combo_offer_status` to `ON` in Config table
- [ ] Start questionnaire session
- [ ] Complete questionnaire
- [ ] Verify: Path choice screen shows both "Build My Glasses" and "Smart Value Combo"

### 2. Questionnaire → NeedsProfile Generation

**Test: NeedsProfile is generated after questionnaire completion**
- [ ] Start new questionnaire session
- [ ] Answer all questions
- [ ] Verify: After completion, check `NeedsProfile` table for session
- [ ] Verify: NeedsProfile contains fields like `screen_time`, `backup_need`, `lens_complexity`

**API Test:**
```bash
# Complete questionnaire
POST /api/public/questionnaire/sessions/{sessionId}/answer
{
  "questionId": "...",
  "optionIds": ["..."]
}

# Check NeedsProfile
GET /api/public/questionnaire/sessions/{sessionId}
# Should include needsProfile in response
```

### 3. Path Choice Screen

**Test: REGULAR Path Selection**
- [ ] Complete questionnaire
- [ ] Click "Build My Glasses" (REGULAR)
- [ ] Verify: Session `purchaseContext` is set to `REGULAR`
- [ ] Verify: Redirects to recommendations page

**Test: COMBO Path Selection**
- [ ] Complete questionnaire
- [ ] Click "Smart Value Combo" (COMBO)
- [ ] Verify: Session `purchaseContext` is set to `COMBO`
- [ ] Verify: Redirects to combo tiers page

### 4. Combo Tier Selection

**Test: Tier Comparison Cards**
- [ ] Navigate to combo tiers page
- [ ] Verify: All 4 tiers (Bronze, Silver, Gold, Platinum) are displayed
- [ ] Verify: Silver shows "MOST_POPULAR" badge
- [ ] Verify: Gold shows "BEST_VALUE" badge
- [ ] Verify: Default highlighted tier based on NeedsProfile

**Test: Tier Selection**
- [ ] Select a tier (e.g., Silver)
- [ ] Verify: Session `selectedComboCode` is updated
- [ ] Verify: Redirects to combo products page

**API Test:**
```bash
GET /api/combo/tiers
# Should return all active tiers with benefits
```

### 5. Combo Product Selection (Eligibility Filtering)

**Test: Frame Brands Filtering**
- [ ] Navigate to combo products page
- [ ] Verify: Only brands with `comboAllowed=true` are shown
- [ ] Verify: Brands dropdown is populated

**Test: Lens SKUs Filtering (Double-Lock)**
- [ ] Verify: Only lens SKUs where:
  - `lens_brand.comboAllowed=true` AND
  - `lens_sku.comboAllowed=true`
- [ ] Verify: Lens dropdown is populated

**API Tests:**
```bash
# Get combo-eligible frame brands
GET /api/brands?category=frame&context=COMBO

# Get combo-eligible lens SKUs
GET /api/lens-skus?context=COMBO
```

### 6. Upgrade Suggestion Engine

**Test: Ineligible Brand Selection**
- [ ] Select a frame brand that is NOT combo-allowed
- [ ] Click "Continue to Review"
- [ ] Verify: Upgrade suggestion modal appears
- [ ] Verify: Modal suggests next tier (e.g., Silver → Gold)
- [ ] Verify: Reason code is `BRAND_NOT_ELIGIBLE`

**Test: Ineligible Lens Selection**
- [ ] Select a lens SKU that is NOT combo-allowed
- [ ] Click "Continue to Review"
- [ ] Verify: Upgrade suggestion modal appears
- [ ] Verify: Reason code is `LENS_NOT_ELIGIBLE`

**Test: Needs Mismatch**
- [ ] Select Bronze tier
- [ ] Select products that don't match NeedsProfile (e.g., high screen time + advanced lens)
- [ ] Verify: Upgrade suggestion appears with `NEEDS_MISMATCH` reason

**Test: Upgrade Actions**
- [ ] Click "Upgrade to Gold" → Verify: Tier is upgraded, products remain if eligible
- [ ] Click "Continue with Build My Glasses" → Verify: Switches to REGULAR context
- [ ] Click "Change Selection" → Verify: Modal closes, stay on same page

**API Test:**
```bash
POST /api/combo/validate-selection
{
  "session_id": "...",
  "context": "COMBO",
  "combo_code": "SILVER",
  "selected": {
    "frame_brand_id": "...",
    "lens_sku_id": "..."
  },
  "needs_profile": {
    "screen_time": "HIGH",
    "backup_need": true
  }
}
```

### 7. Offer Engine - COMBO Context

**Test: No Discounts in COMBO (Only Coupon)**
- [ ] Complete combo purchase flow
- [ ] Verify: Category discounts are NOT applied
- [ ] Verify: Brand discounts are NOT applied
- [ ] Verify: YOPO is NOT applied
- [ ] Verify: Second pair offers are NOT applied
- [ ] Verify: Coupon CAN be applied (if provided)

**Test: Combo Pricing is Final**
- [ ] Select combo tier (e.g., Silver = ₹4999)
- [ ] Verify: Final price matches combo tier effective price
- [ ] Verify: No additional discounts reduce the price

**API Test:**
```bash
POST /api/offer-engine/calculate
{
  "frame": {...},
  "lens": {...},
  "organizationId": "...",
  "purchaseContext": "COMBO"
}
# Verify: offersApplied should NOT contain category/brand/YOPO/second pair
```

### 8. Offer Engine - REGULAR Context

**Test: YOPO Auto-Apply**
- [ ] Select REGULAR path
- [ ] Select frame brand with `yopoAllowed=true`
- [ ] Select lens with:
  - `lens_brand.yopoAllowed=true` AND
  - `lens_sku.yopoEligible=true`
- [ ] Verify: YOPO is automatically applied
- [ ] Verify: Offer shows "YOPO - Pay Higher"

**Test: All Offers Allowed in REGULAR**
- [ ] Verify: Category discounts apply
- [ ] Verify: Brand discounts apply
- [ ] Verify: YOPO applies (if eligible)
- [ ] Verify: Second pair offers apply
- [ ] Verify: Coupons apply

**API Test:**
```bash
POST /api/offer-engine/calculate
{
  "frame": {...},
  "lens": {...},
  "organizationId": "...",
  "purchaseContext": "REGULAR"
}
# Verify: YOPO auto-applies if eligible
```

### 9. Order Creation - Server-Side Validation

**Test: Block Offer Stacking in COMBO**
- [ ] Try to create order with COMBO context
- [ ] Include disallowed offers (category, brand, YOPO) in offerData
- [ ] Verify: Order creation fails with validation error
- [ ] Verify: Error message explains offer stacking is not allowed

**Test: Mixed Context Block**
- [ ] Try to create order with items from different contexts
- [ ] Verify: Validation prevents mixed contexts

**API Test:**
```bash
POST /api/order/create
{
  "storeId": "...",
  "purchaseContext": "COMBO",
  "offerData": {
    "offersApplied": [
      {"ruleCode": "CATEGORY", ...}  // Should be blocked
    ]
  }
}
# Should return 400 with validation error
```

### 10. End-to-End Flow Test

**Complete REGULAR Flow:**
1. [ ] Start questionnaire session
2. [ ] Complete all questions
3. [ ] Select "Build My Glasses" (REGULAR)
4. [ ] Select frame and lens
5. [ ] Verify: YOPO auto-applies (if eligible)
6. [ ] Verify: Category discounts apply
7. [ ] Complete checkout
8. [ ] Verify: Order created successfully

**Complete COMBO Flow:**
1. [ ] Start questionnaire session
2. [ ] Complete all questions
3. [ ] Select "Smart Value Combo"
4. [ ] Select combo tier (e.g., Silver)
5. [ ] Select combo-eligible frame brand
6. [ ] Select combo-eligible lens SKU
7. [ ] Verify: No discounts applied (only combo price)
8. [ ] Complete checkout
9. [ ] Verify: Order created with COMBO context

## 🔍 Debugging Tips

### Check Session State
```bash
# Get session with purchase context
GET /api/public/questionnaire/sessions/{sessionId}
```

### Check NeedsProfile
```sql
# MongoDB query
db.NeedsProfile.find({ sessionId: ObjectId("...") })
```

### Check Combo Eligibility
```bash
# Check frame brand
GET /api/brands?category=frame&context=COMBO

# Check lens SKU
GET /api/lens-skus?context=COMBO
```

### Check Offer Calculation
```bash
POST /api/offer-engine/calculate
# Include purchaseContext in request
```

## 📝 Notes

- Combo tiers can be managed via admin panel (future enhancement)
- Brand/lens combo eligibility can be updated via admin panel
- `combo_offer_status` master switch controls entire combo feature visibility
- NeedsProfile is generated automatically from questionnaire answers
- Upgrade suggestions are non-binding (customer can choose to ignore)

## 🐛 Known Issues / Future Enhancements

- [ ] Admin UI for managing combo tiers
- [ ] Admin UI for managing brand/lens combo eligibility
- [ ] Analytics events tracking
- [ ] Combo tier pricing based on selected products (dynamic pricing)

