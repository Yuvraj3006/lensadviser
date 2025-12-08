# 🔍 Backend Specification vs Current Codebase - Detailed Comparison

## 📋 **TECH STACK DIFFERENCES**

| Aspect | Specification | Current Implementation | Action |
|--------|--------------|----------------------|--------|
| Framework | NestJS (modular, DI) | Next.js (API routes) | ✅ Keep Next.js (different approach, same functionality) |
| Database | PostgreSQL | MongoDB Atlas | ✅ Keep MongoDB (user preference) |
| ORM | Prisma | Prisma | ✅ Match |
| Auth | JWT-based | JWT-based | ✅ Match |

---

## 🗄️ **DATA MODEL COMPARISON**

### **1. ENUMS - Missing/Incomplete**

| Spec Enum | Current Status | Missing Values | Action |
|-----------|---------------|----------------|--------|
| `FeatureCategory` | ❌ MISSING | DURABILITY, COATING, PROTECTION, LIFESTYLE, VISION | ✅ Add |
| `BrandLine` | ⚠️ PARTIAL | Missing: DURASHIELD_NATURE, BLUEXPERT_ADVANCED, CITYLIFE, VISIONX_ULTRA, VISIONX_NEO, PUREVIEW, HARDX, RELAX_PLUS, MYOCONTROL_INTRO, MYOCONTROL_ADVANCED, TINT_NEXT, TINT_PREMIUM, TINT_ESSENTIAL, IGNITE_BLUEBAN, IGNITE_NATURE, IGNITE_DRIVE, IGNITE_DIGITAL, IGNITE_GOLD, IGNITE_PLATINUM | ✅ Add missing |
| `VisionType` | ❌ MISSING | SINGLE_VISION, PROGRESSIVE, BIFOCAL, ANTI_FATIGUE, MYOPIA_CONTROL | ✅ Add |
| `LensIndex` | ❌ MISSING | INDEX_156, INDEX_160, INDEX_167, INDEX_174 | ✅ Add |
| `TintOption` | ❌ MISSING | CLEAR, TINT, PHOTOCHROMIC | ✅ Add |
| `QuestionCategory` | ❌ MISSING | USAGE, PROBLEMS, ENVIRONMENT, LIFESTYLE, BUDGET | ✅ Add |
| `QuestionType` | ⚠️ PARTIAL | Using `allowMultiple` boolean, need explicit SINGLE_SELECT, MULTI_SELECT, SLIDER | ✅ Add enum |
| `SpecificationGroup` | ❌ MISSING | OPTICAL_DESIGN, MATERIAL, COATING, INDEX_USAGE, LIFESTYLE_TAG | ✅ Add |

---

### **2. MODELS - Missing/Incomplete**

#### **2.1 LensProduct vs Product**

| Spec Model | Current Model | Differences | Action |
|-----------|--------------|-------------|--------|
| `LensProduct` | `Product` | Spec has: visionType, lensIndex, tintOption, mrp, offerPrice, addOnPrice, sphMin, sphMax, cylMax, addMin, addMax, deliveryDays, warranty | ✅ Add missing fields to Product |

**Spec Fields Missing:**
- `visionType: VisionType`
- `lensIndex: LensIndex`
- `tintOption: TintOption`
- `mrp: Float` (separate from basePrice)
- `offerPrice: Float` (separate from basePrice)
- `addOnPrice: Float?`
- `sphMin: Float`
- `sphMax: Float`
- `cylMax: Float`
- `addMin: Float?`
- `addMax: Float?`
- `deliveryDays: Int`
- `warranty: String?`

#### **2.2 Benefit Model** ❌ MISSING

| Spec Model | Current Status | Action |
|-----------|---------------|--------|
| `Benefit` | ❌ MISSING | ✅ Create model |
| `ProductBenefit` | ❌ MISSING | ✅ Create model |
| `AnswerBenefit` | ❌ MISSING | ✅ Create model |

**Benefit Model Fields:**
```prisma
model Benefit {
  id String @id
  code String @unique
  name String
  description String?
  pointWeight Float
  relatedProblems String[]
  relatedUsage String[]
  products ProductBenefit[]
  questionAnswers AnswerBenefit[]
}
```

#### **2.3 ProductSpecification Model** ❌ MISSING

| Spec Model | Current Status | Action |
|-----------|---------------|--------|
| `ProductSpecification` | ❌ MISSING | ✅ Create model |

**Fields:**
- `key: String`
- `value: String`
- `group: SpecificationGroup`

#### **2.4 ProductAnswerScore Model** ❌ MISSING

| Spec Model | Current Status | Action |
|-----------|---------------|--------|
| `ProductAnswerScore` | ❌ MISSING | ✅ Create model |

**Fields:**
- `productId: String`
- `answerId: String`
- `score: Float` (boost/penalty)

#### **2.5 Question Model - Subquestion Logic** ⚠️ PARTIAL

| Spec Field | Current Status | Action |
|-----------|---------------|--------|
| `parentAnswerId` | ❌ MISSING | ✅ Add field |
| `code` (unique) | ⚠️ Using `key` | ✅ Keep `key` (same purpose) |
| `questionType` | ⚠️ Using `allowMultiple` | ✅ Add `questionType` enum |
| `category` | ⚠️ Using `ProductCategory` | ✅ Add `QuestionCategory` enum |

#### **2.6 Answer Model - Benefit Mapping** ⚠️ PARTIAL

| Spec Field | Current Status | Action |
|-----------|---------------|--------|
| `AnswerBenefit` relation | ❌ MISSING | ✅ Add AnswerBenefit model |

---

## 🔌 **API ENDPOINTS COMPARISON**

### **3.1 Products & Specifications APIs**

| Spec Endpoint | Current Status | Action |
|--------------|---------------|--------|
| `POST /api/admin/products/lenses` | ⚠️ EXISTS (`/api/admin/products`) | ✅ Update to match spec body |
| `PUT /api/admin/products/lenses/:id` | ⚠️ EXISTS | ✅ Update to match spec |
| `GET /api/products/lenses/:itCode` | ✅ EXISTS | ✅ Verify response format |
| `PUT /api/admin/products/lenses/:id/specs` | ❌ MISSING | ✅ Create |
| `PUT /api/admin/products/lenses/:id/features` | ⚠️ PARTIAL | ✅ Update to use featureCodes |
| `PUT /api/admin/products/lenses/:id/benefits` | ❌ MISSING | ✅ Create |
| `PUT /api/admin/products/lenses/:id/answer-scores` | ❌ MISSING | ✅ Create |

### **3.2 Benefits APIs**

| Spec Endpoint | Current Status | Action |
|--------------|---------------|--------|
| `POST /api/admin/benefits` | ❌ MISSING | ✅ Create |
| `GET /api/benefits` | ❌ MISSING | ✅ Create |

### **3.3 Questionnaire APIs**

| Spec Endpoint | Current Status | Action |
|--------------|---------------|--------|
| `POST /api/admin/questionnaire/questions` | ⚠️ EXISTS (`/api/admin/questions`) | ✅ Update to match spec |
| `POST /api/admin/questionnaire/questions/:questionId/answers` | ❌ MISSING | ✅ Create |
| `PUT /api/admin/questionnaire/answers/:answerId/benefits` | ❌ MISSING | ✅ Create |
| `GET /api/questionnaire/questions` | ✅ EXISTS | ✅ Verify response format |

### **3.4 Recommendation API**

| Spec Endpoint | Current Status | Action |
|--------------|---------------|--------|
| `POST /api/questionnaire/recommend` | ⚠️ EXISTS (different logic) | ✅ Update to match spec algorithm |

**Spec Request Body:**
```json
{
  "prescription": { "rSph", "rCyl", "lSph", "lCyl", "add" },
  "frame": { "brand", "subCategory", "mrp", "frameType" },
  "answers": [{ "questionId", "answerIds" }],
  "visionTypeOverride": null,
  "budgetFilter": "STANDARD"
}
```

**Spec Response:**
```json
{
  "recommendedIndex": "INDEX_160",
  "benefitScores": { "SCREEN_PROTECTION": 5.5 },
  "products": [{ "itCode", "finalScore", "benefitComponent", "directBoostComponent", "matchPercent" }]
}
```

---

## 🧮 **RECOMMENDATION ENGINE LOGIC**

### **4. Current vs Spec Algorithm**

| Aspect | Current Implementation | Spec Requirement | Action |
|--------|----------------------|-----------------|--------|
| **Scoring Method** | Feature-based matching | Benefit-based + Answer boost | ✅ Rewrite |
| **Benefit Scores** | ❌ Not calculated | ✅ Compute from AnswerBenefit | ✅ Add |
| **Direct Answer Boosts** | ❌ Not applied | ✅ Apply ProductAnswerScore | ✅ Add |
| **Index Recommendation** | ❌ Not implemented | ✅ Recommend based on power | ✅ Add |
| **Vision Type Inference** | ❌ Not implemented | ✅ Infer from prescription | ✅ Add |
| **RX Range Validation** | ❌ Not implemented | ✅ Filter by sphMin/sphMax | ✅ Add |

**Spec Algorithm Steps:**
1. ✅ Infer vision type from prescription
2. ✅ Recommend index based on power + frame type
3. ✅ Compute benefit scores from answers
4. ✅ Fetch candidate products (filter by RX range, vision type, budget)
5. ✅ Score products: `benefitComponent + directBoostComponent`
6. ✅ Calculate match percent

---

## 💰 **OFFER ENGINE COMPARISON**

### **5. Offer Engine - Mostly Complete** ✅

| Aspect | Current Status | Notes |
|--------|---------------|-------|
| Waterfall Logic | ✅ Complete | Matches spec |
| YOPO Logic | ✅ Complete | Matches spec |
| Combo Price | ✅ Complete | Matches spec |
| Category Discount | ✅ Complete | Matches spec |
| Coupon Discount | ✅ Complete | Matches spec |
| Second Pair | ✅ Complete | Matches spec |

**Minor Differences:**
- Spec uses `LensProduct` model, we use `Product` - ✅ OK (same data)
- API endpoints match ✅

---

## 📊 **SUMMARY OF MISSING ITEMS**

### **Critical Missing (Must Add):**
1. ❌ `Benefit` model + `ProductBenefit` + `AnswerBenefit`
2. ❌ `ProductSpecification` model
3. ❌ `ProductAnswerScore` model
4. ❌ Missing enums: `VisionType`, `LensIndex`, `TintOption`, `QuestionCategory`, `QuestionType`, `FeatureCategory`, `SpecificationGroup`
5. ❌ Missing fields in `Product`: visionType, lensIndex, tintOption, mrp, offerPrice, sphMin, sphMax, cylMax, addMin, addMax, deliveryDays, warranty
6. ❌ Missing field in `Question`: `parentAnswerId` for subquestions
7. ❌ Missing field in `Question`: `questionType` enum
8. ❌ Recommendation engine algorithm (benefit-based scoring)
9. ❌ RX validation service
10. ❌ Index recommendation service
11. ❌ API endpoints for benefits, specs, answer-scores

### **Partial/Needs Update:**
1. ⚠️ `BrandLine` enum - missing many values
2. ⚠️ Product APIs - need to match spec body format
3. ⚠️ Question APIs - need subquestion support
4. ⚠️ Recommendation API - different algorithm

---

## 🎯 **IMPLEMENTATION PRIORITY**

### **Phase 1: Schema Updates (HIGH)**
1. Add missing enums
2. Add Benefit models
3. Add ProductSpecification model
4. Add ProductAnswerScore model
5. Update Product model with lens-specific fields
6. Update Question model with subquestion support

### **Phase 2: Services (HIGH)**
1. Create BenefitService
2. Rewrite RecommendationService (benefit-based)
3. Create RxValidationService
4. Create IndexRecommendationService

### **Phase 3: API Endpoints (MEDIUM)**
1. Benefits CRUD APIs
2. Product specs/benefits/answer-scores APIs
3. Update Question APIs for subquestions
4. Update Recommendation API

### **Phase 4: Testing (MEDIUM)**
1. Test benefit-based recommendation
2. Test RX validation
3. Test index recommendation
4. Test subquestion flow

---

## ✅ **WHAT'S ALREADY CORRECT**

1. ✅ Offer Engine - Complete and matches spec
2. ✅ Basic Product model structure
3. ✅ Question/Answer structure (needs enhancement)
4. ✅ Authentication & Authorization
5. ✅ Organization/Store/User models
6. ✅ Session tracking

---

*Last Updated: Backend Spec Comparison*

