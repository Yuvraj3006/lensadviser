# LensTrack Codebase Documentation - Part 1: System Overview & Architecture

**Generated from actual codebase analysis - Only documented what exists in code**

---

## 1. Technology Stack

### Frontend
- **Framework**: Next.js 16.0.7 (App Router)
- **React**: 19.2.0
- **State Management**: 
  - Zustand (stores: `lens-advisor-store.ts`, `session-store.ts`)
  - React Query (@tanstack/react-query 5.90.12) for server state
- **Styling**: Tailwind CSS 4
- **UI Components**: Custom components in `/components/ui/`
- **Icons**: Lucide React

### Backend
- **Runtime**: Node.js (Next.js API Routes)
- **Database**: MongoDB (via Prisma ORM 5.22.0)
- **Authentication**: JWT (jsonwebtoken 9.0.3)
- **Password Hashing**: bcrypt 6.0.0
- **Validation**: Zod 4.1.13
- **PDF Generation**: jsPDF (via `lib/pdf-generator.ts`)
- **Barcode**: JsBarcode 3.12.1

### Development Tools
- **TypeScript**: 5.x
- **ESLint**: 9
- **Build Tool**: Next.js Turbopack

---

## 2. Project Structure

```
lenstrack/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Auth routes group
│   │   └── login/
│   ├── admin/                    # Admin panel pages
│   │   ├── benefit-features/
│   │   ├── benefits/
│   │   ├── brands/
│   │   ├── contact-lens-products/
│   │   ├── features/
│   │   ├── lens-brands/
│   │   ├── lens-products/
│   │   ├── lenses/
│   │   ├── offers/
│   │   │   ├── calculator/
│   │   │   ├── category-discounts/
│   │   │   ├── coupons/
│   │   │   └── rules/
│   │   ├── pos/
│   │   ├── prescriptions/
│   │   ├── products/
│   │   ├── questionnaire/
│   │   ├── reports/
│   │   ├── sessions/
│   │   ├── stores/
│   │   ├── tools/
│   │   │   └── power-converter/
│   │   └── users/
│   ├── admin-login/
│   ├── api/                      # API Routes
│   │   ├── admin/                # Admin APIs (authenticated)
│   │   ├── advisor/
│   │   ├── auth/
│   │   ├── benefits/
│   │   ├── contact-lens/
│   │   ├── health/
│   │   ├── offer-engine/
│   │   ├── offers/
│   │   ├── order/
│   │   ├── products/
│   │   ├── public/               # Public APIs (no auth)
│   │   ├── questionnaire/
│   │   └── store/
│   ├── lens-advisor/
│   ├── questionnaire/            # Customer questionnaire flow
│   │   ├── [sessionId]/          # Dynamic session routes
│   │   ├── contact-lens/
│   │   ├── customer-details/
│   │   ├── frame/
│   │   ├── language/
│   │   ├── lens-type/
│   │   ├── mode-selection/
│   │   └── prescription/
│   └── order-success/
├── components/                   # React components
│   ├── data-display/
│   ├── forms/
│   ├── layout/
│   ├── lens-advisor/
│   ├── offer-engine/
│   └── ui/
├── contexts/                     # React contexts
│   └── ToastContext.tsx
├── lib/                          # Utility libraries
│   ├── auth.ts
│   ├── auth-validation.ts
│   ├── barcode-generator.ts
│   ├── constants.ts
│   ├── contact-lens-power-validation.ts
│   ├── errors.ts
│   ├── i18n.ts
│   ├── pdf-generator.ts
│   ├── prisma.ts
│   ├── recommendation-engine.ts
│   ├── translation.service.ts
│   └── validation.ts
├── middleware/                   # Next.js middleware
│   └── auth.middleware.ts
├── prisma/                       # Database schema & migrations
│   └── schema.prisma
├── services/                     # Business logic services
│   ├── benefit-recommendation.service.ts
│   ├── enhanced-recommendation.service.ts
│   ├── index-recommendation.service.ts
│   ├── offer-engine.service.ts
│   ├── recommendation.service.ts
│   └── rx-validation.service.ts
├── stores/                       # Zustand stores
│   ├── lens-advisor-store.ts
│   └── session-store.ts
└── types/                        # TypeScript types
    └── offer-engine.ts
```

---

## 3. Application Architecture

### 3.1 Multi-Tenant Structure
- **Organization** → **Store** → **User** hierarchy
- All data is scoped by `organizationId`
- Stores belong to organizations
- Users belong to organizations (optionally to stores)

### 3.2 User Roles (from schema)
```typescript
enum UserRole {
  SUPER_ADMIN      // Full system access
  ADMIN            // Organization admin
  STORE_MANAGER    // Store-level management
  SALES_EXECUTIVE  // Store staff
}
```

### 3.3 Main Application Flows

#### A. Customer Questionnaire Flow (Public)
1. Store Verification (`/questionnaire`)
2. Language Selection (`/questionnaire/language`)
3. Mode Selection (`/questionnaire/mode-selection`)
4. Lens Type Selection (`/questionnaire/lens-type`)
5. Category-specific flows:
   - **EYEGLASSES/SUNGLASSES**: Frame → Prescription → Questionnaire → Recommendations
   - **CONTACT_LENSES**: Power Input Method → Power Entry → Product Search → Add-ons → Checkout
   - **ONLY_LENS**: Prescription → Questionnaire → Recommendations
6. Recommendations (`/questionnaire/[sessionId]/recommendations`)
7. Checkout (`/questionnaire/[sessionId]/checkout/[productId]`)
8. Order Success (`/questionnaire/[sessionId]/order-success/[orderId]`)

#### B. Admin Panel Flow (Authenticated)
1. Login (`/admin-login` or `/(auth)/login`)
2. Dashboard (`/admin`)
3. CRUD operations for:
   - Stores, Users, Brands, Products
   - Lens Products, Contact Lens Products
   - Questions, Benefits, Features
   - Offer Rules, Category Discounts, Coupons
   - Orders, Sessions, Reports

#### C. POS Flow (Store Staff)
- Order management
- Session viewing
- Reports

---

## 4. Core Business Concepts

### 4.1 Product Categories
```typescript
// From codebase
type ProductCategory = 
  | 'EYEGLASSES'      // Frame + Lens
  | 'SUNGLASSES'      // Power Sunglasses (Frame + Tinted Lens)
  | 'ONLY_LENS'       // Lens only (no frame)
  | 'CONTACT_LENSES'  // Contact lenses
  | 'ACCESSORIES'     // Accessories
```

### 4.2 Sales Modes
```typescript
// From session-store.ts
type SalesMode = 
  | 'SELF_SERVICE'     // Customer-led
  | 'STAFF_ASSISTED'   // Staff-led (requires staff selection)
```

### 4.3 Order Types
```typescript
// From schema.prisma
enum OrderType {
  EYEGLASSES        // Frame + Lens
  LENS_ONLY         // Lens only
  POWER_SUNGLASS    // Power Sunglasses
  CONTACT_LENS_ONLY // Contact lenses only
}
```

### 4.4 Vision Types
```typescript
// From schema.prisma
enum VisionType {
  SINGLE_VISION
  PROGRESSIVE
  BIFOCAL
  ANTI_FATIGUE
  MYOPIA_CONTROL
}
```

### 4.5 Lens Index
```typescript
// From schema.prisma
enum LensIndex {
  INDEX_156  // 1.56 (thickest)
  INDEX_160  // 1.60
  INDEX_167  // 1.67
  INDEX_174  // 1.74 (thinnest)
}
```

### 4.6 Tint Options
```typescript
// From schema.prisma
enum TintOption {
  CLEAR
  TINT
  PHOTOCHROMIC
  TRANSITION
}
```

---

## 5. Key Business Rules (From Codebase)

### 5.1 Frame & Sunglass Handling
- **FRAME and SUNGLASS are NOT SKU products** (from code comments)
- Frames are **manual-entry only** during sale
- Only Contact Lenses & Accessories have SKUs
- For EYEGLASSES/SUNGLASSES flows, system recommends **LENS products only**

### 5.2 Staff Selection Rules
- **SELF_SERVICE mode**: Staff selection is optional
- **STAFF_ASSISTED mode**: Staff selection is **mandatory** (validated in `/api/order/create`)

### 5.3 Lens Index Rules (from `index-recommendation.service.ts`)
- **Rimless frames**: Must use INDEX_160 or higher (INDEX_156 is invalid)
- **Power-based escalation**:
  - < 4D: INDEX_156
  - 4-5.99D: INDEX_160
  - 6-8D: INDEX_167
  - > 8D: INDEX_174

### 5.4 Contact Lens Power Validation
- Power ranges validated against `ContactLensProduct` schema:
  - `sphMin/sphMax`, `cylMin/cylMax`, `axisSteps`, `addMin/addMax`
- Spectacle power can be converted to CL power (vertex distance compensation)

### 5.5 Offer Engine Waterfall (from `offer-engine.service.ts`)
1. **Primary Offers** (mutually exclusive):
   - COMBO_PRICE (highest priority)
   - YOPO (You Pay One)
   - FREE_LENS
   - PERCENT_OFF
   - FLAT_OFF
2. **Secondary Offers**:
   - Second Pair Discount
   - Category Discount (by customer category)
   - Coupon Discount
3. **Upsell Suggestions** (if enabled)

---

## 6. Data Flow Overview

### 6.1 Customer Questionnaire Flow
```
1. Store Verification
   ↓
2. Session Creation (POST /api/public/questionnaire/sessions)
   ↓
3. Category Selection
   ↓
4. Frame Entry (if EYEGLASSES/SUNGLASSES)
   ↓
5. Prescription Entry (if applicable)
   ↓
6. Questionnaire Answers (POST /api/public/questionnaire/sessions/[id]/answer)
   ↓
7. Recommendations (GET /api/public/questionnaire/sessions/[id]/recommendations)
   ↓
8. Product Selection
   ↓
9. Offer Calculation (via offer-engine.service.ts)
   ↓
10. Checkout (POST /api/order/create)
   ↓
11. Order Created
```

### 6.2 Recommendation Engine Flow
```
1. Session Answers → Benefit Scores (via AnswerBenefit mappings)
   ↓
2. Product Fetching (LensProduct for EYEGLASSES/SUNGLASSES, ContactLensProduct for CL)
   ↓
3. Benefit Matching (ProductBenefit scores)
   ↓
4. Index Recommendation (IndexRecommendationService)
   ↓
5. Scoring & Ranking
   ↓
6. Store Price Override (StoreProduct)
   ↓
7. Offer Calculation (OfferEngineService)
   ↓
8. Return Recommendations with Match %, Pricing, Offers
```

### 6.3 Offer Calculation Flow
```
1. Base Total = Frame MRP + Lens Price
   ↓
2. Find Applicable Primary Rule (COMBO > YOPO > FREE_LENS > PERCENT > FLAT)
   ↓
3. Apply Primary Rule (locks further evaluation if COMBO/YOPO)
   ↓
4. Apply Second Pair Discount (if applicable)
   ↓
5. Apply Category Discount (by customer category)
   ↓
6. Apply Coupon Discount (if provided)
   ↓
7. Calculate Upsell Suggestions (if enabled)
   ↓
8. Return Final Price Breakdown
```

---

## 7. Authentication & Authorization

### 7.1 Public APIs
- `/api/public/*` - No authentication required
- Store verification via store code

### 7.2 Admin APIs
- `/api/admin/*` - Requires JWT authentication
- Role-based authorization via `authorize()` middleware
- Token stored in HTTP-only cookie or Authorization header

### 7.3 Auth Flow
```
1. POST /api/auth/login
   ↓
2. Validate credentials (bcrypt password check)
   ↓
3. Generate JWT token (includes userId, role, organizationId, storeId)
   ↓
4. Return token (stored in cookie or localStorage)
   ↓
5. Subsequent requests include token in Authorization header
   ↓
6. Middleware validates token and extracts user info
```

---

## 8. State Management

### 8.1 Zustand Stores

#### `session-store.ts`
- `storeId`, `storeCode`, `storeName`
- `salesMode` (SELF_SERVICE | STAFF_ASSISTED)
- `language` (en | hi | hinglish)
- `selectedStaffId`, `assistedByName`

#### `lens-advisor-store.ts`
- `rx` (prescription data)
- `frame` (frame data)
- `answers` (questionnaire answers)
- `recommendations`
- `customerCategory`

### 8.2 React Query
- Server state caching
- Automatic refetching
- Optimistic updates

### 8.3 LocalStorage
- `lenstrack_store_code` - Store code persistence
- `lenstrack_language` - Language preference
- `lenstrack_prescription` - Prescription data
- `lenstrack_cl_power_method` - CL power input method
- `lenstrack_cl_final_power` - CL power data

---

## 9. Internationalization

### 9.1 Supported Languages
- **English (en)**: Default
- **Hindi (hi)**: Full translation
- **Hinglish (hinglish)**: Romanized Hindi

### 9.2 Translation Service
- **File**: `lib/translation.service.ts`
- **Method**: Rule-based translation (not API-based)
- **Auto-translation**: Available in admin panel for Questions & Answers
- **Customer-facing**: Language-aware display via `getText()` helper

### 9.3 Translation Flow
```
1. Admin enters English text
   ↓
2. Clicks "Auto-Translate" button
   ↓
3. POST /api/admin/translate
   ↓
4. translateToHindi() / translateToHinglish()
   ↓
5. Returns translated text
   ↓
6. Admin saves (auto-populated in backend if missing)
```

---

## 10. Key Services

### 10.1 Recommendation Engine (`lib/recommendation-engine.ts`)
- **Purpose**: Generate product recommendations based on questionnaire answers
- **Input**: Session ID
- **Output**: Ranked product recommendations with match scores
- **Logic**: Benefit-based scoring via AnswerBenefit → ProductBenefit mappings

### 10.2 Offer Engine (`services/offer-engine.service.ts`)
- **Purpose**: Calculate final pricing with all offers applied
- **Input**: Frame data, Lens data, Organization ID, Mode, Customer Category
- **Output**: Price breakdown with all discounts and offers
- **Logic**: Waterfall priority system (COMBO > YOPO > FREE_LENS > PERCENT > FLAT)

### 10.3 Index Recommendation Service (`services/index-recommendation.service.ts`)
- **Purpose**: Recommend lens index based on prescription and frame type
- **Input**: Prescription (SPH, CYL, ADD), Frame type
- **Output**: Recommended index with validation messages
- **Logic**: Power-based escalation + frame type rules (rimless = INDEX_160+)

### 10.4 RX Validation Service (`services/rx-validation.service.ts`)
- **Purpose**: Validate prescription values
- **Validations**:
  - SPH: -20 to +20
  - CYL: -6 to 0 (negative only)
  - ADD: 0 to 4
  - AXIS: 0-180 (required if CYL present)

### 10.5 Contact Lens Power Validation (`lib/contact-lens-power-validation.ts`)
- **Purpose**: Validate CL power against product power ranges
- **Validations**: SPH, CYL, AXIS, ADD ranges per product
- **Conversion**: Spectacle to CL power (vertex distance compensation)

### 10.6 Translation Service (`lib/translation.service.ts`)
- **Purpose**: Auto-translate English to Hindi/Hinglish
- **Method**: Rule-based word/phrase mapping
- **Usage**: Admin panel auto-translation feature

---

## 11. Database Models (High-Level)

### Core Models
- **Organization**: Multi-tenant root
- **Store**: Physical store locations
- **User**: System users (role-based)
- **Session**: Customer questionnaire sessions
- **Order**: Sales orders

### Product Models
- **LensProduct**: Lens SKUs (itCode, brandLine, visionType, lensIndex, tintOption)
- **ContactLensProduct**: Contact lens SKUs (skuCode, brand, modality, lensType, power ranges)
- **RetailProduct**: Frames, Sunglasses, Accessories (manual entry, no SKU for frames)
- **ProductBrand**: Frame/sunglass brands
- **LensBrand**: Lens brands

### Recommendation Models
- **Question**: Questionnaire questions (multi-language)
- **AnswerOption**: Question answer options (with sub-question support)
- **AnswerBenefit**: Maps answers to benefits with points
- **BenefitFeature**: Unified master for Benefits (B01-B12) and Features (F01-F11)
- **ProductBenefit**: Maps products to benefits with scores (0-3)
- **ProductFeature**: Maps products to features

### Offer Models
- **OfferRule**: Primary offer rules (COMBO, YOPO, FREE_LENS, etc.)
- **CategoryDiscount**: Customer category discounts
- **Coupon**: Coupon codes
- **StoreOfferMap**: Store-specific offer activation

### Other Models
- **Prescription**: Customer prescriptions (schema incomplete in codebase)
- **SessionAnswer**: Customer questionnaire answers
- **SessionRecommendation**: Generated recommendations per session
- **StoreProduct**: Store-specific pricing and stock
- **TintColor**: Tint color master
- **MirrorCoating**: Mirror coating master

---

## 12. API Endpoint Categories

### Public APIs (`/api/public/*`)
- Store verification
- Session creation
- Questionnaire answers
- Recommendations
- Product eligibility
- Frame brands, Tint colors, Mirror coatings

### Admin APIs (`/api/admin/*`)
- CRUD for all master data
- Question/Answer management
- Benefit/Feature management
- Offer rule management
- Order management
- Reports
- Translation

### Order APIs (`/api/order/*`)
- Order creation
- Order confirmation

### Offer Engine APIs (`/api/offer-engine/*`, `/api/offers/*`)
- Offer calculation

### Contact Lens APIs (`/api/contact-lens/*`)
- Power conversion (spectacle → CL)
- Product search with power validation

---

## 13. Key Files Reference

### Frontend Entry Points
- `/app/page.tsx` - Landing page
- `/app/questionnaire/page.tsx` - Store verification & session start
- `/app/admin/page.tsx` - Admin dashboard
- `/app/(auth)/login/page.tsx` - Admin login

### Core Business Logic
- `/lib/recommendation-engine.ts` - Recommendation generation
- `/services/offer-engine.service.ts` - Offer calculation
- `/services/index-recommendation.service.ts` - Index recommendation
- `/services/rx-validation.service.ts` - Prescription validation

### API Entry Points
- `/app/api/public/questionnaire/sessions/route.ts` - Session creation
- `/app/api/public/questionnaire/sessions/[id]/recommendations/route.ts` - Get recommendations
- `/app/api/order/create/route.ts` - Order creation
- `/app/api/offer-engine/calculate/route.ts` - Offer calculation

### Database
- `/prisma/schema.prisma` - Complete database schema

---

**End of Part 1: System Overview & Architecture**

**Next**: Part 2 will cover Frontend Implementation in detail.
