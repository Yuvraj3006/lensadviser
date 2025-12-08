# 📋 Frontend Specification vs Codebase - Line by Line Comparison

## 🔴 CRITICAL MISSING ITEMS

### 1. ROUTE STRUCTURE

| Spec Route | Current Status | Action Needed |
|------------|---------------|---------------|
| `/lens-advisor` | ❌ MISSING | Create main wizard page |
| `/lens-advisor/quick-price` | ❌ MISSING | Create quick price page |
| `/admin/lenses` | ⚠️ PARTIAL (`/admin/products` exists) | Rename/restructure or create new |
| `/admin/lenses/[id]` | ❌ MISSING | Create detail page with tabs |
| `/admin/questionnaire` | ⚠️ PARTIAL (`/admin/questions` exists) | Enhance with tree view |
| `/admin/offers` | ✅ EXISTS | Already implemented |
| `/admin/coupons` | ✅ EXISTS | Already implemented |

### 2. STATE MANAGEMENT

| Spec Requirement | Current Status | Action Needed |
|-----------------|----------------|---------------|
| Zustand store | ❌ NOT INSTALLED | Install zustand, create store |
| React Query | ❌ NOT INSTALLED | Install @tanstack/react-query |
| LensAdvisorState interface | ❌ MISSING | Create Zustand store with all fields |

### 3. WIZARD FLOW (STEP BY STEP)

| Step | Spec Component | Current Status | Action Needed |
|------|---------------|----------------|---------------|
| Step 1 | PrescriptionForm | ⚠️ PARTIAL (exists in `/admin/prescriptions`) | Create wizard version |
| Step 2 | FrameEntryForm | ❌ MISSING | Create component |
| Step 3 | QuestionnaireWizard | ⚠️ PARTIAL (exists but not in wizard) | Integrate into wizard |
| Step 4 | LensRecommendations | ⚠️ PARTIAL (exists but not in wizard) | Integrate into wizard |
| Step 5 | OfferCalculatorView | ⚠️ PARTIAL (exists in `/admin/offers/calculator`) | Create wizard version |

### 4. COMPONENTS

| Component | Spec Props | Current Status | Action Needed |
|-----------|-----------|----------------|---------------|
| PrescriptionForm | RxInput | ⚠️ PARTIAL | Create wizard version |
| FrameEntryForm | FrameInput | ❌ MISSING | Create component |
| QuestionnaireWizard | - | ⚠️ PARTIAL | Enhance with subquestion logic |
| LensRecommendationCard | LensRecommendationCardProps | ⚠️ PARTIAL | Match exact props |
| LensComparisonTable | LensComparisonTableProps | ❌ MISSING | Create component |
| PriceMatrixModal | - | ❌ MISSING | Create component |
| OfferConfigPanel | - | ⚠️ PARTIAL | Create wizard version |
| OfferBreakdown | OfferBreakdownProps | ⚠️ PARTIAL | Match exact props |

### 5. ADMIN PAGES

| Page | Spec Features | Current Status | Action Needed |
|------|--------------|----------------|---------------|
| AdminLensListPage | Table with IT Code, Brand Line, Index, OfferPrice | ⚠️ PARTIAL | Enhance products page |
| AdminLensDetailPage | 5 Tabs (General, Specs, Features, Benefits, Answer Boosts) | ❌ MISSING | Create detail page |
| QuestionnaireBuilderPage | Tree view + Question editor | ⚠️ PARTIAL | Add tree view |
| OfferRulesPage | ✅ EXISTS | ✅ Complete | No action |
| CategoryDiscountsPage | ✅ EXISTS | ✅ Complete | No action |
| CouponsPage | ✅ EXISTS | ✅ Complete | No action |

### 6. API ENDPOINTS

| Spec Endpoint | Current Status | Action Needed |
|--------------|----------------|---------------|
| GET /api/products/lenses | ❌ MISSING | Create endpoint |
| GET /api/products/lenses/price-matrix | ❌ MISSING | Create endpoint |
| GET /api/products/lenses/:itCode | ❌ MISSING | Create endpoint |
| GET /api/questionnaire/questions | ⚠️ EXISTS (different path) | Verify/update |
| POST /api/questionnaire/recommend | ⚠️ EXISTS (different path) | Verify/update |
| POST /api/offers/calculate | ✅ EXISTS | ✅ Complete |

---

## ✅ WHAT EXISTS

1. ✅ Admin Panel structure
2. ✅ Offer Engine (backend + admin UI)
3. ✅ Questionnaire flow (public)
4. ✅ Recommendations display
5. ✅ Basic prescription management
6. ✅ Offer calculator (admin)
7. ✅ Authentication system
8. ✅ Database schema

---

## 🎯 IMPLEMENTATION PRIORITY

### Phase 1: Core Wizard Flow (HIGH PRIORITY)
1. Install Zustand + React Query
2. Create `/lens-advisor` route
3. Create Zustand store
4. Create Step 1: PrescriptionForm (wizard version)
5. Create Step 2: FrameEntryForm
6. Integrate Step 3: QuestionnaireWizard
7. Integrate Step 4: LensRecommendations
8. Integrate Step 5: OfferCalculatorView

### Phase 2: Quick Price Flow (MEDIUM PRIORITY)
1. Create `/lens-advisor/quick-price` route
2. Simplified flow (Rx → Frame → Price Matrix → Offer)

### Phase 3: Missing Components (MEDIUM PRIORITY)
1. LensComparisonTable
2. PriceMatrixModal
3. Enhanced OfferBreakdown

### Phase 4: Admin Enhancements (LOW PRIORITY)
1. AdminLensDetailPage with tabs
2. QuestionnaireBuilderPage with tree view
3. Enhanced AdminLensListPage

### Phase 5: API Endpoints (MEDIUM PRIORITY)
1. GET /api/products/lenses
2. GET /api/products/lenses/price-matrix
3. GET /api/products/lenses/:itCode

---

## 📊 COMPLETION STATUS

**Overall Match: ~40%**

- ✅ Routes: 30% (3/10 routes exist)
- ✅ State Management: 0% (Zustand + React Query missing)
- ✅ Wizard Flow: 20% (components exist but not integrated)
- ✅ Components: 40% (some exist, need enhancement)
- ✅ Admin Pages: 60% (most exist, need enhancements)
- ✅ API Endpoints: 50% (core exists, some missing)

---

## 🚀 NEXT STEPS

1. **Install Dependencies:**
   ```bash
   npm install zustand @tanstack/react-query
   ```

2. **Create Wizard Structure:**
   - Create `/app/lens-advisor` directory
   - Create Zustand store
   - Create step components

3. **Implement Missing Components:**
   - FrameEntryForm
   - LensComparisonTable
   - PriceMatrixModal

4. **Enhance Existing:**
   - Integrate questionnaire into wizard
   - Enhance recommendations display
   - Create wizard version of offer calculator

---

*Last Updated: Based on Frontend Specification Document*

