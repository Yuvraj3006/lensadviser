# 🔧 CONTACT LENS FLOW - DEVELOPER IMPLEMENTATION BRIEF

## ✅ COMPLETED TASKS

### 1. ✅ Power Conversion Logic (Backend)
- **File**: `app/api/contact-lens/convert-power/route.ts`
- **Status**: ✅ Complete
- **Features**:
  - Toric detection (|CYL| ≥ 0.75)
  - Spherical Equivalent (|CYL| ≤ 0.50)
  - Vertex conversion (|SPH| ≥ 4.00D)
  - ADD category mapping (LOW/MEDIUM/HIGH)

### 2. ✅ Compatibility Summary
- **File**: `app/questionnaire/contact-lens/spectacle-power/page.tsx`
- **Status**: ✅ Complete
- **Features**: Shows compatibility summary after conversion

### 3. ✅ Contact Lens Questionnaire
- **File**: `app/questionnaire/contact-lens/questionnaire/page.tsx`
- **Status**: ✅ Complete
- **Features**: 5 questions with benefit mapping

### 4. ✅ Recommendations API
- **File**: `app/api/contact-lens/recommendations/route.ts`
- **Status**: ✅ Complete
- **Features**: Returns 4 recommendation types (Best Match, Premium Comfort, Value, Budget)

---

## 🚧 REMAINING TASKS

### 5. ⏳ Replace Dropdown with 4-Card Recommendation UI
**File**: `app/questionnaire/contact-lens/page.tsx`

**Current**: Dropdown selection
**Required**: 4 recommendation cards similar to spectacle lens advisor

**Implementation Steps**:
1. Replace `fetchContactLensProducts()` to call `/api/contact-lens/recommendations`
2. Display 4 cards:
   - **Best Match** (highest match %)
   - **Premium Comfort Pick** (silicone hydrogel, high oxygen)
   - **Value Pick** (good price-performance)
   - **Budget Pick** (lowest price, still compatible)
3. Each card should show:
   - Product name + brand
   - Price (MRP + Offer Price)
   - Match % (0-100)
   - Comfort Score (1-5 stars)
   - Material (Hydrogel / Silicone Hydrogel)
   - Water Content %
   - Oxygen (Dk/t) - if available
   - Usage (Daily / Monthly / Yearly)
   - Vision Type (Spherical / Toric / Multifocal)
   - Available Packs
   - Buttons: "Compare", "Select", "See Compatibility"

**Card Component Structure**:
```tsx
<ContactLensRecommendationCard
  product={recommendation.product}
  type={recommendation.type} // 'BEST_MATCH' | 'PREMIUM_COMFORT' | 'VALUE' | 'BUDGET'
  onSelect={() => handleSelectProduct(product.id)}
  onCompare={() => handleAddToCompare(product.id)}
  onViewCompatibility={() => handleViewCompatibility(product)}
/>
```

---

### 6. ⏳ Add Comparison Table Component
**File**: `components/contact-lens/ComparisonTable.tsx` (NEW)

**Features**:
- Compare up to 4 products side-by-side
- Show: Material, Water %, Oxygen, UV Protection, Comfort Score, Pack, Price, Match %
- "Select" button for each product
- Remove from comparison option

**Usage**:
```tsx
<ComparisonTable
  products={comparedProducts}
  onSelect={(productId) => handleSelectProduct(productId)}
  onRemove={(productId) => handleRemoveFromCompare(productId)}
/>
```

---

### 7. ⏳ Improve Pack Selection
**File**: `app/questionnaire/contact-lens/page.tsx` (after product selection)

**Current**: Basic pack type selection
**Required**: Enhanced pack selection with:
- Price per box
- Lenses per box
- Effective per-month cost
- Auto-apply CL offers (e.g., "Buy 2 boxes → 15% OFF")
- Show savings/offers clearly

**UI Example**:
```
Pack Options:
┌─────────────────────────────────────┐
│ 1 Box (6 lenses, 3 months)          │
│ ₹1,499                              │
│ ₹500/month                          │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ 2 Boxes (12 lenses, 6 months)       │
│ ₹2,998 → ₹2,798 (₹200 OFF)         │
│ ₹466/month                          │
│ ✓ Best Value                        │
└─────────────────────────────────────┘
```

---

### 8. ⏳ Fix Add-ons Page
**File**: `app/questionnaire/[sessionId]/contact-lens-addons/page.tsx` (CHECK IF EXISTS)

**Current**: Only "Lens Cleaner"
**Required**: Full CL add-ons catalog:
- Contact Lens Solution (primary upsell)
- Lens Case
- Travel Kit (case + mini solution)
- Lubricating Eye Drops
- Extra CL Cases

**Features**:
- Each add-on linked to Offer Engine for combos
- Default: unchecked
- Show combo offers (e.g., "CL + Solution → ₹150 OFF")

---

### 9. ⏳ CL-Specific Offer Engine Integration
**Files**: 
- `services/offer-engine.service.ts` (update)
- `app/questionnaire/contact-lens/page.tsx` (integrate)

**Required Offers**:
1. **Quantity-based**:
   - Buy 2 Boxes → 15% OFF
   - Buy 4+ Boxes → 10% OFF
2. **Combo offers**:
   - CL + Solution → ₹150 OFF
3. **Brand-level**:
   - Brand-specific discounts (e.g., "B&L Ultra 10% OFF")
4. **Bill-level**:
   - Flat & % OFF

**Implementation**:
- Read current CL items + add-ons
- Apply priority: CL combos → Brand offers → Flat/% bill offers
- Return full breakdown (base price, discount, final)

---

### 10. ⏳ Improve Order Summary
**File**: `app/questionnaire/[sessionId]/order-success/[orderId]/page.tsx` (or wherever order summary is shown)

**Required Sections**:
1. **Prescription Used**:
   - OD & OS CL powers (Sphere, CYL, Axis, ADD/category)
2. **Selected Contact Lens Product**:
   - Brand, line, pack type, quantity
3. **Add-ons Selected**:
   - Solutions, cases, drops
4. **Offers Applied**:
   - CL offer (e.g., "Buy 2, Get 15% Off")
   - Bill-level discount
   - Any coupon
5. **Total Payable**
6. **Upsell Suggestion** (if applicable):
   - e.g., "Add 1 more box to unlock 10% OFF on all CLs"

---

## 📋 IMPLEMENTATION CHECKLIST

- [x] Fix power conversion logic (toric, SE, vertex, ADD)
- [x] Add compatibility summary
- [x] Create CL questionnaire page
- [x] Create recommendations API
- [ ] Replace dropdown with 4-card recommendation UI
- [ ] Add comparison table component
- [ ] Improve pack selection with pricing
- [ ] Fix add-ons page with CL-specific items
- [ ] Integrate CL-specific offer engine
- [ ] Improve order summary

---

## 🔗 RELATED FILES

### Backend APIs:
- `/api/contact-lens/convert-power` ✅
- `/api/contact-lens/search` ✅
- `/api/contact-lens/recommendations` ✅

### Frontend Pages:
- `/questionnaire/contact-lens/power-input-method` ✅
- `/questionnaire/contact-lens/spectacle-power` ✅
- `/questionnaire/contact-lens/cl-power` ✅
- `/questionnaire/contact-lens/questionnaire` ✅
- `/questionnaire/contact-lens` ⏳ (needs 4-card UI)
- `/questionnaire/[sessionId]/contact-lens-addons` ⏳ (needs update)

### Components:
- `components/contact-lens/ContactLensRecommendationCard.tsx` ⏳ (NEW)
- `components/contact-lens/ComparisonTable.tsx` ⏳ (NEW)

---

## 🎯 PRIORITY ORDER

1. **HIGH**: Replace dropdown with 4-card UI (#5)
2. **HIGH**: Add comparison table (#6)
3. **MEDIUM**: Improve pack selection (#7)
4. **MEDIUM**: Fix add-ons page (#8)
5. **MEDIUM**: CL offer engine (#9)
6. **LOW**: Order summary improvements (#10)

---

## 📝 NOTES

- All power conversion logic is complete and tested
- Questionnaire maps answers to benefits correctly
- Recommendations API returns 4 recommendation types
- Need to create card components and update main page UI
- Offer engine needs CL-specific rules added
- Order summary needs CL-specific details section
