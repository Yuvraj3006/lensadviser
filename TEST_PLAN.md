# 🧪 COMPREHENSIVE TEST PLAN
## LensTrack Offer Engine - Documentation-Based Testing

---

## 📋 **TEST CATEGORIES**

### 1. Database Schema Tests
### 2. API Endpoint Tests
### 3. Offer Engine Logic Tests
### 4. Admin UI Tests
### 5. Customer Flow Tests
### 6. Integration Tests

---

## 1️⃣ **DATABASE SCHEMA TESTS**

### Test 1.1: Product Model Fields
- [ ] `itCode` field exists and is optional
- [ ] `brandLine` field exists and is enum type
- [ ] `yopoEligible` field exists and is boolean (default false)
- [ ] `subCategory` field exists and is optional string

### Test 1.2: Session Model Fields
- [ ] `customerCategory` field exists and is enum type (optional)

### Test 1.3: Offer Engine Models
- [ ] `OfferRule` model exists with all required fields
- [ ] `CategoryDiscount` model exists with all required fields
- [ ] `Coupon` model exists with all required fields
- [ ] `OfferApplicationLog` model exists with all required fields

### Test 1.4: Enums
- [ ] `BrandLine` enum has all values
- [ ] `CustomerCategory` enum has all values
- [ ] `DiscountType` enum has all values
- [ ] `OfferRuleType` enum has all values

---

## 2️⃣ **API ENDPOINT TESTS**

### Test 2.1: Offer Calculation API
**Endpoint**: `POST /api/offers/calculate`

**Test Cases**:
- [ ] Calculate with frame + lens only (no offers)
- [ ] Calculate with YOPO eligible lens
- [ ] Calculate with combo price offer
- [ ] Calculate with percentage discount
- [ ] Calculate with flat discount
- [ ] Calculate with customer category discount
- [ ] Calculate with coupon code
- [ ] Calculate with second pair
- [ ] Invalid input validation
- [ ] Missing organizationId error

### Test 2.2: Recalculate Offers API
**Endpoint**: `POST /api/public/questionnaire/sessions/[sessionId]/recalculate-offers`

**Test Cases**:
- [ ] Recalculate with coupon code
- [ ] Recalculate with second pair
- [ ] Recalculate with both coupon and second pair
- [ ] Invalid session ID error
- [ ] Invalid product ID error
- [ ] Invalid coupon code error

### Test 2.3: Offer Rules Admin API
**Endpoints**: 
- `GET /api/admin/offers/rules`
- `POST /api/admin/offers/rules`
- `PUT /api/admin/offers/rules/[id]`
- `DELETE /api/admin/offers/rules/[id]`

**Test Cases**:
- [ ] List all offer rules
- [ ] Filter by organizationId
- [ ] Create new offer rule (all types)
- [ ] Update existing offer rule
- [ ] Delete offer rule
- [ ] Validation errors

### Test 2.4: Category Discounts Admin API
**Endpoints**:
- `GET /api/admin/offers/category-discounts`
- `POST /api/admin/offers/category-discounts`

**Test Cases**:
- [ ] List all category discounts
- [ ] Create category discount
- [ ] Validation errors

### Test 2.5: Coupons Admin API
**Endpoints**:
- `GET /api/admin/coupons`
- `POST /api/admin/coupons`

**Test Cases**:
- [ ] List all coupons
- [ ] Create coupon
- [ ] Validation errors

---

## 3️⃣ **OFFER ENGINE LOGIC TESTS**

### Test 3.1: Waterfall Priority Logic
- [ ] COMBO_PRICE has highest priority
- [ ] YOPO applies when combo not available
- [ ] FREE_ITEM applies when YOPO not available
- [ ] PERCENTAGE applies when free item not available
- [ ] FLAT applies when percentage not available

### Test 3.2: YOPO Logic
- [ ] YOPO applies only to eligible lenses
- [ ] YOPO calculation: min(frameMRP, lensPrice) * 0.5
- [ ] YOPO doesn't apply if not eligible

### Test 3.3: Combo Price Logic
- [ ] Combo price replaces base total
- [ ] Savings calculated correctly
- [ ] Applies only when conditions match

### Test 3.4: Free Item Logic
- [ ] Free item discount equals lens price
- [ ] Applies only when conditions match

### Test 3.5: Percentage Discount
- [ ] Percentage calculated on base total
- [ ] Max discount cap respected
- [ ] Applies only when conditions match

### Test 3.6: Flat Discount
- [ ] Flat amount deducted from total
- [ ] Applies only when conditions match

### Test 3.7: Category Discount
- [ ] Applied after primary offer
- [ ] Percentage calculated correctly
- [ ] Max discount cap respected
- [ ] Brand code matching works

### Test 3.8: Coupon Discount
- [ ] Applied after category discount
- [ ] Min cart value validation
- [ ] Usage limits checked
- [ ] Expiry date checked

### Test 3.9: Second Pair Discount
- [ ] Applied on second pair only
- [ ] Percentage calculated correctly
- [ ] First pair total used correctly

---

## 4️⃣ **ADMIN UI TESTS**

### Test 4.1: Offer Rules Page (`/admin/offers/rules`)
- [ ] Page loads without errors
- [ ] List of rules displays correctly
- [ ] Create new rule form works
- [ ] Edit existing rule works
- [ ] Delete rule works
- [ ] All form fields validate correctly
- [ ] Priority field works
- [ ] Date pickers work

### Test 4.2: Category Discounts Page (`/admin/offers/category-discounts`)
- [ ] Page loads without errors
- [ ] List of discounts displays correctly
- [ ] Create new discount form works
- [ ] Edit existing discount works
- [ ] Delete discount works
- [ ] Customer category dropdown works

### Test 4.3: Coupons Page (`/admin/offers/coupons`)
- [ ] Page loads without errors
- [ ] List of coupons displays correctly
- [ ] Create new coupon form works
- [ ] Edit existing coupon works
- [ ] Delete coupon works
- [ ] Discount type selector works

### Test 4.4: Offer Calculator Page (`/admin/offers/calculator`)
- [ ] Page loads without errors
- [ ] Frame input form works
- [ ] Lens input form works
- [ ] Customer category selector works
- [ ] Coupon code input works
- [ ] Second pair toggle works
- [ ] Calculate button triggers calculation
- [ ] Results display correctly
- [ ] Price breakdown shows all components

---

## 5️⃣ **CUSTOMER FLOW TESTS**

### Test 5.1: Questionnaire Start
- [ ] Customer category selection appears
- [ ] Category selection saves to session
- [ ] All customer categories available

### Test 5.2: Recommendations Page
- [ ] Recommendations load correctly
- [ ] Offers display for each product
- [ ] Price breakdown shows correctly
- [ ] Coupon code input field visible
- [ ] Apply coupon button works
- [ ] Second pair toggle visible
- [ ] Second pair inputs appear when enabled

### Test 5.3: Coupon Application
- [ ] Valid coupon applies successfully
- [ ] Invalid coupon shows error
- [ ] Coupon discount appears in breakdown
- [ ] Final price updates correctly
- [ ] Toast notification shows

### Test 5.4: Second Pair Flow
- [ ] Toggle enables/disables second pair
- [ ] Input fields appear when enabled
- [ ] Calculation includes second pair discount
- [ ] Second pair discount shows in breakdown
- [ ] Final price includes both pairs

### Test 5.5: Offer Breakdown Display
- [ ] Primary offer shows correctly
- [ ] Category discount shows separately
- [ ] Coupon discount shows separately
- [ ] Second pair discount shows separately
- [ ] Final payable calculated correctly
- [ ] Total savings calculated correctly

---

## 6️⃣ **INTEGRATION TESTS**

### Test 6.1: Recommendation Engine Integration
- [ ] Recommendations use new offer engine
- [ ] Product data converted correctly
- [ ] Offers calculated for each recommendation
- [ ] Pricing breakdown matches offer engine output

### Test 6.2: Session Integration
- [ ] Customer category saved in session
- [ ] Session data used in offer calculation
- [ ] Recommendations persist correctly

### Test 6.3: End-to-End Flow
- [ ] Start questionnaire → Select category → Answer questions
- [ ] View recommendations → See offers
- [ ] Apply coupon → See updated price
- [ ] Enable second pair → See final price
- [ ] Complete flow without errors

---

## 🎯 **TEST EXECUTION ORDER**

1. **Database Schema** (5 min)
2. **API Endpoints** (15 min)
3. **Offer Engine Logic** (20 min)
4. **Admin UI** (15 min)
5. **Customer Flow** (15 min)
6. **Integration** (10 min)

**Total Estimated Time**: ~80 minutes

---

## ✅ **SUCCESS CRITERIA**

- All database fields exist and are correct
- All API endpoints return correct responses
- Offer calculations match specification
- UI pages load and function correctly
- Customer flow works end-to-end
- No console errors
- No TypeScript errors

---

*Test Plan Created: December 2025*

