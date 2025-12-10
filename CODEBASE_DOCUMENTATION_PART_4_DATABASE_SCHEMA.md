# LensTrack Codebase Documentation - Part 4: Database Schema & Data Flow

**Generated from actual codebase analysis - Only documented what exists in code**

---

## 1. Database Technology

- **Database**: MongoDB
- **ORM**: Prisma 5.22.0
- **Connection**: Via `DATABASE_URL` environment variable
- **Provider**: `mongodb` (Prisma datasource)

---

## 2. Complete Database Schema

### 2.1 Enums

```prisma
enum UserRole {
  SUPER_ADMIN
  ADMIN
  STORE_MANAGER
  SALES_EXECUTIVE
}

enum RetailProductType {
  FRAME
  SUNGLASS
  CONTACT_LENS
  ACCESSORY
}

enum VisionType {
  SINGLE_VISION
  PROGRESSIVE
  BIFOCAL
  ANTI_FATIGUE
  MYOPIA_CONTROL
}

enum LensIndex {
  INDEX_156  // 1.56
  INDEX_160  // 1.60
  INDEX_167  // 1.67
  INDEX_174  // 1.74
}

enum TintOption {
  CLEAR
  TINT
  PHOTOCHROMIC
  TRANSITION
}

enum LensCategory {
  ECONOMY
  STANDARD
  PREMIUM
  ULTRA
}

enum OrderType {
  EYEGLASSES
  LENS_ONLY
  POWER_SUNGLASS
  CONTACT_LENS_ONLY
}

enum ContactLensModality {
  DAILY
  BIWEEKLY
  MONTHLY
  YEARLY
}

enum ContactLensType {
  SPHERICAL
  TORIC
  MULTIFOCAL
  COSMETIC
}

enum TintColorCategory {
  SOLID
  GRADIENT
  FASHION
}
```

---

### 2.2 Core Models

#### **Organization**
```prisma
model Organization {
  id            String   @id @default(auto()) @map("_id") @db.ObjectId
  code          String   @unique
  name          String
  baseLensPrice Float
  isActive      Boolean
  settings      Json     // Nested JSON for settings
  createdAt     DateTime @db.Date
  updatedAt     DateTime @db.Date
}
```

**Purpose**: Multi-tenant root entity

**Key Fields**:
- `code`: Unique organization code
- `baseLensPrice`: Default lens price (fallback)
- `settings`: JSON field for flexible settings

---

#### **Store**
```prisma
model Store {
  id             String   @id @default(auto()) @map("_id") @db.ObjectId
  organizationId String   @db.ObjectId
  code           String
  name           String
  address        String
  city           String
  state          String
  pincode        String
  phone          String
  email          String
  gstNumber      String
  isActive       Boolean
  createdAt      DateTime @db.Date
  updatedAt      DateTime @db.Date

  @@unique([organizationId, code])
  @@index([organizationId])
  @@index([city])
  @@index([isActive])
}
```

**Purpose**: Physical store locations

**Key Fields**:
- `code`: Store code (unique per organization)
- `organizationId`: Parent organization
- `isActive`: Active status

---

#### **User**
```prisma
model User {
  id             String    @id @default(auto()) @map("_id") @db.ObjectId
  organizationId String    @db.ObjectId
  storeId        String?   @db.ObjectId
  email          String
  employeeId     String
  name           String
  passwordHash   String
  role           String    // UserRole enum value (stored as string)
  phone          String?
  isActive       Boolean
  lastLoginAt    DateTime? @db.Date
  createdAt      DateTime  @db.Date
  updatedAt      DateTime  @db.Date

  @@unique([organizationId, email])
  @@index([organizationId])
  @@index([storeId])
  @@index([role])
  @@index([isActive])
}
```

**Purpose**: System users with role-based access

**Key Fields**:
- `role`: Stored as string (SUPER_ADMIN, ADMIN, STORE_MANAGER, SALES_EXECUTIVE)
- `storeId`: Optional (null for organization-level users)
- `passwordHash`: bcrypt hashed password

---

#### **Session**
```prisma
model Session {
  id               String   @id @default(auto()) @map("_id") @db.ObjectId
  storeId          String   @db.ObjectId
  userId           String   @db.ObjectId
  category         String   // EYEGLASSES, SUNGLASSES, CONTACT_LENSES, ACCESSORIES
  customerName     String
  customerPhone    String
  customerCategory String?  // STUDENT, DOCTOR, etc.
  customerEmail    Json?    // Stores prescription/frame data as JSON
  prescriptionId   Json?    // Prescription ID (JSON field - schema incomplete)
  status           String   // IN_PROGRESS, COMPLETED
  startedAt        DateTime @db.Date
  completedAt      DateTime @db.Date

  @@index([storeId])
  @@index([userId])
  @@index([status])
  @@index([startedAt])
  @@index([category])
  @@index([prescriptionId])
}
```

**Purpose**: Customer questionnaire sessions

**Key Fields**:
- `customerEmail`: JSON field storing prescription/frame data (workaround for missing relations)
- `prescriptionId`: JSON field (schema incomplete)
- `status`: Session status (IN_PROGRESS, COMPLETED)

**Data Storage Pattern**:
- Prescription data: Stored in `customerEmail` JSON field
- Frame data: Stored in `customerEmail` JSON field
- Format: `{ prescription: {...}, frame: {...} }`

---

#### **SessionAnswer**
```prisma
model SessionAnswer {
  id         String   @id @default(auto()) @map("_id") @db.ObjectId
  sessionId  String   @db.ObjectId
  questionId String   @db.ObjectId
  optionId   String   @db.ObjectId
  answeredAt DateTime @db.Date

  @@index([sessionId])
  @@index([questionId])
}
```

**Purpose**: Store customer questionnaire answers

**Key Fields**:
- One record per option selected
- Multiple records if question allows multiple selection

---

#### **SessionRecommendation**
```prisma
model SessionRecommendation {
  id         String   @id @default(auto()) @map("_id") @db.ObjectId
  sessionId  String   @db.ObjectId
  productId  String   @db.ObjectId  // Can be LensProduct or RetailProduct ID
  matchScore Float
  rank       BigInt
  isSelected Boolean
  createdAt  DateTime @db.Date

  @@unique([sessionId, productId])
  @@index([sessionId])
  @@index([productId])
  @@index([matchScore])
}
```

**Purpose**: Cache generated recommendations per session

**Key Fields**:
- `productId`: Can reference LensProduct or RetailProduct
- `matchScore`: Calculated match score
- `rank`: Ranking position

---

#### **Order**
```prisma
model Order {
  id                String         @id @default(auto()) @map("_id") @db.ObjectId
  storeId           String         @db.ObjectId
  salesMode         String         // SELF_SERVICE, STAFF_ASSISTED
  assistedByStaffId Json?          // Staff ID (JSON field)
  assistedByName    Json?          // Staff name (JSON field)
  customerName      String?
  customerPhone     String?
  frameData         OrderFrameData // Typed JSON
  lensData          OrderLensData  // Typed JSON
  offerData         OrderOfferData // Typed JSON
  orderType         OrderType      @default(EYEGLASSES)
  finalPrice        Float
  status            String         // DRAFT, CONFIRMED, IN_PROGRESS, COMPLETED, CANCELLED
  createdAt         DateTime       @db.Date
  updatedAt         DateTime       @db.Date

  @@index([storeId])
  @@index([status])
  @@index([createdAt])
  @@index([assistedByStaffId])
  @@index([orderType])
}
```

**Purpose**: Sales orders

**Key Types**:
```prisma
type OrderFrameData {
  brand     String
  frameType String?
  mrp       Int
  subBrand  String?
}

type OrderLensData {
  brandLine String
  id        String
  index     String
  name      String
  price     Int
  // Note: NO itCode (SKU) - Order slip only tracks barcode
}

type OrderOfferData {
  baseTotal          Int
  effectiveBase      Int
  finalPayable       Int
  frameMRP           Int
  lensPrice          Int
  categoryDiscount   Json?
  couponDiscount     Json?
  couponError        Json?
  offersApplied      Json?
  secondPairDiscount Json?
  upsell             Json?
  priceComponents    OrderOfferDataPriceComponents[]
}

type OrderOfferDataPriceComponents {
  amount Int
  label  String
}
```

**Important**: 
- `lensData` does NOT include `itCode` (SKU)
- Order slip only tracks barcode (Order ID)
- Frame and lens SKUs are NOT stored in order

---

### 2.3 Product Models

#### **LensProduct**
```prisma
model LensProduct {
  id             String                     @id @default(auto()) @map("_id") @db.ObjectId
  itCode         String                     @unique  // Lens SKU
  name           String
  brandLine      String                     // Brand line (e.g., BLUEXPERT, DIGI360_ADVANCED)
  visionType     VisionType
  lensIndex      LensIndex
  tintOption     TintOption
  baseOfferPrice Float
  addOnPrice     Float?
  category       LensCategory
  yopoEligible   Boolean                    @default(true)
  deliveryDays   Int                        @default(4)
  isActive       Boolean                    @default(true)
  createdAt      DateTime                   @default(now()) @db.Date
  updatedAt      DateTime                   @updatedAt @db.Date
  
  rxRanges       LensRxRange[]
  benefits       ProductBenefit[]
  features       ProductFeature[]
  specs          ProductSpecification[]
  tintColors     LensProductTintColor[]
  mirrorCoatings LensProductMirrorCoating[]

  @@index([brandLine])
  @@index([visionType])
  @@index([lensIndex])
  @@index([category])
  @@index([isActive])
  @@index([yopoEligible])
}
```

**Purpose**: Lens SKU products

**Key Fields**:
- `itCode`: Unique lens SKU
- `brandLine`: Brand line identifier
- `visionType`: SINGLE_VISION, PROGRESSIVE, etc.
- `lensIndex`: INDEX_156, INDEX_160, etc.
- `tintOption`: CLEAR, TINT, PHOTOCHROMIC, TRANSITION
- `baseOfferPrice`: Base price
- `yopoEligible`: Eligible for YOPO offers

**Relations**:
- `rxRanges`: Power ranges supported
- `benefits`: Product-benefit mappings
- `features`: Product-feature mappings
- `specs`: Product specifications
- `tintColors`: Available tint colors
- `mirrorCoatings`: Available mirror coatings

---

#### **LensRxRange**
```prisma
model LensRxRange {
  id         String      @id @default(auto()) @map("_id") @db.ObjectId
  lensId     String      @db.ObjectId
  sphMin     Float
  sphMax     Float
  cylMin     Float
  cylMax     Float
  addOnPrice Float       @default(0)
  createdAt  DateTime    @default(now()) @db.Date
  updatedAt  DateTime    @updatedAt @db.Date
  lens       LensProduct @relation(fields: [lensId], references: [id], onDelete: Cascade)

  @@index([lensId])
}
```

**Purpose**: Power ranges supported by lens products

**Key Fields**:
- `sphMin/sphMax`: Sphere power range
- `cylMin/cylMax`: Cylinder power range
- `addOnPrice`: Additional price for this range

---

#### **ContactLensProduct**
```prisma
model ContactLensProduct {
  id           String              @id @default(auto()) @map("_id") @db.ObjectId
  skuCode      String              @unique
  brand        String
  line         String
  modality     ContactLensModality
  lensType     ContactLensType
  material     String?
  waterContent String?
  designNotes  String?
  packSize     Int
  mrp          Float
  offerPrice   Float
  // Power ranges
  sphMin       Float?
  sphMax       Float?
  cylMin       Float?
  cylMax       Float?
  axisSteps    String?             // JSON array of numbers
  addMin       Float?
  addMax       Float?
  // Color options
  isColorLens  Boolean             @default(false)
  colorOptions String?             // JSON array of color names
  isActive     Boolean             @default(true)
  createdAt    DateTime            @default(now()) @db.Date
  updatedAt    DateTime            @updatedAt @db.Date

  @@index([brand])
  @@index([modality])
  @@index([lensType])
  @@index([isActive])
}
```

**Purpose**: Contact lens SKU products

**Key Fields**:
- `skuCode`: Unique CL SKU
- `modality`: DAILY, BIWEEKLY, MONTHLY, YEARLY
- `lensType`: SPHERICAL, TORIC, MULTIFOCAL, COSMETIC
- Power ranges: `sphMin/Max`, `cylMin/Max`, `axisSteps`, `addMin/Max`
- `colorOptions`: JSON array of color names

---

#### **RetailProduct**
```prisma
model RetailProduct {
  id         String            @id @default(auto()) @map("_id") @db.ObjectId
  type       RetailProductType // FRAME, SUNGLASS, CONTACT_LENS, ACCESSORY
  brandId    String            @db.ObjectId
  subBrandId String?           @db.ObjectId
  name       String?
  mrp        Float
  hsnCode    String?
  sku        String?
  isActive   Boolean           @default(true)
  createdAt  DateTime          @default(now()) @db.Date
  updatedAt  DateTime          @updatedAt @db.Date
  brand      ProductBrand      @relation(fields: [brandId], references: [id], onDelete: Cascade)
  subBrand   ProductSubBrand?  @relation(fields: [subBrandId], references: [id], onDelete: SetNull)

  @@unique([brandId, subBrandId, name, type])
  @@index([type])
  @@index([brandId])
  @@index([subBrandId])
  @@index([isActive])
  @@index([sku])
}
```

**Purpose**: Retail products (Frames, Sunglasses, Accessories)

**Important**: 
- FRAME and SUNGLASS are manual-entry only (not used in recommendation flow)
- Only CONTACT_LENS and ACCESSORY types are used as SKU products

---

#### **ProductBrand**
```prisma
model ProductBrand {
  id           String              @id @default(auto()) @map("_id") @db.ObjectId
  name         String              @unique
  productTypes RetailProductType[] // Array of types this brand supports
  isActive     Boolean             @default(true)
  createdAt    DateTime            @default(now()) @db.Date
  updatedAt    DateTime            @updatedAt @db.Date
  subBrands    ProductSubBrand[]
  products     RetailProduct[]

  @@index([isActive])
}
```

**Purpose**: Frame/sunglass brands

---

#### **ProductSubBrand**
```prisma
model ProductSubBrand {
  id        String          @id @default(auto()) @map("_id") @db.ObjectId
  brandId   String          @db.ObjectId
  name      String
  isActive  Boolean         @default(true)
  createdAt DateTime        @default(now()) @db.Date
  updatedAt DateTime        @updatedAt @db.Date
  brand     ProductBrand    @relation(fields: [brandId], references: [id], onDelete: Cascade)
  products  RetailProduct[]

  @@unique([brandId, name])
  @@index([brandId])
  @@index([isActive])
}
```

**Purpose**: Frame/sunglass sub-brands

---

#### **LensBrand**
```prisma
model LensBrand {
  id          String   @id @default(auto()) @map("_id") @db.ObjectId
  name        String   @unique
  description String?
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now()) @db.Date
  updatedAt   DateTime @updatedAt @db.Date

  @@index([isActive])
}
```

**Purpose**: Lens brands

---

### 2.4 Recommendation Models

#### **Question**
```prisma
model Question {
  id               String    @id @default(auto()) @map("_id") @db.ObjectId
  organizationId   String    @db.ObjectId
  key              String
  textEn           String
  textHi           String?
  textHiEn         String?
  text             String?   // Legacy field
  category         String    // EYEGLASSES, SUNGLASSES, etc.
  order            Int
  displayOrder     Int?
  isRequired       Boolean
  allowMultiple    Boolean
  isActive         Boolean
  questionCategory String?
  questionType     String?
  code             String?
  parentAnswerId   String?   @db.ObjectId  // For sub-questions
  createdAt        DateTime? @default(now())
  updatedAt        DateTime  @updatedAt
  options          AnswerOption[]
  subQuestionOf    AnswerOption[] @relation("AnswerSubQuestion")

  @@unique([organizationId, key])
  @@index([organizationId])
  @@index([category])
  @@index([order])
  @@index([isActive])
  @@index([questionCategory])
  @@index([displayOrder])
  @@index([parentAnswerId])
}
```

**Purpose**: Questionnaire questions

**Key Fields**:
- Multi-language: `textEn`, `textHi`, `textHiEn`
- `parentAnswerId`: For sub-questions (legacy support)
- `category`: Product category this question applies to

---

#### **AnswerOption**
```prisma
model AnswerOption {
  id                  String    @id @default(auto()) @map("_id") @db.ObjectId
  questionId          String    @db.ObjectId
  key                 String
  textEn              String
  textHi              String?
  textHiEn            String?
  text                String?   // Legacy field
  icon                String?
  order               Int
  displayOrder        Int?
  triggersSubQuestion Boolean   @default(false)
  subQuestionId       String?   @db.ObjectId
  createdAt           DateTime? @default(now())
  updatedAt           DateTime  @updatedAt
  question            Question  @relation(fields: [questionId], references: [id], onDelete: Cascade)
  subQuestion         Question? @relation("AnswerSubQuestion", fields: [subQuestionId], references: [id], onDelete: SetNull)
  benefitMappings     AnswerBenefit[]

  @@unique([questionId, key])
  @@index([questionId])
  @@index([subQuestionId])
  @@index([triggersSubQuestion])
}
```

**Purpose**: Question answer options

**Key Fields**:
- Multi-language: `textEn`, `textHi`, `textHiEn`
- `triggersSubQuestion`: If true, shows sub-question after selection
- `subQuestionId`: ID of sub-question to show

**Sub-Question Logic**:
- If `triggersSubQuestion: true` and `subQuestionId` set → Sub-question is shown after this option is selected

---

#### **AnswerBenefit**
```prisma
model AnswerBenefit {
  id        String @id @default(auto()) @map("_id") @db.ObjectId
  answerId  String @db.ObjectId
  benefitId String @db.ObjectId
  points    Float  @default(0)  // Benefit points (can be fractional: 1.5, 2.0, 3.0)

  answer    AnswerOption @relation(fields: [answerId], references: [id], onDelete: Cascade)
  benefit   Benefit      @relation(fields: [benefitId], references: [id], onDelete: Cascade)

  @@unique([answerId, benefitId])
  @@index([answerId])
  @@index([benefitId])
}
```

**Purpose**: Maps answer options to benefits with points

**Key Fields**:
- `points`: Benefit points (can be fractional: 1.5, 2.0, 3.0)
- Used in recommendation scoring: `benefitScore += userBenefitScore * productBenefitScore`

---

#### **BenefitFeature** (Unified Master)
```prisma
model BenefitFeature {
  id             String  @id @default(auto()) @map("_id") @db.ObjectId
  type           String  // 'BENEFIT' or 'FEATURE'
  code           String  // B01..B12 for benefits, F01..F11 for features
  name           String
  description    String?
  // Benefit-specific
  pointWeight    Float?  @default(1.0)
  maxScore       Float?  @default(3.0)
  // Feature-specific
  category       String? // DURABILITY, COATING, PROTECTION, LIFESTYLE, VISION
  displayOrder   Int?
  // Common
  isActive       Boolean @default(true)
  organizationId String? @db.ObjectId  // null for global features (F01-F11)

  @@unique([code, organizationId])
  @@index([type])
  @@index([organizationId])
  @@index([isActive])
  @@index([category])
  @@index([displayOrder])
}
```

**Purpose**: Unified master for Benefits and Features

**Key Fields**:
- `type`: 'BENEFIT' or 'FEATURE'
- `code`: B01-B12 for benefits, F01-F11 for features
- `organizationId`: null for global features, required for benefits

**Benefits**:
- B01-B12: Organization-specific
- `pointWeight`: Global importance weight
- `maxScore`: Usually 3.0

**Features**:
- F01-F11: Global (no organizationId)
- `category`: DURABILITY, COATING, PROTECTION, LIFESTYLE, VISION
- `displayOrder`: Order for display

---

#### **ProductBenefit**
```prisma
model ProductBenefit {
  id        String      @id @default(auto()) @map("_id") @db.ObjectId
  productId String      @db.ObjectId
  benefitId String      @db.ObjectId
  score     Float       @default(0)  // 0-3 scale
  createdAt DateTime    @default(now()) @db.Date
  updatedAt DateTime    @updatedAt @db.Date
  product   LensProduct @relation(fields: [productId], references: [id], onDelete: Cascade)
  benefit   Benefit     @relation(fields: [benefitId], references: [id], onDelete: Cascade)

  @@unique([productId, benefitId])
  @@index([productId])
  @@index([benefitId])
}
```

**Purpose**: Maps products to benefits with scores

**Key Fields**:
- `score`: 0-3 scale (product's benefit strength)

**Scoring Formula**:
```typescript
benefitScore += (userBenefitScore * productBenefitScore)
// where userBenefitScore comes from AnswerBenefit.points
// and productBenefitScore comes from ProductBenefit.score
```

---

#### **ProductFeature**
```prisma
model ProductFeature {
  id        String      @id @default(auto()) @map("_id") @db.ObjectId
  productId String      @db.ObjectId
  featureId String      @db.ObjectId
  createdAt DateTime    @default(now()) @db.Date
  updatedAt DateTime    @updatedAt @db.Date
  product   LensProduct @relation(fields: [productId], references: [id], onDelete: Cascade)
  feature   Feature     @relation(fields: [featureId], references: [id], onDelete: Cascade)

  @@unique([productId, featureId])
  @@index([productId])
  @@index([featureId])
}
```

**Purpose**: Maps products to features

**Note**: Features are used for display/filtering, not scoring (scoring is benefit-based only)

---

#### **ProductSpecification**
```prisma
model ProductSpecification {
  id        String      @id @default(auto()) @map("_id") @db.ObjectId
  productId String      @db.ObjectId
  group     String?
  key       String
  value     String
  createdAt DateTime    @default(now()) @db.Date
  updatedAt DateTime    @updatedAt @db.Date
  product   LensProduct @relation(fields: [productId], references: [id], onDelete: Cascade)

  @@index([productId])
  @@index([group])
}
```

**Purpose**: Product specifications (key-value pairs)

---

### 2.5 Offer Models

#### **OfferRule**
```prisma
model OfferRule {
  id                 String          @id @default(auto()) @map("_id") @db.ObjectId
  organizationId     String          @db.ObjectId
  code               String
  offerType          String          // YOPO, COMBO_PRICE, FREE_LENS, PERCENT_OFF, FLAT_OFF, BOG50, CATEGORY_DISCOUNT, BONUS_FREE_PRODUCT
  config             OfferRuleConfig // Typed JSON
  frameBrands        String[]
  frameSubCategories String[]
  minFrameMRP        Float?
  maxFrameMRP        Float?
  lensBrandLines     String[]
  lensItCodes        String[]
  priority           BigInt
  isActive           Boolean
  upsellEnabled      Boolean
  upsellThreshold    Json?           // JSON field
  upsellRewardText   Json?           // JSON field
  createdAt          DateTime        @db.Date
  updatedAt          DateTime        @db.Date

  @@unique([organizationId, code])
  @@index([organizationId])
  @@index([isActive])
  @@index([priority])
  @@index([offerType])
}
```

**Purpose**: Primary offer rules

**Config Type**:
```prisma
type OfferRuleConfig {
  comboPrice        Int?
  discountType      String?
  discountValue     Int?
  isSecondPairRule  Boolean?
  secondPairPercent Int?
  comboType         String?  // FIXED, FRAME_MRP_ONLY, BRAND_LINE_COMBO, etc.
  freeUnderYOPO     String?  // BEST_OF, FRAME, LENS
  bonusFreeAllowed  Boolean?
  triggerMinBill    Float?
  bonusLimit        Float?
  bonusCategory     String?
  eligibleBrands    String[]?
  eligibleCategories String[]?
  // ... other config fields
}
```

**Offer Types**:
- `YOPO`: You Pay One (higher of frame or lens)
- `COMBO_PRICE`: Fixed combo price
- `FREE_LENS`: Free lens offer
- `PERCENT_OFF`: Percentage discount
- `FLAT_OFF`: Flat amount discount
- `BOG50`: Buy One Get 50% Off
- `CATEGORY_DISCOUNT`: Category-based discount
- `BONUS_FREE_PRODUCT`: Bonus free product

---

#### **CategoryDiscount**
```prisma
model CategoryDiscount {
  id               String   @id @default(auto()) @map("_id") @db.ObjectId
  organizationId   String   @db.ObjectId
  customerCategory String   // STUDENT, DOCTOR, TEACHER, ARMED_FORCES, SENIOR_CITIZEN, CORPORATE, REGULAR
  brandCode        String   // Brand code or '*' for universal
  discountPercent  Float
  maxDiscount      Float
  isActive         Boolean
  createdAt        DateTime @db.Date
  updatedAt        DateTime @db.Date

  @@unique([organizationId, customerCategory, brandCode])
  @@index([organizationId])
  @@index([customerCategory])
  @@index([isActive])
}
```

**Purpose**: Customer category discounts

**Key Fields**:
- `brandCode`: Brand-specific or '*' for universal
- `discountPercent`: Discount percentage
- `maxDiscount`: Maximum discount amount

---

#### **Coupon**
```prisma
model Coupon {
  id             String    @id @default(auto()) @map("_id") @db.ObjectId
  organizationId String    @db.ObjectId
  code           String
  discountType   String    // PERCENTAGE, FLAT_AMOUNT
  discountValue  Float
  maxDiscount    Float?
  minCartValue   Float?
  validFrom      DateTime  @db.Date
  validUntil     DateTime? @db.Date
  usageLimit     Int?
  usedCount      BigInt    @default(0)
  isActive       Boolean   @default(true)
  createdAt      DateTime  @default(now()) @db.Date
  updatedAt      DateTime  @updatedAt @db.Date

  @@unique([organizationId, code])
  @@index([organizationId])
  @@index([isActive])
  @@index([code])
}
```

**Purpose**: Coupon codes

**Key Fields**:
- `discountType`: PERCENTAGE or FLAT_AMOUNT
- `usageLimit`: Maximum usage count
- `usedCount`: Current usage count
- `minCartValue`: Minimum cart value required

---

#### **StoreOfferMap**
```prisma
model StoreOfferMap {
  id            String    @id @default(auto()) @map("_id") @db.ObjectId
  storeId       String    @db.ObjectId
  offerRuleId   String    @db.ObjectId
  isActive      Boolean   @default(true)
  activatedAt   DateTime  @default(now()) @db.Date
  deactivatedAt DateTime? @db.Date
  createdAt     DateTime  @default(now()) @db.Date
  updatedAt     DateTime  @updatedAt @db.Date

  @@unique([storeId, offerRuleId])
  @@index([storeId])
  @@index([offerRuleId])
  @@index([isActive])
}
```

**Purpose**: Store-specific offer activation

**Key Fields**:
- Links stores to offer rules
- Controls which offers are active per store

---

### 2.6 Store Product Model

#### **StoreProduct**
```prisma
model StoreProduct {
  id            String   @id @default(auto()) @map("_id") @db.ObjectId
  storeId       String   @db.ObjectId
  productId     String   @db.ObjectId
  priceOverride Float?
  stockQuantity BigInt
  isAvailable   Boolean
  createdAt     DateTime @db.Date
  updatedAt     DateTime @db.Date

  @@unique([storeId, productId])
  @@index([storeId])
  @@index([productId])
  @@index([isAvailable])
}
```

**Purpose**: Store-specific pricing and stock

**Key Fields**:
- `priceOverride`: Store-specific price (overrides product base price)
- `stockQuantity`: Stock quantity
- `isAvailable`: Availability status

---

### 2.7 Tint & Coating Models

#### **TintColor**
```prisma
model TintColor {
  id              String                 @id @default(auto()) @map("_id") @db.ObjectId
  code            String                 @unique
  name            String
  hexColor        String?
  imageUrl        String?
  category        TintColorCategory      // SOLID, GRADIENT, FASHION
  darknessPercent Int
  isPolarized     Boolean                @default(false)
  isMirror        Boolean                @default(false)
  isActive        Boolean                @default(true)
  displayOrder    Int                    @default(0)
  createdAt       DateTime               @default(now()) @db.Date
  updatedAt       DateTime               @updatedAt @db.Date
  lensProducts    LensProductTintColor[]

  @@index([isActive])
  @@index([displayOrder])
  @@index([category])
}
```

**Purpose**: Tint color master

---

#### **MirrorCoating**
```prisma
model MirrorCoating {
  id           String                     @id @default(auto()) @map("_id") @db.ObjectId
  code         String                     @unique
  name         String
  imageUrl     String?
  addOnPrice   Float                      @default(0)
  isActive     Boolean                    @default(true)
  displayOrder Int                        @default(0)
  createdAt    DateTime                   @default(now()) @db.Date
  updatedAt    DateTime                   @updatedAt @db.Date
  lensProducts LensProductMirrorCoating[]

  @@index([isActive])
  @@index([displayOrder])
}
```

**Purpose**: Mirror coating master

---

#### **LensProductTintColor**
```prisma
model LensProductTintColor {
  id          String      @id @default(auto()) @map("_id") @db.ObjectId
  lensId      String      @db.ObjectId
  tintColorId String      @db.ObjectId
  lens        LensProduct @relation(fields: [lensId], references: [id], onDelete: Cascade)
  tintColor   TintColor   @relation(fields: [tintColorId], references: [id], onDelete: Cascade)

  @@unique([lensId, tintColorId])
  @@index([lensId])
  @@index([tintColorId])
}
```

**Purpose**: Many-to-many: Lens products ↔ Tint colors

---

#### **LensProductMirrorCoating**
```prisma
model LensProductMirrorCoating {
  id              String        @id @default(auto()) @map("_id") @db.ObjectId
  lensId          String        @db.ObjectId
  mirrorCoatingId String        @db.ObjectId
  lens            LensProduct   @relation(fields: [lensId], references: [id], onDelete: Cascade)
  mirrorCoating   MirrorCoating @relation(fields: [mirrorCoatingId], references: [id], onDelete: Cascade)

  @@unique([lensId, mirrorCoatingId])
  @@index([lensId])
  @@index([mirrorCoatingId])
}
```

**Purpose**: Many-to-many: Lens products ↔ Mirror coatings

---

### 2.8 Legacy Models (Deprecated)

#### **Benefit** (Deprecated)
```prisma
model Benefit {
  id             String           @id @default(auto()) @map("_id") @db.ObjectId
  organizationId String           @db.ObjectId
  code           String           @unique  // B01..B12
  name           String
  description    String?
  pointWeight    Float            @default(1.0)
  maxScore       Float            @default(3.0)
  isActive       Boolean          @default(true)
  createdAt      DateTime         @default(now()) @db.Date
  updatedAt      DateTime         @updatedAt @db.Date
  AnswerBenefit  AnswerBenefit[]
  ProductBenefit ProductBenefit[]
  FeatureBenefit FeatureBenefit[]

  @@unique([organizationId, code])
  @@index([organizationId])
  @@index([isActive])
}
```

**Status**: Deprecated - Use `BenefitFeature` with `type='BENEFIT'`

---

#### **Feature** (Deprecated)
```prisma
model Feature {
  id             String           @id @default(auto()) @map("_id") @db.ObjectId
  code           String           @unique  // F01..F11
  name           String
  description    String?
  category       String           // DURABILITY, COATING, PROTECTION, LIFESTYLE, VISION
  displayOrder   Int
  isActive       Boolean          @default(true)
  createdAt      DateTime         @default(now()) @db.Date
  updatedAt      DateTime         @updatedAt @db.Date
  ProductFeature ProductFeature[]
  FeatureBenefit FeatureBenefit[]

  @@index([category])
  @@index([isActive])
  @@index([displayOrder])
}
```

**Status**: Deprecated - Use `BenefitFeature` with `type='FEATURE'`

---

#### **FeatureBenefit** (Deprecated)
```prisma
model FeatureBenefit {
  id        String   @id @default(auto()) @map("_id") @db.ObjectId
  benefitId String   @db.ObjectId
  featureId String   @db.ObjectId
  weight    Float    @default(1.0)
  createdAt DateTime @default(now()) @db.Date
  updatedAt DateTime @updatedAt @db.Date
  benefit   Benefit  @relation(fields: [benefitId], references: [id], onDelete: Cascade)
  feature   Feature  @relation(fields: [featureId], references: [id], onDelete: Cascade)

  @@unique([featureId, benefitId])
  @@index([featureId])
  @@index([benefitId])
}
```

**Status**: Deprecated - Not used in current implementation

---

#### **FeatureMapping** (Deprecated)
```prisma
model FeatureMapping {
  id         String @id @default(auto()) @map("_id") @db.ObjectId
  featureId  String @db.ObjectId
  optionKey  String
  questionId String @db.ObjectId
  weight     Float

  @@unique([questionId, optionKey, featureId])
  @@index([questionId])
  @@index([featureId])
}
```

**Status**: Deprecated - Not used in current implementation

---

#### **Prescription** (Incomplete Schema)
```prisma
model Prescription {
  id            String @id @default(auto()) @map("_id") @db.ObjectId
  createdAt     Json?  // JSON field (incomplete)
  customerPhone Json?  // JSON field (incomplete)
  sessionId     Json?  // JSON field (incomplete)

  @@index([sessionId])
  @@index([customerPhone])
  @@index([createdAt])
}
```

**Status**: Schema incomplete - Prescription data stored in `Session.customerEmail` JSON field instead

---

#### **Staff** (Incomplete Schema)
```prisma
model Staff {
  id      String @id @default(auto()) @map("_id") @db.ObjectId
  status  Json?  // JSON field (incomplete)
  storeId Json?  // JSON field (incomplete)

  @@index([storeId])
  @@index([status])
}
```

**Status**: Schema incomplete - Fields stored as JSON

---

## 3. Data Flow Diagrams

### 3.1 Recommendation Generation Flow

```
Session
  ↓
SessionAnswer (answers)
  ↓
AnswerOption (option IDs)
  ↓
AnswerBenefit (benefit mappings with points)
  ↓
BenefitFeature (benefit codes)
  ↓
Benefit Scores Map: { B01: 2.5, B04: 1.0, ... }
  ↓
LensProduct (candidate products)
  ↓
ProductBenefit (product-benefit mappings with scores 0-3)
  ↓
Scoring: benefitScore = Σ(userBenefitScore × productBenefitScore)
  ↓
Index Recommendation (based on prescription + frame type)
  ↓
StoreProduct (price override, stock)
  ↓
Offer Calculation (via OfferEngineService)
  ↓
Final Recommendations (with match %, pricing, offers)
```

---

### 3.2 Offer Calculation Flow

```
Order Input (frame, lens, customerCategory, couponCode)
  ↓
Base Total = Frame MRP + Lens Price
  ↓
Find Applicable Primary Rule (COMBO > YOPO > FREE_LENS > PERCENT > FLAT)
  ↓
Apply Primary Rule
  ├─ COMBO_PRICE → Fixed price (locks further)
  ├─ YOPO → Higher of frame/lens (locks further)
  ├─ FREE_LENS → Frame MRP only
  ├─ PERCENT_OFF → Percentage discount
  └─ FLAT_OFF → Flat discount
  ↓
Effective Base = Base Total - Primary Discount
  ↓
Apply Second Pair Discount (if applicable)
  ↓
Apply Category Discount (by customerCategory + brandCode)
  ↓
Apply Coupon Discount (validate code, usage, minCartValue)
  ↓
Calculate Upsell Suggestions (if enabled)
  ↓
Final Payable = Effective Base - All Discounts
```

---

### 3.3 Contact Lens Power Validation Flow

```
Contact Lens Power Input
  ↓
Fetch All Active ContactLensProduct
  ↓
For Each Product:
  ├─ Check SPH Range (sphMin <= sph <= sphMax)
  ├─ Check CYL Range (cylMin <= |cyl| <= cylMax)
  ├─ Check AXIS Steps (axis in axisSteps array)
  ├─ Check ADD Range (addMin <= add <= addMax)
  └─ Check Lens Type Compatibility
      ├─ SPHERICAL → CYL must be 0
      ├─ TORIC → CYL required
      └─ MULTIFOCAL → ADD required
  ↓
Filter: Eligible vs Ineligible
  ↓
Return Eligible Products + Error Messages
```

---

### 3.4 Question-Answer-Benefit Mapping Flow

```
Question
  ↓
AnswerOption (multiple options)
  ↓
AnswerBenefit (maps each option to benefits with points)
  ├─ Option 1 → B01: 2.0 points, B04: 1.5 points
  ├─ Option 2 → B02: 3.0 points
  └─ Option 3 → B01: 1.0 points, B05: 2.0 points
  ↓
Customer Selects Options
  ↓
Aggregate Benefit Scores:
  ├─ B01: 2.0 + 1.0 = 3.0
  ├─ B02: 3.0
  ├─ B04: 1.5
  └─ B05: 2.0
  ↓
Product Scoring:
  ├─ Product A: B01 score=2, B02 score=3
  │   → benefitScore = (3.0 × 2) + (3.0 × 3) = 15.0
  └─ Product B: B01 score=1, B04 score=2
      → benefitScore = (3.0 × 1) + (1.5 × 2) = 6.0
  ↓
Rank Products by benefitScore
```

---

## 4. Key Data Relationships

### 4.1 Recommendation Chain

```
Session
  ├─→ SessionAnswer (many)
  │     └─→ AnswerOption
  │           └─→ AnswerBenefit (many)
  │                 └─→ Benefit (via BenefitFeature)
  │
  └─→ SessionRecommendation (many)
        └─→ LensProduct (or RetailProduct)
              ├─→ ProductBenefit (many)
              │     └─→ Benefit (via BenefitFeature)
              ├─→ ProductFeature (many)
              │     └─→ Feature (via BenefitFeature)
              └─→ StoreProduct
```

---

### 4.2 Offer Chain

```
Order
  ├─→ Store
  │     └─→ Organization
  │           └─→ OfferRule (many)
  │                 └─→ StoreOfferMap (activation)
  │
  ├─→ CategoryDiscount (by customerCategory)
  └─→ Coupon (by code)
```

---

### 4.3 Product Chain

```
LensProduct
  ├─→ LensBrand (via brandLine lookup)
  ├─→ LensRxRange (many) - Power ranges
  ├─→ ProductBenefit (many)
  │     └─→ Benefit (via BenefitFeature)
  ├─→ ProductFeature (many)
  │     └─→ Feature (via BenefitFeature)
  ├─→ ProductSpecification (many)
  ├─→ LensProductTintColor (many)
  │     └─→ TintColor
  └─→ LensProductMirrorCoating (many)
        └─→ MirrorCoating
```

---

## 5. Data Storage Patterns

### 5.1 JSON Field Usage

**Session.customerEmail** (JSON):
```typescript
{
  prescription: {
    rSph: number;
    rCyl: number;
    lSph: number;
    lCyl: number;
    add: number;
  };
  frame: {
    brand: string;
    subBrand: string;
    mrp: number;
    frameType: string;
  };
}
```

**Session.prescriptionId** (JSON):
- Incomplete schema - not used

**Order.assistedByStaffId** (JSON):
- Staff ID stored as JSON (schema incomplete)

**Order.assistedByName** (JSON):
- Staff name stored as JSON (schema incomplete)

**OrderOfferData** (Typed JSON):
- All offer calculation results stored as typed JSON
- Includes: categoryDiscount, couponDiscount, offersApplied, etc.

---

### 5.2 Array Field Usage

**OfferRule.frameBrands**: `String[]`
- Array of frame brand names

**OfferRule.frameSubCategories**: `String[]`
- Array of frame sub-category names

**OfferRule.lensBrandLines**: `String[]`
- Array of lens brand line codes

**OfferRule.lensItCodes**: `String[]`
- Array of lens IT codes (SKUs)

**ContactLensProduct.axisSteps**: `String?` (JSON array)
- Stored as JSON string: `"[0, 90, 180]"`
- Parsed when used

**ContactLensProduct.colorOptions**: `String?` (JSON array)
- Stored as JSON string: `'["Blue", "Green", "Brown"]'`
- Parsed when used

---

## 6. Index Strategy

### 6.1 Primary Indexes

**Session**:
- `storeId`, `userId`, `status`, `startedAt`, `category`, `prescriptionId`

**Order**:
- `storeId`, `status`, `createdAt`, `assistedByStaffId`, `orderType`

**LensProduct**:
- `brandLine`, `visionType`, `lensIndex`, `category`, `isActive`, `yopoEligible`

**Question**:
- `organizationId`, `category`, `order`, `isActive`, `questionCategory`, `displayOrder`, `parentAnswerId`

**AnswerOption**:
- `questionId`, `subQuestionId`, `triggersSubQuestion`

**AnswerBenefit**:
- `answerId`, `benefitId`

**ProductBenefit**:
- `productId`, `benefitId`

**OfferRule**:
- `organizationId`, `isActive`, `priority`, `offerType`

**StoreOfferMap**:
- `storeId`, `offerRuleId`, `isActive`

---

## 7. Data Validation Rules

### 7.1 Uniqueness Constraints

- **Organization.code**: Unique
- **Store**: `[organizationId, code]` unique
- **User**: `[organizationId, email]` unique
- **Question**: `[organizationId, key]` unique
- **AnswerOption**: `[questionId, key]` unique
- **BenefitFeature**: `[code, organizationId]` unique
- **LensProduct.itCode**: Unique
- **ContactLensProduct.skuCode**: Unique
- **Order**: No uniqueness (multiple orders allowed)
- **AnswerBenefit**: `[answerId, benefitId]` unique
- **ProductBenefit**: `[productId, benefitId]` unique
- **ProductFeature**: `[productId, featureId]` unique

---

### 7.2 Cascade Deletes

- **AnswerOption** → Deletes `AnswerBenefit` mappings
- **Question** → Deletes `AnswerOption` (cascade)
- **LensProduct** → Deletes `LensRxRange`, `ProductBenefit`, `ProductFeature`, `ProductSpecification`, `LensProductTintColor`, `LensProductMirrorCoating`
- **Benefit** → Deletes `AnswerBenefit`, `ProductBenefit`, `FeatureBenefit`
- **Feature** → Deletes `ProductFeature`, `FeatureBenefit`

---

## 8. Data Access Patterns

### 8.1 Recommendation Query Pattern

```typescript
// 1. Get session
const session = await prisma.session.findUnique({ where: { id: sessionId } });

// 2. Get answers
const answers = await prisma.sessionAnswer.findMany({ where: { sessionId } });

// 3. Get answer-benefit mappings
const answerBenefits = await prisma.answerBenefit.findMany({
  where: { answerId: { in: optionIds } }
});

// 4. Get benefits
const benefits = await prisma.benefitFeature.findMany({
  where: { id: { in: benefitIds }, type: 'BENEFIT' }
});

// 5. Get products
const products = await prisma.lensProduct.findMany({
  where: { isActive: true, visionType }
});

// 6. Get product-benefit mappings
const productBenefits = await prisma.productBenefit.findMany({
  where: { productId: { in: productIds } }
});

// 7. Get store pricing
const storeProducts = await prisma.storeProduct.findMany({
  where: { storeId, productId: { in: productIds } }
});
```

---

### 8.2 Offer Query Pattern

```typescript
// 1. Find primary rule
const primaryRule = await prisma.offerRule.findFirst({
  where: {
    organizationId,
    isActive: true,
    offerType: { in: ['COMBO_PRICE', 'YOPO', ...] },
    frameBrands: { has: frame.brand },
    lensBrandLines: { has: lens.brandLine },
    // ... other filters
  },
  orderBy: { priority: 'desc' }
});

// 2. Find category discount
const catDiscount = await prisma.categoryDiscount.findFirst({
  where: {
    organizationId,
    customerCategory,
    brandCode: { in: [brand, '*'] },
    isActive: true,
  }
});

// 3. Find coupon
const coupon = await prisma.coupon.findFirst({
  where: {
    organizationId,
    code: couponCode,
    isActive: true,
    validFrom: { lte: now },
    validUntil: { gte: now },
  }
});
```

---

## 9. Data Migration Notes

### 9.1 Unified BenefitFeature Migration

**Status**: Migration script exists (`scripts/migrate-to-unified-benefit-feature.ts`)

**Process**:
1. Migrate `Benefit` → `BenefitFeature` (type='BENEFIT')
2. Migrate `Feature` → `BenefitFeature` (type='FEATURE')
3. Update `AnswerBenefit` to reference `BenefitFeature`
4. Update `ProductBenefit` to reference `BenefitFeature`
5. Update `ProductFeature` to reference `BenefitFeature`

**Legacy Models**: Still exist in schema (marked deprecated) but not used in new code

---

## 10. Schema Limitations & Workarounds

### 10.1 Missing Relations

**Issue**: Some models don't have Prisma relations defined

**Workarounds**:
- Manual queries using IDs
- JSON fields for nested data (e.g., `Session.customerEmail`)

### 10.2 Incomplete Schemas

**Prescription Model**:
- Fields stored as JSON
- Actual prescription data stored in `Session.customerEmail`

**Staff Model**:
- Fields stored as JSON
- Actual staff data queried separately

### 10.3 Type Casting

**Prisma Client Type Issues**:
- Some models require `(prisma as any).modelName` casting
- Examples: `contactLensProduct`, `lensProduct`, `benefitFeature`

---

## 11. Data Integrity Rules

### 11.1 Business Rules Enforced in Code

**1. Frame & Sunglass Handling**:
- Frames are NOT SKU products
- No `RetailProduct` queries for FRAME/SUNGLASS in recommendation flow
- Frames stored in `Order.frameData` (manual entry)

**2. Staff Selection**:
- Mandatory for STAFF_ASSISTED mode (validated in order creation)

**3. Index Rules**:
- Rimless → INDEX_160+ mandatory (enforced in `IndexRecommendationService`)
- Power-based escalation (enforced in recommendation logic)

**4. Contact Lens Power**:
- Validated against product ranges (enforced in search API)

**5. Offer Priority**:
- COMBO > YOPO > FREE_LENS > PERCENT > FLAT (enforced in offer engine)

---

## 12. Data Flow Summary

### 12.1 Customer Flow Data

```
1. Store Verification
   → Store record fetched
   → Store info saved to session-store

2. Session Creation
   → Session record created
   → Prescription/frame data stored in Session.customerEmail (JSON)

3. Questionnaire Answers
   → SessionAnswer records created (one per option)
   → Answers linked to questions and options

4. Recommendations
   → AnswerBenefit mappings queried
   → Benefit scores calculated
   → Products scored and ranked
   → SessionRecommendation records created (cached)

5. Order Creation
   → Order record created
   → Frame/lens/offer data stored in typed JSON fields
   → Barcode = Order ID (no SKUs stored)
```

---

### 12.2 Admin Flow Data

```
1. Question Creation
   → Question record created
   → AnswerOption records created
   → AnswerBenefit mappings created (from benefitMapping)

2. Product Creation
   → LensProduct/ContactLensProduct created
   → ProductBenefit mappings created
   → ProductFeature mappings created
   → LensRxRange records created

3. Offer Rule Creation
   → OfferRule record created
   → StoreOfferMap records created (store activation)

4. Benefit/Feature Creation
   → BenefitFeature record created (unified master)
```

---

**End of Part 4: Database Schema & Data Flow**

---

## Complete Documentation Summary

**Part 1**: System Overview & Architecture
- Technology stack
- Project structure
- Application flows
- Core business concepts
- Key services overview

**Part 2**: Frontend Implementation
- All pages and components
- State management
- User flows
- UI components
- Language support

**Part 3**: Backend Implementation
- All APIs and endpoints
- Business logic services
- Offer engine
- Recommendation engine
- Validation logic

**Part 4**: Database Schema & Data Flow
- Complete schema documentation
- Data relationships
- Data flow diagrams
- Access patterns

**All documentation is based on actual codebase analysis - no assumptions made.**
