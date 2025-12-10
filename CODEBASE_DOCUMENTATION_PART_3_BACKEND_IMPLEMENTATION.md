# LensTrack Codebase Documentation - Part 3: Backend Implementation

**Generated from actual codebase analysis - Only documented what exists in code**

---

## 1. Backend Architecture

### 1.1 API Structure
- **Framework**: Next.js API Routes (App Router)
- **Location**: `/app/api/`
- **Authentication**: JWT-based (via `middleware/auth.middleware.ts`)
- **Validation**: Zod schemas
- **Error Handling**: Centralized via `lib/errors.ts`

### 1.2 API Categories

#### Public APIs (`/api/public/*`)
- No authentication required
- Store verification
- Session creation
- Questionnaire answers
- Recommendations
- Product eligibility

#### Admin APIs (`/api/admin/*`)
- JWT authentication required
- Role-based authorization
- CRUD operations for all master data

#### Order APIs (`/api/order/*`)
- Order creation
- Order confirmation

#### Offer Engine APIs (`/api/offer-engine/*`, `/api/offers/*`)
- Offer calculation

#### Contact Lens APIs (`/api/contact-lens/*`)
- Power conversion
- Product search

---

## 2. Authentication & Authorization

### 2.1 Authentication Middleware (`middleware/auth.middleware.ts`)

**Functions**:
```typescript
authenticate(request: NextRequest): Promise<TokenPayload>
authorize(...allowedRoles: UserRole[]): (user: TokenPayload) => void
canManageRole(currentRole: UserRole, targetRole: UserRole): boolean
```

**Token Payload**:
```typescript
interface TokenPayload {
  userId: string;
  email: string;
  role: UserRole;
  organizationId: string;
  storeId: string | null;
  iat?: number;
  exp?: number;
}
```

**Usage Pattern**:
```typescript
// In API route
const user = await authenticate(request);
authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN)(user);
```

### 2.2 Auth APIs

#### **POST /api/auth/login**
- Validates email/password
- Checks user exists and is active
- Verifies password (bcrypt)
- Generates JWT token
- Returns token and user info

#### **POST /api/auth/logout**
- Clears session (client-side token removal)

#### **GET /api/auth/session**
- Returns current user session info

---

## 3. Public Questionnaire APIs

### 3.1 Session Management

#### **POST /api/public/questionnaire/sessions**

**Purpose**: Create a new questionnaire session

**Request Body**:
```typescript
{
  storeCode: string;
  category: 'EYEGLASSES' | 'SUNGLASSES' | 'CONTACT_LENSES' | 'ACCESSORIES';
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  customerCategory?: string;
  prescription?: RxInput;
  frame?: FrameInput;
}
```

**Logic**:
1. Validate store code exists and is active
2. Get default user for store (SALES_EXECUTIVE or first active user)
3. Create session with status 'IN_PROGRESS'
4. Store prescription/frame data in `session.customerEmail` (JSON field) if provided
5. Return session ID

**Response**:
```typescript
{
  success: true;
  data: {
    sessionId: string;
    storeId: string;
    category: string;
  };
}
```

---

#### **GET /api/public/questionnaire/sessions/[sessionId]**

**Purpose**: Get session details and questions

**Logic**:
1. Fetch session from database
2. Get store info
3. Fetch active questions for session category
4. Fetch answer options for questions
5. Format questions with options
6. Return session + questions

**Response**:
```typescript
{
  success: true;
  data: {
    session: Session;
    questions: Question[];
  };
}
```

---

#### **POST /api/public/questionnaire/sessions/[sessionId]/answer**

**Purpose**: Submit questionnaire answer

**Request Body**:
```typescript
{
  questionId: string;
  optionIds: string[];
}
```

**Logic**:
1. Validate session exists and not completed
2. Validate question exists and belongs to session category
3. Validate all options belong to question
4. Create SessionAnswer records for each option
5. Check if all questions answered
6. If complete → Update session status to 'COMPLETED'

**Response**:
```typescript
{
  success: true;
  data: {
    completed: boolean;
    answeredQuestions: number;
    totalQuestions: number;
  };
}
```

---

#### **GET /api/public/questionnaire/sessions/[sessionId]/recommendations**

**Purpose**: Get product recommendations for session

**Logic**:
1. Validate session exists
2. Check if session has answers
3. Check if recommendations already exist (cached)
4. If not → Call `generateRecommendations(sessionId)`
5. Return recommendations with match %, index info, pricing

**Response**:
```typescript
{
  success: true;
  data: {
    sessionId: string;
    category: string;
    recommendations: Recommendation[];
    answeredFeatures: { feature: string; weight: number }[];
    recommendedIndex?: string;
    generatedAt: string;
    store: { name: string; city?: string; phone?: string };
  };
}
```

---

#### **POST /api/public/questionnaire/sessions/[sessionId]/recalculate-offers**

**Purpose**: Recalculate offers for selected product

**Request Body**:
```typescript
{
  productId: string;
  frameData?: FrameInput;
  // ... other offer calculation inputs
}
```

**Logic**:
1. Fetch product details
2. Get frame data (from request or localStorage)
3. Call offer engine to calculate offers
4. Return offer breakdown

---

## 4. Recommendation Engine

### 4.1 Main Engine (`lib/recommendation-engine.ts`)

#### **Function: `generateRecommendations(sessionId: string)`**

**Purpose**: Generate product recommendations based on session answers

**Flow**:
```
1. Fetch session and answers
2. Extract prescription and frame data from session
3. Get organization ID from store
4. Build benefit scores from answers (via AnswerBenefit mappings)
5. Fetch candidate products (LensProduct for EYEGLASSES/SUNGLASSES)
6. Score products using benefit matching
7. Calculate index recommendations
8. Apply store pricing overrides
9. Calculate offers for each product
10. Rank and return recommendations
```

**Key Logic**:

**Benefit Score Calculation**:
```typescript
// Get all session answers
const sessionAnswers = await prisma.sessionAnswer.findMany({ where: { sessionId } });

// Get answer IDs
const optionIds = sessionAnswers.map(a => a.optionId);

// Get AnswerBenefit mappings
const answerBenefits = await prisma.answerBenefit.findMany({
  where: { answerId: { in: optionIds } }
});

// Get benefits from BenefitFeature model
const benefitIds = [...new Set(answerBenefits.map(ab => ab.benefitId))];
const benefits = await prisma.benefitFeature.findMany({
  where: { id: { in: benefitIds }, type: 'BENEFIT', organizationId }
});

// Aggregate scores
const benefitScoresMap = new Map<string, number>();
answerBenefits.forEach(ab => {
  const benefit = benefits.find(b => b.id === ab.benefitId);
  if (benefit) {
    const code = benefit.code;
    const points = ab.points || 1;
    benefitScoresMap.set(code, (benefitScoresMap.get(code) || 0) + points);
  }
});
```

**Product Scoring**:
```typescript
// For each product
const productBenefits = await prisma.productBenefit.findMany({
  where: { productId: product.id }
});

let benefitScore = 0;
productBenefits.forEach(pb => {
  const benefit = benefits.find(b => b.id === pb.benefitId);
  if (benefit) {
    const userScore = benefitScoresMap.get(benefit.code) || 0;
    const productScore = pb.score || 0; // 0-3 scale
    benefitScore += userScore * productScore;
  }
});

// Final score = benefitScore (Answer Boosts removed in current implementation)
```

**Index Recommendation Integration**:
```typescript
// Calculate recommended index
const indexService = new IndexRecommendationService();
const recommendedIndex = indexService.recommendIndex(rxInput, frameInput);

// For each product, calculate index validation
const indexValidation = indexService.validateIndexSelection(
  product.lensIndex,
  rxInput,
  frameInput
);

// Add to recommendation
recommendation.indexRecommendation = {
  recommendedIndex,
  indexDelta: indexService.calculateIndexDelta(product.lensIndex, recommendedIndex),
  validationMessage: indexValidation.message,
  isInvalid: !indexValidation.isValid,
  isWarning: indexValidation.isWarning,
};
```

**Product Filtering**:
- For EYEGLASSES/SUNGLASSES: Fetch `LensProduct` (not frames - frames are manual entry)
- Filter by `visionType` (inferred from prescription)
- Filter by `isActive: true`
- For SUNGLASSES: Filter by `tintOption: TINT | PHOTOCHROMIC | TRANSITION`
- For SUNGLASSES: Filter by `brandLine: TINT_NEXT | TINT_PREMIUM | TINT_ESSENTIAL`
- Apply frame type filter (rimless → block INDEX_156)

**Store Pricing**:
```typescript
// Get store-specific pricing
const storeProduct = await prisma.storeProduct.findFirst({
  where: { storeId: session.storeId, productId: product.id }
});

if (storeProduct) {
  // Use store price override if available
  finalPrice = storeProduct.priceOverride || product.baseOfferPrice;
  stockQuantity = storeProduct.stockQuantity;
  isAvailable = storeProduct.isAvailable;
}
```

**Offer Calculation**:
```typescript
// Calculate offers for each product
const offerResult = await offerEngineService.calculateOffers({
  frame: frameData,
  lens: { itCode: product.itCode, price: finalPrice, ... },
  organizationId,
  mode: 'FRAME_AND_LENS' | 'ONLY_LENS',
  customerCategory: session.customerCategory,
});
```

---

### 4.2 Benefit Recommendation Service (`services/benefit-recommendation.service.ts`)

**Class**: `BenefitRecommendationService`

**Main Method**: `recommend(input)`

**Input**:
```typescript
{
  prescription: RxInput;
  frame?: FrameInput | null;
  answers: AnswerSelection[];
  visionTypeOverride?: VisionType | null;
  budgetFilter?: 'ECONOMY' | 'STANDARD' | 'PREMIUM' | 'BEST' | null;
  category?: 'EYEGLASSES' | 'SUNGLASSES' | 'ONLY_LENS' | 'CONTACT_LENSES' | null;
  organizationId: string;
}
```

**Output**:
```typescript
{
  recommendedIndex: string;
  benefitScores: BenefitScores;
  products: RecommendedProduct[];
}
```

**Key Methods**:

**`computeBenefitScores(answers, organizationId)`**:
- Fetches AnswerBenefit mappings
- Aggregates points per benefit code
- Returns `{ [benefitCode]: score }`

**`fetchCandidateProducts(...)`**:
- Filters by visionType, frameType, category
- For SUNGLASSES: Filters by tintOption and brandLine
- Returns candidate products

**`scoreProducts(products, benefitScores, answers)`**:
- Calculates benefit component score
- Returns scored products

**`isLensAllowedForFrameType(lens, frameType)`**:
- **Rimless Rule**: Blocks INDEX_156 for rimless frames
- Returns true/false

---

### 4.3 Index Recommendation Service (`services/index-recommendation.service.ts`)

**Class**: `IndexRecommendationService`

**Main Method**: `recommendIndex(rx: RxInput, frame?: FrameInput | null)`

**Logic**:

**1. Calculate Maximum Power**:
```typescript
computeMaxPower(rx): number {
  const powers = [
    Math.abs(rx.rSph || 0),
    Math.abs(rx.lSph || 0),
    Math.abs((rx.rSph || 0) + (rx.rCyl || 0)),
    Math.abs((rx.lSph || 0) + (rx.lCyl || 0)),
  ].filter(p => p > 0);
  return Math.max(...powers);
}
```

**2. Rimless Frame Rule**:
```typescript
if (frame?.frameType === 'RIMLESS') {
  if (maxPower < 4) return 'INDEX_160';
  if (maxPower < 6) return 'INDEX_160';
  if (maxPower <= 8) return 'INDEX_167';
  return 'INDEX_174';
  // Never returns INDEX_156 for rimless
}
```

**3. Power-Based Escalation**:
```typescript
if (maxPower < 4) return 'INDEX_156';
if (maxPower < 6) return 'INDEX_160';  // 4+ threshold
if (maxPower <= 8) return 'INDEX_167';  // 6+ threshold
return 'INDEX_174';  // > 8D
```

**4. Half-Rim Adjustment**:
```typescript
if (frameType === 'HALF_RIM' && maxPower >= 4 && baseIndex === 'INDEX_156') {
  baseIndex = 'INDEX_160';
}
if (frameType === 'HALF_RIM' && maxPower >= 6 && baseIndex === 'INDEX_160') {
  baseIndex = 'INDEX_167';
}
```

**Method**: `validateIndexSelection(lensIndex, rx, frame)`

**Returns**:
```typescript
{
  isValid: boolean;
  isWarning: boolean;
  message: string | null;
}
```

**Validation Rules**:
- **Invalid**: INDEX_156 for rimless frames → `isValid: false`, error message
- **Warning**: Thicker than recommended → `isWarning: true`, warning message
- **Info**: Thinner than recommended → informational message (upsell)

**Method**: `calculateIndexDelta(lensIndex, recommendedIndex)`

**Returns**: Number
- `> 0`: Thinner than recommended (premium)
- `0`: Ideal match
- `< 0`: Thicker than recommended (warning)

---

### 4.4 RX Validation Service (`services/rx-validation.service.ts`)

**Class**: `RxValidationService`

**Method**: `validateRx(rx: RxInput)`

**Validations**:
- SPH: -20 to +20
- CYL: -6 to 0 (negative only)
- ADD: 0 to 4

**Method**: `inferVisionType(rx: RxInput, override?: VisionType)`

**Logic**:
- If override provided → use override
- If ADD > 0 → PROGRESSIVE or BIFOCAL
- Else → SINGLE_VISION

---

## 5. Offer Engine Service

### 5.1 Main Service (`services/offer-engine.service.ts`)

**Class**: `OfferEngineService`

**Main Method**: `calculateOffers(input: OfferCalculationInput)`

**Input**:
```typescript
interface OfferCalculationInput {
  frame?: FrameInput | null;
  lens?: LensInput | null;
  organizationId: string;
  mode: 'FRAME_AND_LENS' | 'ONLY_LENS' | 'CONTACT_LENS_ONLY';
  customerCategory?: CustomerCategory | null;
  couponCode?: string | null;
  secondPair?: SecondPairInput | null;
  otherItems?: ContactLensItem[] | AccessoryItem[]; // For CONTACT_LENS_ONLY mode
}
```

**Output**:
```typescript
interface OfferCalculationResult {
  baseTotal: number;
  effectiveBase: number;
  finalPayable: number;
  frameMRP: number;
  lensPrice: number;
  offersApplied: OfferApplied[];
  priceComponents: PriceComponent[];
  categoryDiscount?: CategoryDiscountApplied | null;
  couponDiscount?: CouponDiscountApplied | null;
  couponError?: string | null;
  secondPairDiscount?: OfferApplied | null;
  upsell?: UpsellSuggestion | null;
}
```

---

### 5.2 Offer Waterfall Logic

**Step 1: Primary Offers** (Mutually Exclusive - Highest Priority Wins)

**Priority Order**:
1. **COMBO_PRICE** (highest priority)
2. **YOPO** (You Pay One)
3. **FREE_LENS**
4. **PERCENT_OFF**
5. **FLAT_OFF** (lowest priority)

**Method**: `findApplicablePrimaryRule(input)`

**Logic**:
```typescript
// Query OfferRule with filters:
where: {
  organizationId,
  isActive: true,
  offerType: { in: ['COMBO_PRICE', 'YOPO', 'FREE_LENS', 'PERCENT_OFF', 'FLAT_OFF'] },
  // Frame filters
  frameBrands: { has: frame.brand },
  frameSubCategories: { has: frame.subCategory },
  minFrameMRP: { lte: frameMRP },
  maxFrameMRP: { gte: frameMRP },
  // Lens filters
  lensBrandLines: { has: lens.brandLine },
  lensItCodes: { has: lens.itCode },
}
orderBy: { priority: 'desc' } // Higher priority first
```

**Rule Application**:

**COMBO_PRICE**:
```typescript
if (rule.offerType === 'COMBO_PRICE') {
  const comboPrice = rule.config.comboPrice || 0;
  return {
    newTotal: comboPrice,
    savings: baseTotal - comboPrice,
    label: `Combo Price: ₹${comboPrice}`,
    locksFurtherEvaluation: true, // Stops further offer evaluation
  };
}
```

**YOPO** (You Pay One):
```typescript
if (rule.offerType === 'YOPO') {
  const higherPrice = Math.max(frameMRP, lensPrice);
  return {
    newTotal: higherPrice,
    savings: baseTotal - higherPrice,
    label: `You Pay One: ₹${higherPrice}`,
    locksFurtherEvaluation: true, // Stops further offer evaluation
  };
}
```

**FREE_LENS**:
```typescript
if (rule.offerType === 'FREE_LENS') {
  return {
    newTotal: frameMRP, // Lens is free
    savings: lensPrice,
    label: 'Free Lens',
    locksFurtherEvaluation: false, // Can apply other offers
  };
}
```

**PERCENT_OFF**:
```typescript
if (rule.offerType === 'PERCENT_OFF') {
  const discountPercent = rule.discountValue || 0;
  const discountAmount = (baseTotal * discountPercent) / 100;
  return {
    newTotal: baseTotal - discountAmount,
    savings: discountAmount,
    label: `${discountPercent}% Off`,
    locksFurtherEvaluation: false,
  };
}
```

**FLAT_OFF**:
```typescript
if (rule.offerType === 'FLAT_OFF') {
  const discountAmount = rule.discountValue || 0;
  return {
    newTotal: baseTotal - discountAmount,
    savings: discountAmount,
    label: `₹${discountAmount} Off`,
    locksFurtherEvaluation: false,
  };
}
```

---

**Step 2: Second Pair Discount**

**Method**: `findApplicableSecondPairRule(input)`

**Logic**:
- Query OfferRule with `isSecondPairRule: true`
- Apply discount percentage to second pair total

**Application**:
```typescript
if (secondPairRule) {
  const discountPercent = secondPairRule.secondPairPercent || 0;
  const secondPairTotal = secondPair.frameMRP + secondPair.lensPrice;
  const discountAmount = (secondPairTotal * discountPercent) / 100;
  return {
    newTotal: secondPairTotal - discountAmount,
    savings: discountAmount,
    label: `Second Pair ${discountPercent}% Off`,
  };
}
```

---

**Step 3: Category Discount**

**Method**: `findApplicableCategoryDiscount(input)`

**Logic**:
```typescript
// Query CategoryDiscount
where: {
  organizationId,
  customerCategory,
  brandCode: lens.brandLine, // Or frame brand
  isActive: true,
}

// Apply discount
const discountPercent = categoryDiscount.discountPercent;
const maxDiscount = categoryDiscount.maxDiscount;
const discountAmount = Math.min(
  (effectiveBase * discountPercent) / 100,
  maxDiscount
);
```

---

**Step 4: Coupon Discount**

**Method**: `findApplicableCoupon(input)`

**Logic**:
```typescript
// Query Coupon
where: {
  organizationId,
  code: couponCode,
  isActive: true,
  validFrom: { lte: now },
  validUntil: { gte: now },
  // Check usage limit
  usedCount: { lt: usageLimit },
}

// Validate min cart value
if (coupon.minCartValue && effectiveBase < coupon.minCartValue) {
  return { error: 'Minimum cart value not met' };
}

// Apply discount
if (coupon.discountType === 'PERCENTAGE') {
  discountAmount = Math.min(
    (effectiveBase * coupon.discountValue) / 100,
    coupon.maxDiscount || Infinity
  );
} else {
  discountAmount = Math.min(
    coupon.discountValue,
    coupon.maxDiscount || Infinity
  );
}
```

---

**Step 5: Upsell Suggestions**

**Method**: `calculateUpsellSuggestions(input)`

**Logic**:
- Check if offer rule has `upsellEnabled: true`
- Check if `effectiveBase >= upsellThreshold`
- Return upsell suggestion with reward text

---

### 5.3 Contact Lens Offers (`calculateContactLensOffers`)

**Purpose**: Calculate offers for CONTACT_LENS_ONLY mode

**Logic**:

**1. CL Brand Discount**:
```typescript
// Query OfferRule with:
where: {
  organizationId,
  offerType: 'PERCENT_OFF' | 'FLAT_OFF',
  lensBrandLines: { has: clItem.brand },
  isActive: true,
}
// Apply to CL item
```

**2. Pack + Solution Combo**:
```typescript
// Check if solution add-on exists
// Apply combo discount if both present
```

**3. Category Discount**:
```typescript
// Same as frame+lens category discount
// Applied to CL items
```

**4. Bonus Free Product**:
```typescript
// Check BONUS_FREE_PRODUCT rules
// If triggerMinBill met → Add free product
```

**5. Coupon Discount**:
```typescript
// Same as frame+lens coupon logic
```

**Important**: YOPO and Frame offers are **NOT applied** to CL-only orders.

---

## 6. Contact Lens APIs

### 6.1 Power Conversion

#### **POST /api/contact-lens/convert-power**

**Purpose**: Convert spectacle power to contact lens power

**Request Body**:
```typescript
{
  spectaclePower: {
    odSphere?: number;
    odCylinder?: number;
    odAxis?: number;
    odAdd?: number;
    osSphere?: number;
    osCylinder?: number;
    osAxis?: number;
    osAdd?: number;
  };
}
```

**Conversion Logic**:

**Vertex Distance Formula** (for SPH > 4.00D):
```typescript
const VERTEX_DISTANCE = 0.012; // 12mm in meters

function convertSphere(sphere: number): number {
  const absSphere = Math.abs(sphere);
  
  // Only apply vertex conversion if |SPH| > 4.00D
  if (absSphere <= 4.0) {
    return roundToQuarter(sphere);
  }
  
  // CL_SPH = SPH / (1 - (d * SPH))
  const clSphere = sphere / (1 - (VERTEX_DISTANCE * sphere));
  return roundToQuarter(clSphere);
}
```

**CYL Conversion**:
- CYL remains same (no vertex conversion)

**AXIS Conversion**:
- AXIS remains same

**ADD Conversion**:
```typescript
function mapMultifocalAdd(add: number): number {
  // Map to standard ranges
  if (add >= 1.0 && add <= 1.5) return 1.25; // LOW
  if (add >= 1.75 && add <= 2.25) return 2.0; // MED
  if (add >= 2.5) return roundToQuarter(add); // HIGH
  return roundToQuarter(add);
}
```

**Rounding**:
```typescript
function roundToQuarter(value: number): number {
  return Math.round(value * 4) / 4; // Round to nearest 0.25D
}
```

**Response**:
```typescript
{
  success: true;
  data: {
    contactLensPower: {
      od: { sphere, cylinder, axis, add };
      os: { sphere, cylinder, axis, add };
    };
    formatted: {
      od: string; // "+2.50 / -1.00 × 180 ADD +2.00"
      os: string;
    };
    conversionApplied: boolean;
    conversionDetails: {
      vertexConversionApplied: { od: boolean; os: boolean };
      addMappingApplied: { od: boolean; os: boolean };
      originalPower: {...};
      convertedPower: {...};
    };
  };
}
```

---

### 6.2 Product Search

#### **POST /api/contact-lens/search**

**Purpose**: Search contact lens products with power validation

**Request Body**:
```typescript
{
  mode: 'SPECTACLE' | 'CONTACT_LENS';
  spectaclePower?: {...}; // If mode is SPECTACLE
  contactLensPower?: {...}; // If mode is CONTACT_LENS
  brand?: string;
  line?: string;
  packType?: 'DAILY' | 'MONTHLY' | 'YEARLY';
  modality?: 'DAILY' | 'BIWEEKLY' | 'MONTHLY' | 'YEARLY';
  lensType?: 'SPHERICAL' | 'TORIC' | 'MULTIFOCAL' | 'COSMETIC';
}
```

**Logic**:
1. Determine power to use (spectacle or CL)
2. Fetch all active ContactLensProduct
3. Apply filters (brand, line, modality, lensType)
4. **Power Range Validation** via `filterProductsByPower()`
5. Return eligible and ineligible products

**Power Validation** (`lib/contact-lens-power-validation.ts`):

**Function**: `validateContactLensPower(power, product)`

**Validations**:
- **SPH Range**: Check `sphMin <= sph <= sphMax`
- **CYL Range**: Check `cylMin <= |cyl| <= cylMax`
- **AXIS Steps**: Check if axis matches `axisSteps` array (if provided)
- **ADD Range**: Check `addMin <= add <= addMax`
- **Lens Type**: 
  - SPHERICAL: CYL must be 0 or very small
  - TORIC: CYL required
  - MULTIFOCAL: ADD required

**Function**: `filterProductsByPower(products, power)`

**Returns**:
```typescript
{
  eligible: ContactLensProduct[];
  ineligible: { product: ContactLensProduct; reasons: string[] }[];
}
```

**Response**:
```typescript
{
  success: true;
  data: {
    products: ContactLensProduct[];
    powerUsed: {...};
    mode: string;
    filters: {...};
    availability: {
      totalProducts: number;
      eligibleProducts: number;
      ineligibleCount: number;
    };
    error?: {
      message: string;
      code: string;
    };
  };
}
```

---

## 7. Order APIs

### 7.1 Order Creation

#### **POST /api/order/create**

**Purpose**: Create a new order

**Request Body**:
```typescript
{
  storeId: string;
  salesMode: 'SELF_SERVICE' | 'STAFF_ASSISTED';
  assistedByStaffId?: string | null;
  assistedByName?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  frameData: OrderFrameData;
  lensData: OrderLensData;
  offerData: OrderOfferData;
  orderType?: 'EYEGLASSES' | 'LENS_ONLY' | 'POWER_SUNGLASS' | 'CONTACT_LENS_ONLY';
  finalPrice: number;
}
```

**Business Rules**:

**1. Staff Selection Validation**:
```typescript
if (salesMode === 'STAFF_ASSISTED') {
  if (!assistedByStaffId && !assistedByName) {
    throw new ValidationError(
      'Staff selection is required for STAFF_ASSISTED mode. ' +
      'Please provide either assistedByStaffId or assistedByName.'
    );
  }
}
```

**2. Staff Validation**:
```typescript
if (assistedByStaffId) {
  const staff = await prisma.staff.findUnique({
    where: { id: assistedByStaffId }
  });
  
  if (!staff || staff.storeId !== storeId) {
    throw new ValidationError('Invalid staff member');
  }
}
```

**3. Store Validation**:
```typescript
const store = await prisma.store.findUnique({
  where: { id: storeId }
});

if (!store) {
  throw new ValidationError('Store not found');
}
```

**Order Creation**:
```typescript
const order = await prisma.order.create({
  data: {
    storeId,
    salesMode,
    assistedByStaffId: assistedByStaffId || null,
    assistedByName: assistedByName || null,
    customerName: customerName || null,
    customerPhone: customerPhone || null,
    frameData, // JSON object
    lensData,  // JSON object
    offerData, // JSON object
    orderType: orderType || 'EYEGLASSES',
    finalPrice,
    status: 'DRAFT',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
});
```

**Response**:
```typescript
{
  success: true;
  data: Order;
}
```

---

### 7.2 Order PDF Generation

#### **GET /api/admin/orders/[id]/pdf**

**Purpose**: Generate PDF for order slip

**Logic**:
1. Fetch order from database
2. Get store info
3. Generate PDF via `lib/pdf-generator.ts`
4. Return PDF as blob

**PDF Content** (from `lib/pdf-generator.ts`):
- Order number
- Store info
- Customer details
- Frame data (brand, MRP, type) - **NO SKU**
- Lens data (name, brand, price) - **NO IT CODE (SKU)**
- Offer breakdown
- Final price
- Barcode (Order ID as text and optional image)

**Important**: Order slip **only tracks barcode** (Order ID), not lens SKU or frame SKU.

---

## 8. Admin APIs

### 8.1 Question Management

#### **GET /api/admin/questions**

**Purpose**: List all questions

**Query Params**:
- `category`: Filter by category
- `organizationId`: Filter by organization

**Response**:
```typescript
{
  success: true;
  data: Question[];
}
```

---

#### **POST /api/admin/questions**

**Purpose**: Create a new question

**Request Body**:
```typescript
{
  key: string;
  textEn: string;
  textHi?: string;
  textHiEn?: string;
  category: string;
  order: number;
  isRequired: boolean;
  allowMultiple: boolean;
  isActive: boolean;
  options: Array<{
    key: string;
    textEn: string;
    textHi?: string;
    textHiEn?: string;
    icon?: string;
    order: number;
    benefitMapping: Record<string, number>; // { B01: 2, B04: 1.5 }
    triggersSubQuestion?: boolean;
    subQuestionId?: string | null;
  }>;
}
```

**Logic**:
1. Validate question key uniqueness
2. Create question
3. Create answer options
4. **Auto-translate** missing Hindi/Hinglish text (if provided)
5. Create AnswerBenefit mappings from `benefitMapping`

**Auto-Translation**:
```typescript
// For question text
if (!textHi || !textHiEn) {
  const translations = autoTranslateQuestion(textEn);
  textHi = textHi || translations.hindi;
  textHiEn = textHiEn || translations.hinglish;
}

// For each option
options.forEach(opt => {
  if (!opt.textHi || !opt.textHiEn) {
    const translations = autoTranslateAnswer(opt.textEn);
    opt.textHi = opt.textHi || translations.hindi;
    opt.textHiEn = opt.textHiEn || translations.hinglish;
  }
});
```

---

#### **PUT /api/admin/questions/[id]**

**Purpose**: Update question

**Logic**: Similar to create, but updates existing records

---

#### **DELETE /api/admin/questions/[id]**

**Purpose**: Delete question

**Logic**: Cascade deletes answer options and AnswerBenefit mappings

---

### 8.2 Benefit Features Master

#### **GET /api/admin/benefit-features**

**Purpose**: List all benefits and features

**Query Params**:
- `type`: Filter by 'BENEFIT' or 'FEATURE'
- `organizationId`: Filter by organization (null for global features)

**Response**:
```typescript
{
  success: true;
  data: BenefitFeature[];
}
```

---

#### **POST /api/admin/benefit-features**

**Purpose**: Create benefit or feature

**Request Body**:
```typescript
{
  type: 'BENEFIT' | 'FEATURE';
  code: string; // B01-B12 for benefits, F01-F11 for features
  name: string;
  description?: string;
  // Benefit-specific
  pointWeight?: number;
  maxScore?: number;
  // Feature-specific
  category?: string;
  displayOrder?: number;
  organizationId?: string; // null for global features
  isActive: boolean;
}
```

**Validation**:
- Code uniqueness per organization (or globally for features)
- Type must be BENEFIT or FEATURE

---

#### **PUT /api/admin/benefit-features/[id]**

**Purpose**: Update benefit/feature

---

#### **DELETE /api/admin/benefit-features/[id]**

**Purpose**: Delete benefit/feature

---

### 8.3 Translation API

#### **POST /api/admin/translate**

**Purpose**: Auto-translate text

**Request Body**:
```typescript
{
  type: 'question' | 'answer';
  text: string;
}
```

**Logic**:
```typescript
if (type === 'question') {
  const result = autoTranslateQuestion(text);
  return { hindi: result.hindi, hinglish: result.hinglish };
} else {
  const result = autoTranslateAnswer(text);
  return { hindi: result.hindi, hinglish: result.hinglish };
}
```

**Translation Service** (`lib/translation.service.ts`):
- Rule-based word/phrase mapping
- Not API-based (no Google Translate)
- Transliteration fallback

---

### 8.4 Offer Rules Management

#### **GET /api/admin/offers/rules**

**Purpose**: List all offer rules

**Response**: OfferRule[]

---

#### **POST /api/admin/offers/rules**

**Purpose**: Create offer rule

**Request Body**:
```typescript
{
  name: string;
  code: string;
  offerType: 'YOPO' | 'COMBO_PRICE' | 'FREE_LENS' | 'PERCENT_OFF' | 'FLAT_OFF' | 'BOG50' | 'CATEGORY_DISCOUNT' | 'BONUS_FREE_PRODUCT';
  frameBrands: string[];
  frameSubCategories: string[];
  minFrameMRP?: number;
  maxFrameMRP?: number;
  lensBrandLines: string[];
  lensItCodes: string[];
  discountType: 'PERCENTAGE' | 'FLAT_AMOUNT';
  discountValue: number;
  comboPrice?: number;
  freeProductId?: string;
  isSecondPairRule: boolean;
  secondPairPercent?: number;
  priority: number;
  isActive: boolean;
  startDate?: string;
  endDate?: string;
  config?: {
    comboType?: 'FIXED' | 'FRAME_MRP_ONLY' | 'BRAND_LINE_COMBO' | 'FRAME_CATEGORY_COMBO' | 'VISION_TYPE_COMBO';
    freeUnderYOPO?: 'BEST_OF' | 'FRAME' | 'LENS';
    bonusFreeAllowed?: boolean;
    // ... other config fields
  };
  upsellEnabled: boolean;
  upsellThreshold?: number;
  upsellRewardText?: string;
  organizationId: string;
}
```

---

#### **Store Activation**

#### **GET /api/admin/offers/store-activation**

**Purpose**: Get store offer activations

**Query Params**:
- `storeId`: Filter by store
- `offerRuleId`: Filter by offer rule

**Response**: StoreOfferMap[]

---

#### **POST /api/admin/offers/store-activation**

**Purpose**: Activate offer for store

**Request Body**:
```typescript
{
  storeId: string;
  offerRuleId: string;
  isActive: boolean;
}
```

---

## 9. Key Business Logic Services

### 9.1 Lens Pricing Calculation

**Location**: `lib/recommendation-engine.ts`

**Function**: `calculateLensPricing(product, features, storeId)`

**Logic**:
```typescript
// Base price
let basePrice = product.baseOfferPrice;

// Feature add-ons
const featureAddons: { name: string; price: number }[] = [];
features.forEach(feature => {
  if (feature.price && feature.price > 0) {
    featureAddons.push({
      name: feature.name,
      price: feature.price,
    });
    basePrice += feature.price;
  }
});

// Store price override
const storeProduct = await prisma.storeProduct.findFirst({
  where: { storeId, productId: product.id }
});

if (storeProduct?.priceOverride) {
  basePrice = storeProduct.priceOverride;
}

return {
  baseLensPrice: product.baseOfferPrice,
  featureAddons,
  totalLensPrice: basePrice,
};
```

---

### 9.2 Store Product Pricing

**Logic**:
- Check `StoreProduct` table for store-specific pricing
- If `priceOverride` exists → Use override
- Else → Use product `baseOfferPrice`
- Check `isAvailable` and `stockQuantity`

---

## 10. Error Handling

### 10.1 Error Types (`lib/errors.ts`)

**Classes**:
- `ValidationError`: Input validation errors (400)
- `NotFoundError`: Resource not found (404)
- `AuthError`: Authentication errors (401)
- `ForbiddenError`: Authorization errors (403)
- `InternalError`: Server errors (500)

### 10.2 Error Handler

**Function**: `handleApiError(error)`

**Logic**:
```typescript
if (error instanceof ValidationError) {
  return Response.json({ success: false, error: {...} }, { status: 400 });
}
if (error instanceof NotFoundError) {
  return Response.json({ success: false, error: {...} }, { status: 404 });
}
// ... other error types
return Response.json({ success: false, error: {...} }, { status: 500 });
```

---

## 11. Data Validation

### 11.1 Zod Schemas

**Usage Pattern**:
```typescript
const schema = z.object({
  field1: z.string().min(1),
  field2: z.number().positive(),
});

const validated = schema.parse(requestBody);
```

**Common Schemas**:
- Session creation
- Answer submission
- Order creation
- Offer calculation
- Contact lens search

---

## 12. Database Queries

### 12.1 Prisma Client Usage

**Pattern**:
```typescript
import { prisma } from '@/lib/prisma';

// Query
const data = await prisma.model.findMany({
  where: { ... },
  include: { ... },
});

// Create
const created = await prisma.model.create({
  data: { ... },
});

// Update
const updated = await prisma.model.update({
  where: { id },
  data: { ... },
});

// Delete
await prisma.model.delete({
  where: { id },
});
```

### 12.2 Type Casting

**Note**: Some models require type casting due to Prisma schema limitations:
```typescript
// Example: contactLensProduct model
const products = await (prisma as any).contactLensProduct.findMany({...});

// Example: lensProduct model
const products = await (prisma as any).lensProduct.findMany({...});

// Example: benefitFeature model
const benefits = await (prisma as any).benefitFeature.findMany({...});
```

---

## 13. Key Business Rules Implementation

### 13.1 Frame & Sunglass Handling

**Rule**: Frames and Sunglasses are NOT SKU products

**Implementation**:
- No `RetailProduct` queries for FRAME/SUNGLASS types in recommendation flow
- Frames are manual-entry only (stored in `Order.frameData`)
- For EYEGLASSES/SUNGLASSES flows, system recommends `LensProduct` only

---

### 13.2 Staff Selection Rules

**Rule**: Mandatory for STAFF_ASSISTED mode

**Implementation**:
- Frontend validation in checkout pages
- Backend validation in `/api/order/create`:
```typescript
if (salesMode === 'STAFF_ASSISTED') {
  if (!assistedByStaffId && !assistedByName) {
    throw new ValidationError('Staff selection is required...');
  }
}
```

---

### 13.3 Index Recommendation Rules

**Rule 1**: Rimless → INDEX_160+ mandatory

**Implementation**:
```typescript
// In IndexRecommendationService.recommendIndex()
if (frame?.frameType === 'RIMLESS') {
  // Never return INDEX_156
  if (maxPower < 4) return 'INDEX_160';
  // ... other power thresholds
}
```

**Rule 2**: Power-based escalation

**Implementation**:
```typescript
if (maxPower < 4) return 'INDEX_156';
if (maxPower < 6) return 'INDEX_160';  // 4+ threshold
if (maxPower <= 8) return 'INDEX_167';  // 6+ threshold
return 'INDEX_174';  // > 8D
```

**Rule 3**: Validation warnings

**Implementation**:
```typescript
// In IndexRecommendationService.validateIndexSelection()
if (frameType === 'RIMLESS' && lensIndex === 'INDEX_156') {
  return {
    isValid: false,
    isWarning: false,
    message: 'INDEX_156 is not suitable for rimless frames. Please select INDEX_160 or higher.',
  };
}

if (indexDelta < 0) {
  return {
    isValid: true,
    isWarning: true,
    message: `Selected index is thicker than recommended. Consider upgrading to ${recommendedIndex} for thinner lenses.`,
  };
}
```

---

### 13.4 Contact Lens Power Validation

**Rule**: Validate power against product ranges

**Implementation**:
- Client-side validation in power entry pages
- Backend validation in `/api/contact-lens/search`
- Uses `validateContactLensPower()` and `filterProductsByPower()`
- Returns detailed error messages if power not available

---

### 13.5 Offer Engine Waterfall

**Rule**: Priority-based offer application

**Implementation**:
1. Find applicable primary rule (COMBO > YOPO > FREE_LENS > PERCENT > FLAT)
2. Apply primary rule (locks further if COMBO/YOPO)
3. Apply second pair discount (if applicable)
4. Apply category discount
5. Apply coupon discount
6. Calculate upsell suggestions

**Locking Logic**:
```typescript
if (result.locksFurtherEvaluation) {
  // Skip remaining primary offers
  // But still apply category discount and upsell
}
```

---

## 14. PDF Generation

### 14.1 Order Slip PDF (`lib/pdf-generator.ts`)

**Function**: `generateOrderPDF(data: OrderPDFData)`

**Content**:
- Order number
- Store info
- Customer details
- Frame data (brand, MRP, type) - **NO SKU**
- Lens data (name, brand, price) - **NO IT CODE**
- Offer breakdown
- Final price
- Barcode (Order ID)

**Important**: Order slip **only tracks barcode** (Order ID), not product SKUs.

---

## 15. Translation Service

### 15.1 Auto-Translation (`lib/translation.service.ts`)

**Functions**:
- `translateToHindi(englishText: string): string`
- `translateToHinglish(englishText: string): string`
- `autoTranslateQuestion(englishText: string): { hindi: string; hinglish: string }`
- `autoTranslateAnswer(englishText: string): { hindi: string; hinglish: string }`

**Method**: Rule-based word/phrase mapping

**Usage**:
- Admin panel: "Auto-Translate" buttons
- Backend: Auto-populate missing translations on question/answer save

---

**End of Part 3: Backend Implementation**

**Next**: Part 4 will cover Database Schema & Data Flow in detail.
