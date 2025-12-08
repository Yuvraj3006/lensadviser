# Additional Requirements Analysis

Based on the Offer Engine implementation and existing codebase analysis, here are the additional requirements needed to fully integrate the Offer Engine with the LensTrack system.

## 🔴 Critical Missing Components

### 1. **Admin UI for Offer Engine Management**

#### 1.1 Offer Rules Management Page
**Location**: `/admin/offers/rules`

**Required Features**:
- ✅ List all offer rules with filters (frameBrand, offerType, isActive)
- ✅ Create new offer rule with form:
  - Basic info (name, code, offerType)
  - Frame conditions (brand, subCategory, MRP range)
  - Lens conditions (brandLines, IT codes)
  - Discount settings (type, value, comboPrice, freeProductId)
  - Second pair settings
  - Priority and dates
- ✅ Edit existing offer rules
- ✅ Delete/deactivate offer rules
- ✅ Preview rule applicability

**API Endpoints**: Already implemented ✅
- `GET /api/admin/offers/rules`
- `POST /api/admin/offers/rules`
- `PUT /api/admin/offers/rules/[id]`
- `DELETE /api/admin/offers/rules/[id]`

#### 1.2 Category Discounts Management Page
**Location**: `/admin/offers/category-discounts`

**Required Features**:
- ✅ List all category discounts
- ✅ Create/edit category discount:
  - Customer category (Student, Doctor, etc.)
  - Brand code (* for all or specific brand)
  - Discount percentage
  - Max discount cap
  - Validity dates
- ✅ Delete/deactivate discounts

**API Endpoints**: Already implemented ✅
- `GET /api/admin/offers/category-discounts`
- `POST /api/admin/offers/category-discounts`

#### 1.3 Coupons Management Page
**Location**: `/admin/offers/coupons`

**Required Features**:
- ✅ List all coupons with status
- ✅ Create/edit coupon:
  - Code, description
  - Discount type (percentage/flat)
  - Discount value and max cap
  - Conditions (min cart value, usage limits)
  - Validity dates
- ✅ View coupon usage statistics
- ✅ Delete/deactivate coupons

**API Endpoints**: Already implemented ✅
- `GET /api/admin/coupons`
- `POST /api/admin/coupons`

### 2. **Product Model Enhancements**

**Current State**: Product model has `sku`, `brand`, `basePrice` but missing:
- ❌ IT Code field (for lens identification)
- ❌ Brand Line field (DIGI360_ADVANCED, etc.)
- ❌ YOPO Eligible flag
- ❌ Frame sub-category field

**Required Changes**:
```prisma
model Product {
  // ... existing fields
  itCode          String?      // IT code for lens products
  brandLine       BrandLine?   // Brand line enum
  yopoEligible    Boolean      @default(false)
  subCategory     String?      // For frames (ESSENTIAL, ADVANCED, etc.)
}
```

**Migration Required**: Add these fields to existing products

### 3. **Integration with Recommendation Engine**

**Current Issue**: `lib/recommendation-engine.ts` still uses old `Offer` model, not new `OfferRule` system.

**Required Changes**:
- ❌ Update `generateRecommendations()` to use new Offer Engine service
- ❌ Convert Product data to `FrameInput` and `LensInput` format
- ❌ Call `offerEngineService.calculateOffers()` instead of old offer logic
- ❌ Update pricing breakdown to use new offer engine result structure

**Files to Update**:
- `lib/recommendation-engine.ts` - Replace old offer logic
- `app/questionnaire/[sessionId]/recommendations/page.tsx` - Update UI to show new offer structure

### 4. **Frontend: Offer Calculation UI for Staff**

#### 4.1 Offer Calculator Page
**Location**: `/admin/offers/calculator` (or modal in recommendations)

**Required Features**:
- ✅ Frame input form:
  - Brand dropdown
  - Sub-category dropdown
  - MRP input
  - Frame type selector
- ✅ Lens input form:
  - IT code input/selector
  - Price input
  - Brand line selector
  - YOPO eligible checkbox
- ✅ Customer category selector
- ✅ Coupon code input
- ✅ Second pair toggle and inputs
- ✅ Real-time offer calculation
- ✅ Detailed price breakdown display
- ✅ Copy/print breakdown

**API Endpoint**: Already implemented ✅
- `POST /api/offers/calculate`

### 5. **Customer Questionnaire Enhancements**

#### 5.1 Customer Category Selection
**Location**: `/questionnaire` (start page)

**Required Features**:
- ✅ Add customer category selection:
  - Student
  - Doctor
  - Teacher
  - Armed Forces
  - Senior Citizen
  - Corporate
  - Regular (default)
- ✅ Store category in session
- ✅ Pass to offer calculation

**Database**: Session model already has customer fields, may need to add `customerCategory` field

#### 5.2 Coupon Code Input
**Location**: `/questionnaire/[sessionId]/recommendations`

**Required Features**:
- ✅ Add coupon code input field
- ✅ Validate coupon on entry
- ✅ Show coupon discount in pricing
- ✅ Update final price in real-time

### 6. **Recommendations Page Updates**

**Current State**: Shows old offer structure

**Required Updates**:
- ❌ Update to display new offer engine results:
  - Show primary offer (YOPO, Combo, Free Lens, etc.)
  - Show category discount if applicable
  - Show coupon discount if applied
  - Show second pair discount if enabled
  - Display detailed price breakdown
- ❌ Add customer category selector
- ❌ Add coupon code input
- ❌ Add second pair toggle
- ❌ Update pricing display to match new structure

**File**: `app/questionnaire/[sessionId]/recommendations/page.tsx`

### 7. **Second Pair Flow**

**Required Features**:
- ✅ UI to enable second pair
- ✅ Input fields for second pair frame MRP and lens price
- ✅ Calculate combined discount
- ✅ Display both pairs with savings
- ✅ Option to add second pair to cart/order

**API Endpoint**: Already implemented ✅ (via `secondPair` object in calculate endpoint)

### 8. **Order/Invoice Integration**

**Current State**: No order/invoice system

**Required**:
- ❌ Create Order model
- ❌ Link offer calculations to orders
- ❌ Store final pricing breakdown in order
- ❌ Generate invoices with offer details
- ❌ Track offer usage for analytics

**Suggested Schema**:
```prisma
model Order {
  id              String   @id @default(auto()) @map("_id") @db.ObjectId
  sessionId       String?  @db.ObjectId
  storeId         String   @db.ObjectId
  userId          String   @db.ObjectId
  customerName    String?
  customerPhone   String?
  customerCategory CustomerCategory?
  
  // Frame + Lens
  frameBrand      String
  frameSubCategory String?
  frameMRP        Float
  lensItCode      String
  lensPrice       Float
  lensBrandLine   String
  
  // Offers
  couponCode      String?
  offerCalculation Json    // Store full calculation result
  
  // Pricing
  baseTotal       Float
  finalPayable    Float
  totalSavings    Float
  
  // Status
  status          OrderStatus
  createdAt       DateTime @default(now())
  
  store Store @relation(...)
  user  User  @relation(...)
  session Session? @relation(...)
}
```

## 🟡 Nice-to-Have Enhancements

### 9. **Offer Analytics Dashboard**

**Features**:
- Most used offers
- Offer effectiveness (conversion rate)
- Revenue impact by offer type
- Category discount usage
- Coupon redemption rates

### 10. **Offer Testing Tool**

**Features**:
- Test offer rules against sample products
- Preview offer waterfall
- Validate rule conditions
- Compare multiple scenarios

### 11. **Bulk Offer Management**

**Features**:
- Import/export offer rules
- Bulk activate/deactivate
- Template-based offer creation
- Seasonal offer presets

### 12. **Offer Notifications**

**Features**:
- Notify staff of new offers
- Alert on expiring offers
- Low usage offer warnings

## 📋 Implementation Priority

### Phase 1: Critical (Must Have)
1. ✅ **Product Model Enhancements** - Add IT code, brand line, YOPO eligible
2. ✅ **Integration with Recommendation Engine** - Use new offer engine
3. ✅ **Admin UI for Offer Rules** - Basic CRUD
4. ✅ **Admin UI for Category Discounts** - Basic CRUD
5. ✅ **Admin UI for Coupons** - Basic CRUD
6. ✅ **Recommendations Page Updates** - Show new offer structure

### Phase 2: Important (Should Have)
7. ✅ **Customer Category Selection** - In questionnaire
8. ✅ **Coupon Code Input** - In recommendations
9. ✅ **Offer Calculator UI** - For staff use
10. ✅ **Second Pair Flow** - Complete UI

### Phase 3: Enhancement (Nice to Have)
11. ✅ **Order/Invoice System** - Link offers to orders
12. ✅ **Offer Analytics** - Dashboard and reports
13. ✅ **Offer Testing Tool** - Preview and validate

## 🔧 Technical Debt Items

1. **TODO in recommendation-engine.ts**:
   ```typescript
   isFirstPurchase: boolean = true // TODO: Check from customer history
   ```
   - Need to check customer purchase history
   - May require Customer model or order history

2. **Database Migration**:
   - Need to migrate existing products to include new fields
   - May need data migration script

3. **Backward Compatibility**:
   - Old `Offer` model still exists
   - Need to decide: deprecate or keep for legacy
   - May need migration path

## 📝 Summary

**Total Missing Components**: 13 major items
- **Critical**: 6 items
- **Important**: 4 items  
- **Enhancement**: 3 items

**Estimated Effort**:
- Phase 1: ~2-3 days
- Phase 2: ~1-2 days
- Phase 3: ~2-3 days

**Current Status**:
- ✅ Backend API: 100% Complete
- ✅ Database Schema: 100% Complete
- ✅ Offer Engine Service: 100% Complete
- ❌ Frontend UI: 0% Complete
- ❌ Integration: 0% Complete

The backend is fully ready. The main gap is frontend UI and integration with existing recommendation flow.

