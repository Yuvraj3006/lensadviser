# LensTrack Codebase Documentation - Part 2: Frontend Implementation

**Generated from actual codebase analysis - Only documented what exists in code**

---

## 1. Frontend Architecture

### 1.1 Framework & Routing
- **Framework**: Next.js 16.0.7 (App Router)
- **Routing**: File-based routing in `/app` directory
- **Client Components**: All pages use `'use client'` directive
- **Server Components**: None (all pages are client-side)

### 1.2 State Management

#### Zustand Stores

**`stores/session-store.ts`**
```typescript
interface SessionState {
  language: 'en' | 'hi' | 'hinglish' | null;
  storeId: string | null;
  storeCode: string | null;
  storeName: string | null;
  salesMode: 'SELF_SERVICE' | 'STAFF_ASSISTED' | null;
  staffId: string | null;
  staffList: Staff[];
}
```
- **Persistence**: Uses `persist` middleware (localStorage)
- **Purpose**: Global session state (store, language, sales mode, staff)

**`stores/lens-advisor-store.ts`**
```typescript
interface LensAdvisorState {
  currentStep: 1 | 2 | 3 | 4 | 5 | 6;
  rx: RxInput;
  frame: FrameInput | null;
  answers: AnswerSelection[];
  recommendations: any[];
  selectedLens: SelectedLens | null;
  offerResult: OfferCalculationResult | null;
  customerCategory?: string | null;
  couponCode?: string | null;
}
```
- **Persistence**: In-memory only (not persisted)
- **Purpose**: Lens advisor wizard state

#### LocalStorage Keys
- `lenstrack_store_code` - Store code
- `lenstrack_language` - Language preference
- `lenstrack_prescription` - Prescription data
- `lenstrack_frame` - Frame data
- `lenstrack_customer_details` - Customer name/phone
- `lenstrack_lens_type` / `lenstrack_category` - Selected category
- `lenstrack_cl_power_method` - CL power input method (SPECTACLE | CONTACT_LENS)
- `lenstrack_cl_final_power` - Final CL power data
- `lenstrack_session_{sessionId}_only_lens` - Flag for "Only Lens" flow

#### React Query
- Used for server state caching
- Automatic refetching on window focus
- Optimistic updates for mutations

---

## 2. Customer Questionnaire Flow (Public)

### 2.1 Flow Overview

```
/questionnaire (Store Verification)
  ↓
/questionnaire/language (Language Selection)
  ↓
/questionnaire/mode-selection (Sales Mode)
  ↓
/questionnaire/lens-type (Category Selection)
  ↓
[Category-specific flows]
  ↓
/questionnaire/[sessionId] (Questionnaire)
  ↓
/questionnaire/[sessionId]/recommendations (Product Recommendations)
  ↓
/questionnaire/[sessionId]/checkout/[productId] (Checkout)
  ↓
/questionnaire/[sessionId]/order-success/[orderId] (Order Success)
```

### 2.2 Page-by-Page Implementation

#### **Page 1: Store Verification** (`/app/questionnaire/page.tsx`)

**Purpose**: Verify store code and initialize session

**Features**:
- Store code input field
- Secret key bypass: `?key=LENSTRACK2025` (development only)
- Store verification via `POST /api/public/verify-store`
- Auto-redirect if store code already saved
- Stores store info in `session-store` and localStorage

**State Management**:
- Uses `useSessionStore` for store info
- Saves to localStorage: `lenstrack_store_code`

**Navigation**:
- On success → `/questionnaire/language`

**Code Flow**:
```typescript
1. Check URL param for secret key
2. If secret key matches → Auto-verify with mock store
3. Else check localStorage for saved store code
4. If saved → Verify via API
5. On verification success → Save to store & localStorage → Navigate to language
```

---

#### **Page 2: Language Selection** (`/app/questionnaire/language/page.tsx`)

**Purpose**: Select language (EN, HI, Hinglish)

**Features**:
- Three language options with flags/icons
- Saves to `session-store` and localStorage
- Language persists across session

**State Management**:
- `useSessionStore.setLanguage()`
- localStorage: `lenstrack_language`

**Navigation**:
- On selection → `/questionnaire/mode-selection`

---

#### **Page 3: Mode Selection** (`/app/questionnaire/mode-selection/page.tsx`)

**Purpose**: Select sales mode (SELF_SERVICE or STAFF_ASSISTED)

**Features**:
- Two mode cards with descriptions
- Saves to `session-store`
- Mode affects staff selection requirement later

**State Management**:
- `useSessionStore.setSalesMode()`

**Navigation**:
- On selection → `/questionnaire/lens-type`

---

#### **Page 4: Lens Type Selection** (`/app/questionnaire/lens-type/page.tsx`)

**Purpose**: Select product category

**Categories**:
- **EYEGLASSES**: Frame + Lens
- **ONLY_LENS**: Lens only (no frame)
- **SUNGLASSES**: Power Sunglasses
- **CONTACT_LENSES**: Contact lenses
- **ACCESSORIES**: Accessories

**Features**:
- Category cards with icons
- Saves to localStorage: `lenstrack_lens_type` and `lenstrack_category`

**Navigation** (Category-specific):
- **EYEGLASSES/SUNGLASSES** → `/questionnaire/frame`
- **ONLY_LENS** → `/questionnaire/prescription` (skips frame)
- **CONTACT_LENSES** → `/questionnaire/contact-lens/power-input-method`
- **ACCESSORIES** → (Not implemented in codebase)

---

#### **Page 5A: Frame Entry** (`/app/questionnaire/frame/page.tsx`)

**Purpose**: Enter frame details (for EYEGLASSES/SUNGLASSES)

**Features**:
- Frame brand selection (from `/api/public/frame-brands`)
- Frame sub-brand selection
- Frame type selection (FULL_RIM, HALF_RIM, RIMLESS)
- Frame MRP input
- Uses `FrameEntryForm` component
- **Skip logic**: If `ONLY_LENS` → Auto-skip to prescription

**Validation**:
- Brand required
- MRP must be > 0
- Frame type required

**State Management**:
- `useLensAdvisorStore.setFrame()`
- localStorage: `lenstrack_frame`

**Navigation**:
- On submit → `/questionnaire/prescription`
- If ONLY_LENS → Auto-create session → `/questionnaire/[sessionId]`

**Code Flow**:
```typescript
1. Load saved frame from localStorage
2. If ONLY_LENS → Auto-skip (create session without frame)
3. User enters frame details
4. Validate required fields
5. Save to store & localStorage
6. Create session via POST /api/public/questionnaire/sessions
7. Navigate to prescription or questionnaire
```

---

#### **Page 5B: Prescription Entry** (`/app/questionnaire/prescription/page.tsx`)

**Purpose**: Enter prescription power

**Features**:
- Uses `PrescriptionForm` component
- OD (Right Eye) and OS (Left Eye) inputs
- Fields: SPH, CYL, AXIS, ADD
- Real-time validation (SPH: -20 to +20, CYL: -6 to 0, AXIS: 0-180)
- Language-aware display (uses `getText()` helper)
- Skip option available

**Validation** (from `PrescriptionForm`):
- SPH: -20 to +20
- CYL: Must be negative or zero
- AXIS: 0-180 (required if CYL present)
- ADD: 0-4

**State Management**:
- `useLensAdvisorStore.setRx()`
- localStorage: `lenstrack_prescription`

**Navigation**:
- On next → `/questionnaire/frame` (if frame not entered) OR `/questionnaire/[sessionId]` (if frame entered)
- On skip → `/questionnaire/frame` (if frame not entered) OR `/questionnaire/[sessionId]` (if frame entered)

---

#### **Page 5C: Contact Lens Power Input Method** (`/app/questionnaire/contact-lens/power-input-method/page.tsx`)

**Purpose**: Choose power input method for contact lenses

**Options**:
- **SPECTACLE**: Enter spectacle power (will convert to CL power)
- **CONTACT_LENS**: Enter CL power directly

**Features**:
- Two option cards
- Saves method to localStorage: `lenstrack_cl_power_method`

**Navigation**:
- SPECTACLE → `/questionnaire/contact-lens/spectacle-power`
- CONTACT_LENS → `/questionnaire/contact-lens/cl-power`

---

#### **Page 5D: Spectacle Power Entry** (`/app/questionnaire/contact-lens/spectacle-power/page.tsx`)

**Purpose**: Enter spectacle power for CL conversion

**Features**:
- OD and OS power inputs (SPH, CYL, AXIS, ADD)
- Real-time validation
- Conversion button triggers `POST /api/contact-lens/convert-power`
- Displays converted CL power
- Shows conversion details (vertex conversion applied, ADD mapping)

**Validation**:
- SPH: -20 to +20
- CYL: -6 to 0
- AXIS: 0-180 (required if CYL present)
- ADD: 0-4

**State Management**:
- localStorage: `lenstrack_cl_final_power` (stores converted power)

**Navigation**:
- On confirm → `/questionnaire/contact-lens` (product selection)

**Code Flow**:
```typescript
1. User enters spectacle power
2. Click "Convert to Contact Lens Power"
3. POST /api/contact-lens/convert-power
4. Backend converts using vertex distance formula
5. Display converted power
6. Save to localStorage
7. Navigate to product selection
```

---

#### **Page 5E: Contact Lens Power Entry** (`/app/questionnaire/contact-lens/cl-power/page.tsx`)

**Purpose**: Enter CL power directly

**Features**:
- OD and OS power inputs
- Real-time validation
- No conversion needed

**Validation**: Same as spectacle power

**State Management**:
- localStorage: `lenstrack_cl_final_power`

**Navigation**:
- On confirm → `/questionnaire/contact-lens` (product selection)

---

#### **Page 5F: Contact Lens Product Selection** (`/app/questionnaire/contact-lens/page.tsx`)

**Purpose**: Select contact lens product

**Features**:
- Product search via `POST /api/contact-lens/search` (with power validation)
- Brand filter dropdown
- Product cards with:
  - Brand, Line, Modality, Lens Type
  - Pack Size, MRP, Offer Price
  - Availability status
  - Color options (if color lens)
- Power range validation (shows error if power not available)
- Quantity selector
- Pack type selector (DAILY, MONTHLY, YEARLY)
- Color selector (for color lenses)

**State Management**:
- Products fetched from API
- Selected product stored in component state

**Navigation**:
- On select → `/questionnaire/[sessionId]/contact-lens-addons`

**Code Flow**:
```typescript
1. Load power from localStorage
2. POST /api/contact-lens/search with power data
3. Backend validates power against product ranges
4. Display eligible products
5. Show error if no products available
6. User selects product, pack, quantity, color
7. Save selection
8. Navigate to add-ons
```

---

#### **Page 6: Questionnaire** (`/app/questionnaire/[sessionId]/page.tsx`)

**Purpose**: Answer questionnaire questions

**Features**:
- Dynamic question loading from session
- Language-aware display (`getText()` helper)
- Progress bar
- Single or multiple selection support
- Sub-question support (via `triggersSubQuestion` + `subQuestionId`)
- Previous/Next navigation
- Answer submission via `POST /api/public/questionnaire/sessions/[id]/answer`

**Question Interface**:
```typescript
interface Question {
  id: string;
  key: string;
  textEn: string;
  textHi?: string;
  textHiEn?: string;
  isRequired: boolean;
  allowMultiple: boolean;
  options: {
    id: string;
    key: string;
    textEn: string;
    textHi?: string;
    textHiEn?: string;
    icon?: string;
    triggersSubQuestion?: boolean;
    subQuestionId?: string;
  }[];
}
```

**Sub-Question Logic**:
- If option has `triggersSubQuestion: true` and `subQuestionId`
- Sub-question is injected after current question
- Sub-question is shown only if parent option is selected

**State Management**:
- Answers stored in component state
- Submitted to backend on "Next"

**Navigation**:
- On last question → `/questionnaire/[sessionId]/recommendations`
- On previous → Go back one question

**Code Flow**:
```typescript
1. Fetch session and questions via GET /api/public/questionnaire/sessions/[id]
2. Display current question with language-aware text
3. User selects answer(s)
4. If option triggers sub-question → Inject sub-question
5. On "Next" → POST /api/public/questionnaire/sessions/[id]/answer
6. Backend saves answer and checks if questionnaire complete
7. If complete → Navigate to recommendations
8. Else → Move to next question
```

---

#### **Page 7: Recommendations** (`/app/questionnaire/[sessionId]/recommendations/page.tsx`)

**Purpose**: Display product recommendations

**Features**:
- Fetches recommendations via `GET /api/public/questionnaire/sessions/[id]/recommendations`
- Displays top 3 recommendations prominently
- "View All Lenses" modal with:
  - All eligible lenses
  - Match percentage
  - Thickness difference (index comparison)
  - Validation messages (invalid index, warnings)
  - Sorting filters:
    - Best Match First
    - Price: Low to High
    - Price: High to Low
    - Thinnest First (Index)
  - Count: "Showing X of Y eligible lenses"
- Product cards show:
  - Match percentage badge
  - Product name, brand, IT code
  - Lens index with comparison
  - Index recommendation badge (if matches recommended index)
  - Thickness warning (if thicker than recommended)
  - Invalid badge (if violates rules, e.g., INDEX_156 for rimless)
  - Pricing breakdown
  - Features list
  - "Select" button (disabled if invalid)

**Recommendation Interface**:
```typescript
interface Recommendation {
  id: string;
  name: string;
  sku: string;
  matchPercent?: number;
  lensIndex?: string;
  indexRecommendation?: {
    recommendedIndex: string;
    indexDelta: number;
    validationMessage?: string | null;
    isInvalid?: boolean;
    isWarning?: boolean;
  };
  thicknessWarning?: boolean;
  indexInvalid?: boolean;
  pricing: PricingBreakdown;
  offers: Offer[];
  // ... other fields
}
```

**Index Validation Display**:
- **Red Error**: Invalid index (e.g., INDEX_156 for rimless) - "Select" disabled
- **Yellow Warning**: Thicker than recommended - shows warning message
- **Blue Info**: Thinner than recommended (premium upsell) - shows info message
- **Green Badge**: Matches recommended index

**State Management**:
- Recommendations fetched from API
- Selected product stored in component state

**Navigation**:
- On product select → `/questionnaire/[sessionId]/checkout/[productId]`
- For Power Sunglasses → `/questionnaire/[sessionId]/tint-color-selection` first

**Code Flow**:
```typescript
1. GET /api/public/questionnaire/sessions/[id]/recommendations
2. Backend generates recommendations (if not cached)
3. Display recommendations with match %, index info, pricing
4. User clicks "View All" → Open modal with all products
5. User selects product
6. If Power Sunglasses → Navigate to tint selection
7. Else → Navigate to checkout
```

---

#### **Page 8A: Tint Color Selection** (`/app/questionnaire/[sessionId]/tint-color-selection/page.tsx`)

**Purpose**: Select tint color for Power Sunglasses

**Features**:
- Fetches tint colors via `GET /api/public/tint-colors`
- Color grid with images
- Color code display
- Mirror coating selection (optional)
- Price addition for selected options
- Shows base price + add-ons

**State Management**:
- Selected tint and mirror coating in component state

**Navigation**:
- On next → `/questionnaire/[sessionId]/checkout/[productId]`

---

#### **Page 8B: Contact Lens Add-ons** (`/app/questionnaire/[sessionId]/contact-lens-addons/page.tsx`)

**Purpose**: Select add-ons for contact lenses

**Features**:
- Fetches add-ons (solution, case, etc.)
- Category inference (DAILY, MONTHLY, YEARLY)
- Add-on selection with quantity
- Fallback to hardcoded add-ons if API fails

**State Management**:
- Selected add-ons in component state

**Navigation**:
- On next → `/questionnaire/[sessionId]/contact-lens-checkout`

---

#### **Page 9A: Checkout (Eyeglasses/Lens Only)** (`/app/questionnaire/[sessionId]/checkout/[productId]/page.tsx`)

**Purpose**: Final checkout and order creation

**Features**:
- Customer details form (name, phone)
- Staff selection (if STAFF_ASSISTED mode):
  - Fetches staff list via `GET /api/store/[id]/staff`
  - Dropdown or manual name entry
  - **Validation**: Mandatory for STAFF_ASSISTED mode
- Order summary:
  - Frame details (if applicable)
  - Lens details
  - Pricing breakdown
  - Applied offers
- Offer recalculation via `POST /api/public/questionnaire/sessions/[id]/recalculate-offers`
- Order creation via `POST /api/order/create`

**Staff Selection Logic**:
- **SELF_SERVICE**: Optional (can leave empty)
- **STAFF_ASSISTED**: **Mandatory** (validated on frontend and backend)
- Can select from dropdown OR enter name manually

**State Management**:
- Customer details from localStorage
- Staff list fetched from API
- Offer result from API

**Navigation**:
- On order success → `/questionnaire/[sessionId]/order-success/[orderId]`

**Code Flow**:
```typescript
1. Load checkout data (product, frame, offers)
2. Fetch staff list (if STAFF_ASSISTED mode)
3. Load customer details from localStorage
4. User fills form
5. Validate staff selection (if STAFF_ASSISTED)
6. Recalculate offers
7. POST /api/order/create with:
   - storeId, salesMode
   - assistedByStaffId (if selected)
   - assistedByName (if manual entry)
   - customerName, customerPhone
   - frameData, lensData, offerData
   - finalPrice
8. On success → Navigate to order success
```

---

#### **Page 9B: Contact Lens Checkout** (`/app/questionnaire/[sessionId]/contact-lens-checkout/page.tsx`)

**Purpose**: Checkout for contact lenses

**Features**:
- Similar to regular checkout
- Contact lens product details
- Add-ons summary
- Staff selection (same logic as regular checkout)
- Order creation with `orderType: 'CONTACT_LENS_ONLY'`

**Navigation**:
- On order success → `/questionnaire/[sessionId]/order-success/[orderId]`

---

#### **Page 10: Order Success** (`/app/questionnaire/[sessionId]/order-success/[orderId]/page.tsx`)

**Purpose**: Display order confirmation

**Features**:
- Order details display
- Order ID (barcode)
- Download PDF option (via `/api/admin/orders/[id]/pdf`)
- Print option
- Continue shopping button

**State Management**:
- Order data fetched from API

---

## 3. Admin Panel Pages

### 3.1 Admin Layout (`/app/admin/layout.tsx`)

**Features**:
- Sidebar navigation
- Role-based menu items
- User info display
- Logout functionality

**Navigation Items** (from `components/layout/Sidebar.tsx`):
- Dashboard (`/admin`)
- Stores (SUPER_ADMIN, ADMIN)
- Users (SUPER_ADMIN, ADMIN, STORE_MANAGER)
- Brands & Sub-Brands (SUPER_ADMIN, ADMIN)
- Retail Products (SUPER_ADMIN, ADMIN)
- Lens Brands (SUPER_ADMIN, ADMIN)
- Lens Products (SUPER_ADMIN, ADMIN)
- Contact Lens Products (SUPER_ADMIN, ADMIN)
- Questionnaire Builder (SUPER_ADMIN, ADMIN)
- Features (SUPER_ADMIN, ADMIN)
- Benefits (SUPER_ADMIN, ADMIN)
- Benefit Features (SUPER_ADMIN, ADMIN) - Unified master
- Offer Rules (SUPER_ADMIN, ADMIN)
- Category Discounts (SUPER_ADMIN, ADMIN)
- Coupons (SUPER_ADMIN, ADMIN)
- Offer Calculator (SUPER_ADMIN, ADMIN)
- Orders (POS) (All roles)
- Prescriptions (SUPER_ADMIN, ADMIN)
- Sessions (SUPER_ADMIN, ADMIN)
- Reports (SUPER_ADMIN, ADMIN)
- Tools → Power Converter (SUPER_ADMIN, ADMIN)

---

### 3.2 Key Admin Pages

#### **Questionnaire Builder** (`/app/admin/questionnaire/page.tsx`)

**Purpose**: Create and manage questions

**Features**:
- Question tree view (with sub-questions)
- Create/Edit/Delete questions
- Answer options management
- Benefit mapping (AnswerOption → Benefit → Points)
- Sub-question linking (via `triggersSubQuestion` + `subQuestionId`)
- Auto-translation buttons (EN → HI, Hinglish)
- Category filtering
- Display order management

**Question Form** (`components/forms/QuestionForm.tsx`):
- Multi-language fields (textEn, textHi, textHiEn)
- Question type selection
- Required/Multiple selection toggles
- Answer options with:
  - Key, text (multi-language)
  - Icon
  - Benefit mapping (points per benefit)
  - Sub-question linking
- Auto-translate functionality

**API Integration**:
- `GET /api/admin/questions` - List questions
- `POST /api/admin/questions` - Create question
- `PUT /api/admin/questions/[id]` - Update question
- `DELETE /api/admin/questions/[id]` - Delete question
- `POST /api/admin/translate` - Auto-translate

---

#### **Benefit Features Master** (`/app/admin/benefit-features/page.tsx`)

**Purpose**: Unified master for Benefits and Features

**Features**:
- Single table for both Benefits (B01-B12) and Features (F01-F11)
- Type filter (BENEFIT | FEATURE)
- CRUD operations
- Code uniqueness per organization
- Category field (for Features)

**API Integration**:
- `GET /api/admin/benefit-features` - List all
- `POST /api/admin/benefit-features` - Create
- `PUT /api/admin/benefit-features/[id]` - Update
- `DELETE /api/admin/benefit-features/[id]` - Delete

---

#### **Offer Rules** (`/app/admin/offers/rules/page.tsx`)

**Purpose**: Manage offer rules

**Features**:
- Create/Edit/Delete offer rules
- Offer types: YOPO, COMBO_PRICE, FREE_LENS, PERCENT_OFF, FLAT_OFF, BOG50, CATEGORY_DISCOUNT, BONUS_FREE_PRODUCT
- Frame brand/sub-category filters
- Lens brand line filters
- MRP range filters
- Priority setting
- Config fields (comboPrice, freeUnderYOPO, bonusFreeAllowed, etc.)
- Store activation management

**Offer Rule Interface**:
```typescript
interface OfferRule {
  id: string;
  name: string;
  code: string;
  offerType: OfferRuleType;
  frameBrand?: string | null;
  frameSubCategory?: string | null;
  minFrameMRP?: number | null;
  maxFrameMRP?: number | null;
  lensBrandLines: string[];
  lensItCodes: string[];
  discountType: DiscountType;
  discountValue: number;
  comboPrice?: number | null;
  freeProductId?: string | null;
  isSecondPairRule: boolean;
  secondPairPercent?: number | null;
  priority: number;
  isActive: boolean;
  startDate?: string | null;
  endDate?: string | null;
  config?: any; // Additional configuration
  upsellThreshold?: number | null;
  upsellRewardText?: string | null;
}
```

---

#### **Lens Products** (`/app/admin/lens-products/page.tsx`)

**Purpose**: Manage lens products (SKUs)

**Features**:
- Create/Edit/Delete lens products
- Fields: itCode, name, brandLine, visionType, lensIndex, tintOption, baseOfferPrice, category, yopoEligible
- Benefits mapping (ProductBenefit with scores 0-3)
- Features mapping (ProductFeature)
- RX ranges (LensRxRange)
- Tint colors association
- Mirror coatings association

---

#### **Contact Lens Products** (`/app/admin/contact-lens-products/page.tsx`)

**Purpose**: Manage contact lens products

**Features**:
- Create/Edit/Delete CL products
- Fields: skuCode, brand, line, modality, lensType, material, waterContent, packSize, mrp, offerPrice
- Power ranges: sphMin/Max, cylMin/Max, axisSteps, addMin/Max
- Color options (JSON array)
- isColorLens flag

---

## 4. UI Components

### 4.1 Core UI Components (`/components/ui/`)

**Button.tsx**
- Variants: primary, outline, ghost
- Loading state support
- Icon support

**Input.tsx**
- Standard text input
- Label, placeholder, error message support

**Select.tsx**
- Dropdown select
- Options array with value/label

**Modal.tsx**
- Full-screen or centered modal
- Close on backdrop click
- Header, body, footer sections

**DataTable.tsx** (`/components/data-display/DataTable.tsx`)
- Sortable columns
- Pagination
- Row actions (edit, delete)
- Empty state

**Badge.tsx**
- Color variants
- Icon support

**Card.tsx**
- Container with padding and shadow

**Toast.tsx**
- Success, error, warning, info variants
- Auto-dismiss

**Spinner.tsx**
- Loading indicator

**EmptyState.tsx**
- Empty state with icon, title, description, action button

---

### 4.2 Lens Advisor Components (`/components/lens-advisor/`)

**PrescriptionForm.tsx**
- OD/OS power inputs
- Real-time validation
- Language-aware labels
- Skip button

**FrameEntryForm.tsx**
- Brand selection
- Sub-brand selection
- Frame type selection
- MRP input

**LensRecommendationCard.tsx**
- Product card display
- Match percentage badge
- Index recommendation badge
- Thickness warning/invalid indicators
- Pricing display
- Features list
- Select button

**LensRecommendations.tsx**
- Recommendations list
- Sorting and filtering
- "View All" modal trigger

**QuestionnaireWizard.tsx**
- Multi-step wizard
- Question display
- Answer selection
- Sub-question injection
- Progress tracking

**SummarySidebar.tsx**
- Order summary display
- Pricing breakdown
- Applied offers

**OfferCalculatorView.tsx**
- Offer calculation display
- Price components
- Savings display

---

### 4.3 Offer Engine Components (`/components/offer-engine/`)

**OfferBreakdownPanel.tsx**
- Price breakdown display
- Applied offers list
- Savings calculation

**OfferEngineResultRenderer.tsx**
- Offer result visualization
- Component breakdown

**UpsellEngineUI.tsx**
- Upsell suggestions display

---

## 5. Language Support

### 5.1 Language-Aware Display

**Helper Function** (used in questionnaire pages):
```typescript
const getText = (textEn: string, textHi?: string, textHiEn?: string): string => {
  if (language === 'hi' && textHi) return textHi;
  if (language === 'hinglish' && textHiEn) return textHiEn;
  return textEn;
};
```

**Usage**:
- Questions: `getText(question.textEn, question.textHi, question.textHiEn)`
- Answers: `getText(option.textEn, option.textHi, option.textHiEn)`

### 5.2 Auto-Translation

**Admin Panel**:
- "Auto-Translate" buttons in QuestionForm
- Calls `POST /api/admin/translate`
- Backend auto-populates missing translations on save

**Translation Service** (`lib/translation.service.ts`):
- Rule-based translation (not API-based)
- Word/phrase mapping
- Transliteration fallback

---

## 6. Form Validation

### 6.1 Client-Side Validation

**Prescription Validation**:
- SPH: -20 to +20
- CYL: -6 to 0 (negative only)
- AXIS: 0-180 (required if CYL present)
- ADD: 0-4

**Contact Lens Power Validation**:
- Same as prescription
- Additional: Power range validation against product

**Frame Validation**:
- Brand required
- MRP > 0
- Frame type required

**Staff Selection Validation**:
- Mandatory for STAFF_ASSISTED mode
- Can be dropdown selection OR manual name entry

### 6.2 Error Display

- Toast notifications for API errors
- Inline validation errors for forms
- Error messages from API response

---

## 7. API Integration Patterns

### 7.1 Fetch Calls

**Standard Pattern**:
```typescript
const response = await fetch('/api/endpoint', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data),
});

if (!response.ok) {
  const error = await response.json();
  showToast('error', error.error?.message || 'Error occurred');
  return;
}

const data = await response.json();
if (data.success) {
  // Handle success
} else {
  showToast('error', data.error?.message);
}
```

### 7.2 Error Handling

- Try-catch blocks for network errors
- Response status checking
- Error message extraction from API response
- Toast notifications for user feedback

---

## 8. Navigation Flow Logic

### 8.1 Conditional Navigation

**Frame Entry Skip**:
- If `ONLY_LENS` → Skip frame entry → Create session → Go to questionnaire

**Tint Color Selection**:
- If Power Sunglasses → After product selection → Tint selection → Checkout
- Else → Direct to checkout

**Staff Selection**:
- If STAFF_ASSISTED → Show staff selection in checkout
- If SELF_SERVICE → Staff selection optional

### 8.2 Redirect Logic

- Store verification → Redirect if already verified
- Session check → Redirect if session invalid
- Category check → Redirect if category not selected
- Power check (CL) → Redirect if power not entered

---

## 9. Data Persistence

### 9.1 LocalStorage Usage

**Session Data**:
- Store code, language, prescription, frame, customer details
- Persists across page refreshes
- Cleared on session completion (optional)

**Zustand Persistence**:
- `session-store` persisted to localStorage
- `lens-advisor-store` in-memory only

### 9.2 State Synchronization

- LocalStorage ↔ Zustand stores
- API responses → Component state
- Component state → API requests

---

## 10. Key Frontend Business Logic

### 10.1 Recommendation Display Logic

**Match Percentage**:
- Calculated in backend
- Displayed as badge (0-100%)
- Color-coded (green: high, yellow: medium, red: low)

**Index Recommendation**:
- Recommended index from backend
- Comparison with product index
- Delta calculation (thinner/thicker)
- Validation messages (invalid, warning, info)

**Thickness Warnings**:
- Red: Invalid (e.g., INDEX_156 for rimless) - Button disabled
- Yellow: Thicker than recommended - Warning message
- Blue: Thinner than recommended - Info message (upsell)

### 10.2 Offer Display Logic

**Price Breakdown**:
- Frame MRP (if applicable)
- Lens Price
- Feature Add-ons
- Applied Offers (with savings)
- Final Payable

**Offer Types Display**:
- COMBO_PRICE: "Combo Price: ₹X"
- YOPO: "You Pay One: ₹X"
- FREE_LENS: "Free Lens"
- PERCENT_OFF: "X% Off"
- FLAT_OFF: "₹X Off"

### 10.3 Contact Lens Flow Logic

**Power Validation**:
- Client-side validation (range checks)
- Backend validation (against product ranges)
- Error display if power not available
- Prevents progression if invalid

**Product Filtering**:
- By power range (SPH, CYL, AXIS, ADD)
- By brand (optional filter)
- By availability

---

**End of Part 2: Frontend Implementation**

**Next**: Part 3 will cover Backend Implementation (APIs, Services, Business Logic).
