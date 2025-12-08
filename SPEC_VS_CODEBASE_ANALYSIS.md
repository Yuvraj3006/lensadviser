# 📊 SPECIFICATION vs CODEBASE ANALYSIS
## Complete Line-by-Line Comparison Report

**Date:** Generated Analysis  
**Spec Version:** V1.0 (Consolidated Master Specification)  
**Codebase Status:** Current Implementation Review

---

## 🎯 EXECUTIVE SUMMARY

### ✅ **What's Already Implemented:**
1. ✅ Basic Lens Advisor wizard flow (5 steps)
2. ✅ Offer Engine backend (YOPO, Combo, Free Lens, etc.)
3. ✅ Store verification system
4. ✅ Questionnaire system with adaptive questions
5. ✅ Product recommendation engine
6. ✅ Admin panels for managing products, offers, stores

### ❌ **What's Missing/Needs Update:**
1. ❌ **Language Selection** - No `/start` route with language picker
2. ❌ **Proper Routing Structure** - Routes don't match spec (missing `/rx`, `/frame`, `/questions`, `/recommend`, `/offer-summary`, `/checkout`, `/order-success`)
3. ❌ **Order System** - No Order model in Prisma schema
4. ❌ **Staff Model** - No separate Staff model (using User instead)
5. ❌ **Sales Mode** - No SELF_SERVICE vs STAFF_ASSISTED distinction
6. ❌ **4-Lens Recommendation Display** - Current shows all recommendations, not exactly 4 with specific roles
7. ❌ **View All Lenses Modal** - Not implemented as per spec
8. ❌ **Order Lifecycle** - No order status tracking (DRAFT → CUSTOMER_CONFIRMED → STORE_ACCEPTED → PRINTED → PUSHED_TO_LAB)
9. ❌ **QR Code Integration** - No QR-based store initialization
10. ❌ **POS Dashboard** - No POS-specific order management

---

## 📋 DETAILED COMPARISON BY SECTION

### 1. ROUTING STRUCTURE

#### **SPECIFICATION REQUIRES:**
```
/start          → Language selection
/rx             → Prescription entry
/frame          → Frame details
/questions      → Adaptive questionnaire
/recommend      → 4 lens recommendations
/view-all       → Full lens list modal/popup
/offer-summary  → Price breakdown
/checkout       → Customer + staff (optional/mandatory)
/order-success  → Confirmation screen
```

#### **CURRENT IMPLEMENTATION:**
```
/                        → Redirects to /questionnaire
/questionnaire           → Store verification (should be /start)
/questionnaire/[sessionId] → Questions (should be /questions)
/questionnaire/[sessionId]/recommendations → Recommendations (should be /recommend)
/lens-advisor            → Complete wizard (all steps in one page)
/lens-advisor/quick-price → Quick price check
```

**❌ MISMATCH:** Routes don't match spec. Need complete restructuring.

---

### 2. LANGUAGE SELECTION

#### **SPECIFICATION REQUIRES:**
- Screen LA-01: Language Selection
- 3 options: English, हिंदी (Hindi), Hinglish
- Store language preference in global context
- Dynamic translation for all UI elements

#### **CURRENT IMPLEMENTATION:**
- ❌ No language selection screen
- ❌ No i18n system implemented
- ❌ All text is hardcoded in English

**❌ MISSING:** Complete language system needs to be built.

---

### 3. PRESCRIPTION ENTRY (RX)

#### **SPECIFICATION REQUIRES:**
- Screen LA-02: Prescription Entry
- Fields: SPH, CYL, AXIS, ADD (Right/Left), PD
- Index recommendation panel showing suggested index based on power
- Validation with warnings for out-of-range values
- Vision type inference (SV/PAL/BF/AF/Myopia)

#### **CURRENT IMPLEMENTATION:**
- ✅ `PrescriptionForm` component exists in `/components/lens-advisor/PrescriptionForm.tsx`
- ✅ Rx validation logic exists
- ✅ Index recommendation logic exists in `services/benefit-recommendation.service.ts`
- ⚠️ Not on separate `/rx` route (embedded in `/lens-advisor`)

**⚠️ PARTIAL:** Component exists but needs to be moved to `/rx` route.

---

### 4. FRAME ENTRY

#### **SPECIFICATION REQUIRES:**
- Screen LA-03: Frame Entry
- Fields: Brand, Sub-category (for Lenstrack), MRP, Type (Full/Half/Rimless), Material
- Used for YOPO eligibility, combo eligibility, discounts

#### **CURRENT IMPLEMENTATION:**
- ✅ `FrameEntryForm` component exists
- ✅ Frame brands API exists (`/api/admin/frame-brands`)
- ✅ Frame data structure matches spec
- ⚠️ Not on separate `/frame` route

**⚠️ PARTIAL:** Component exists but needs separate route.

---

### 5. ADAPTIVE QUESTIONNAIRE

#### **SPECIFICATION REQUIRES:**
- Screen LA-04: Questionnaire Wizard
- One question at a time
- Sub-questions triggered by answers
- Progress indicator
- Benefit weights calculated from answers

#### **CURRENT IMPLEMENTATION:**
- ✅ `QuestionnaireWizard` component exists
- ✅ Questions API exists (`/api/questionnaire/questions`)
- ✅ Adaptive logic exists (parentAnswerId in Question model)
- ✅ Benefit scoring exists in `services/benefit-recommendation.service.ts`
- ⚠️ Not on separate `/questions` route

**⚠️ PARTIAL:** Component exists but needs separate route.

---

### 6. LENS RECOMMENDATIONS (4-CARD LAYOUT)

#### **SPECIFICATION REQUIRES:**
- Screen LA-05: Always show exactly 4 lenses:
  1. **Best Match Lens** (highest match%)
  2. **Recommended Index Lens** (matches power-based index recommendation)
  3. **Premium Upgrade Lens** (above 100% match, premium option)
  4. **Budget Walkout Prevention Lens** (lowest safe option)
- Each card shows: Tag, Name, Index, Match %, Benefits, Price, YOPO/Combo/Free Lens tags
- "View All Lenses" button opens modal

#### **CURRENT IMPLEMENTATION:**
- ✅ `LensRecommendations` component exists
- ✅ Recommendation API exists (`/api/questionnaire/recommend`)
- ✅ Match scoring exists
- ❌ **NOT showing exactly 4 cards with specific roles**
- ❌ **No "View All Lenses" modal**
- ❌ **No role tags (BEST_MATCH, RECOMMENDED_INDEX, PREMIUM, BUDGET)**

**❌ INCOMPLETE:** Needs to be restructured to show exactly 4 cards with role-based selection.

---

### 7. VIEW ALL LENSES MODAL

#### **SPECIFICATION REQUIRES:**
- Screen LA-06: View All Lenses (Popup/Full Screen)
- Sorting options: Price High→Low, Price Low→High, Match % High→Low, Index Thin→Thick
- Warning text for lower index selections
- Select button returns to recommendations

#### **CURRENT IMPLEMENTATION:**
- ❌ **Not implemented**

**❌ MISSING:** Complete feature needs to be built.

---

### 8. OFFER ENGINE UI

#### **SPECIFICATION REQUIRES:**
- Screen OF-01: Offer Summary
- Shows: Selected Lens, Selected Frame, Price Breakdown
- Applied Offers: YOPO, Combo, Free Lens, Brand Discount, Flat Discount, BOGO50, Category Discount
- Upsell Banner: "Add ₹X more to unlock..."
- Final Payable prominently displayed

#### **CURRENT IMPLEMENTATION:**
- ✅ `OfferCalculatorView` component exists
- ✅ Offer calculation API exists (`/api/offers/calculate`, `/api/offer-engine/calculate`)
- ✅ Upsell engine exists in `services/offer-engine.service.ts`
- ⚠️ Not on separate `/offer-summary` route
- ⚠️ Upsell banner may not match spec exactly

**⚠️ PARTIAL:** Component exists but needs route separation and UI refinement.

---

### 9. CHECKOUT & ORDER SYSTEM

#### **SPECIFICATION REQUIRES:**
- Screen ST-01: Checkout (Self-Service Mode)
  - Customer details (optional)
  - Staff selection (optional)
- Screen ST-02: Checkout (POS Mode)
  - Customer details (optional)
  - Staff selection (mandatory, pre-filled)
- Order Model with:
  - storeId, salesMode, assistedByStaffId, assistedByName
  - frameData, lensData, offerData (JSON)
  - finalPrice
  - status: DRAFT → CUSTOMER_CONFIRMED → STORE_ACCEPTED → PRINTED → PUSHED_TO_LAB

#### **CURRENT IMPLEMENTATION:**
- ❌ **No Order model in Prisma schema**
- ❌ **No checkout page**
- ❌ **No order creation API**
- ❌ **No order status lifecycle**
- ❌ **No salesMode distinction**

**❌ MISSING:** Complete order system needs to be built.

---

### 10. ORDER SUCCESS SCREEN

#### **SPECIFICATION REQUIRES:**
- Screen ST-03: Order Success
- Shows: Order ID, Store Name, Frame + Lens summary, Amount
- Next steps message
- "New Customer" button

#### **CURRENT IMPLEMENTATION:**
- ❌ **Not implemented**

**❌ MISSING:** Complete feature needs to be built.

---

### 11. STORE + STAFF SYSTEM

#### **SPECIFICATION REQUIRES:**
- Store model with: id, code, name, city, address, qrCodeUrl, status
- Staff model with: id, storeId, name, phone, role, status
- QR code scanning → auto-infer store
- Staff list API: `GET /store/{id}/staff`
- Sales mode: SELF_SERVICE (QR) vs STAFF_ASSISTED (POS)

#### **CURRENT IMPLEMENTATION:**
- ✅ Store model exists (but missing `qrCodeUrl` field)
- ❌ **No separate Staff model** (using User model instead)
- ❌ **No Staff API** (`/api/store/{id}/staff`)
- ❌ **No QR code integration**
- ❌ **No salesMode in session/order context**

**❌ INCOMPLETE:** Needs Staff model, QR integration, and sales mode handling.

---

### 12. DATA MODELS (PRISMA SCHEMA)

#### **SPECIFICATION REQUIRES:**

**Order Model:**
```prisma
model Order {
  id              String   @id @default(cuid())
  storeId         String
  salesMode       SalesMode  // SELF_SERVICE | STAFF_ASSISTED
  assistedByStaffId String?  // FK to Staff
  assistedByName  String?
  customerName    String?
  customerPhone   String?
  frameData       Json
  lensData        Json
  offerData       Json
  finalPrice      Float
  status          OrderStatus  // DRAFT | CUSTOMER_CONFIRMED | STORE_ACCEPTED | PRINTED | PUSHED_TO_LAB
  createdAt       DateTime
  updatedAt       DateTime
}
```

**Staff Model:**
```prisma
model Staff {
  id        String   @id @default(cuid())
  storeId   String   // FK to Store
  name      String
  phone     String?
  role      StaffRole  // STORE_MANAGER | NC | JR | OPTOMETRIST | SALES
  status    StaffStatus  // ACTIVE | INACTIVE
}
```

**Store Model Updates:**
```prisma
model Store {
  // ... existing fields
  qrCodeUrl String?  // NEW: QR code URL
  status    StoreStatus  // ACTIVE | INACTIVE (already exists as isActive)
}
```

#### **CURRENT IMPLEMENTATION:**
- ❌ **No Order model**
- ❌ **No Staff model** (using User instead)
- ⚠️ Store model exists but missing `qrCodeUrl`
- ✅ Store has `isActive` (can map to status)

**❌ MISSING:** Order and Staff models need to be added.

---

### 13. API ENDPOINTS

#### **SPECIFICATION REQUIRES:**

**Lens Advisor APIs:**
- `POST /lens/recommend` ✅ (exists as `/api/questionnaire/recommend`)
- `GET /lens/view-all` ❌ (not implemented)

**Offer Engine APIs:**
- `POST /offer/calculate` ✅ (exists as `/api/offers/calculate`)

**Store + Staff APIs:**
- `GET /store/list` ✅ (exists as `/api/admin/stores`)
- `GET /store/{id}/staff` ❌ (not implemented)

**Order APIs:**
- `POST /order/create` ❌ (not implemented)
- `POST /order/confirm` ❌ (not implemented)
- `POST /order/store-accept` ❌ (not implemented)
- `POST /order/print` ❌ (not implemented)
- `POST /order/push-to-lab` ❌ (not implemented)

#### **CURRENT IMPLEMENTATION:**
- ✅ Most Lens Advisor APIs exist (but routes differ)
- ✅ Offer Engine API exists
- ✅ Store APIs exist (admin routes)
- ❌ **No Order APIs**
- ❌ **No Staff APIs**

---

### 14. STATE MANAGEMENT

#### **SPECIFICATION REQUIRES:**
Global state for:
- `language`: 'en' | 'hi' | 'hinglish'
- `storeId`: string | null
- `salesMode`: 'SELF_SERVICE' | 'STAFF_ASSISTED'
- `staffId`: string | null (for POS mode)
- `rxData`: RxInput
- `frameData`: FrameInput
- `answers`: AnswerSelection[]
- `recommendedLenses`: LensOption[]
- `selectedLens`: LensOption
- `offerSummary`: OfferSummary

#### **CURRENT IMPLEMENTATION:**
- ✅ `lens-advisor-store.ts` exists with Zustand
- ⚠️ Missing: `language`, `storeId`, `salesMode`, `staffId` in store
- ✅ Has: `rx`, `frame`, `answers`, `recommendations`, `selectedLens`, `offerResult`

**⚠️ PARTIAL:** Store exists but missing session context (language, store, sales mode).

---

### 15. UI COMPONENTS

#### **SPECIFICATION REQUIRES:**
- `<LanguageSelector />` ❌
- `<RxForm />` ✅ (as PrescriptionForm)
- `<FrameForm />` ✅ (as FrameEntryForm)
- `<QuestionnaireWizard />` ✅
- `<LensRecommendationGrid />` ✅ (as LensRecommendations, but needs 4-card logic)
- `<LensCard />` ✅ (exists)
- `<ViewAllLensModal />` ❌
- `<OfferSummary />` ✅ (as OfferCalculatorView)
- `<UpsellBanner />` ⚠️ (may exist but needs verification)
- `<CheckoutForm />` ❌
- `<OrderSuccess />` ❌
- `<OrdersDashboard />` ❌

---

## 🔧 REQUIRED CHANGES SUMMARY

### **CRITICAL (Must Have):**

1. **Database Schema Updates:**
   - Add `Order` model
   - Add `Staff` model (or repurpose User)
   - Add `qrCodeUrl` to Store
   - Add enums: `SalesMode`, `OrderStatus`, `StaffRole`

2. **Routing Restructure:**
   - Create `/start` route (language selection)
   - Create `/rx` route (prescription)
   - Create `/frame` route (frame entry)
   - Create `/questions` route (questionnaire)
   - Create `/recommend` route (4-card recommendations)
   - Create `/view-all` route (modal/popup)
   - Create `/offer-summary` route (pricing)
   - Create `/checkout` route (order creation)
   - Create `/order-success` route (confirmation)

3. **Language System:**
   - Implement i18n system
   - Add language selector component
   - Add translation dictionaries (en, hi, hinglish)

4. **Order System:**
   - Create Order model
   - Create order APIs (create, confirm, accept, print, push-to-lab)
   - Implement order lifecycle
   - Create checkout page
   - Create order success page

5. **Staff System:**
   - Create Staff model or repurpose User
   - Create staff APIs
   - Add staff selection in checkout

6. **4-Lens Recommendation Logic:**
   - Modify recommendation engine to always return exactly 4 lenses
   - Add role tags (BEST_MATCH, RECOMMENDED_INDEX, PREMIUM, BUDGET)
   - Implement role-based selection logic

7. **View All Lenses Modal:**
   - Create modal component
   - Implement sorting (price, match%, index)
   - Add thickness warnings

8. **Sales Mode:**
   - Add salesMode to session/order context
   - Implement QR-based store initialization
   - Make staff selection optional/mandatory based on mode

### **IMPORTANT (Should Have):**

9. **POS Dashboard:**
   - Create POS order list page
   - Add order status management
   - Add print functionality

10. **QR Code Integration:**
    - Add QR code generation for stores
    - Implement QR scanning flow
    - Auto-populate store context

---

## 📊 IMPLEMENTATION PRIORITY

### **Phase 1: Core Structure (Week 1)**
1. Database schema updates (Order, Staff models)
2. Routing restructure (all new routes)
3. Language system implementation
4. Session context (store, salesMode, language)

### **Phase 2: Lens Advisor Flow (Week 2)**
5. Language selection page
6. Separate route pages (rx, frame, questions)
7. 4-lens recommendation logic
8. View All Lenses modal

### **Phase 3: Order System (Week 3)**
9. Order creation APIs
10. Checkout page (self-service + POS modes)
11. Order success page
12. Order lifecycle management

### **Phase 4: Staff & POS (Week 4)**
13. Staff model/APIs
14. QR code integration
15. POS dashboard
16. Sales mode handling

---

## ✅ VERIFICATION CHECKLIST

- [ ] Language selection implemented
- [ ] All routes match specification
- [ ] Order model created
- [ ] Staff model created
- [ ] 4-lens recommendation always shows
- [ ] View All Lenses modal works
- [ ] Checkout page supports both modes
- [ ] Order APIs implemented
- [ ] Order lifecycle works
- [ ] QR code integration works
- [ ] POS dashboard exists
- [ ] Sales mode handling works
- [ ] i18n system works
- [ ] All UI components match wireframes

---

**END OF ANALYSIS**

