# Recommendation System Flow - Complete Debug Guide

## Problem: Sab lenses 0% match aa rahe hain

## Complete Flow Diagram

```
1. User completes questionnaire
   ↓
2. API: GET /api/public/questionnaire/sessions/[sessionId]/recommendations
   ↓
3. RecommendationsAdapterService.generateRecommendations(sessionId)
   ↓
4. BenefitRecommendationService.recommend()
   ├─→ computeBenefitScores() - User ke answers se benefit scores calculate
   ├─→ fetchCandidateProducts() - Products fetch karo
   └─→ scoreProducts() - Har product ko score do
   ↓
5. matchPercent calculation:
   matchPercent = (product.finalScore / maxScore) * 100
   ↓
6. Frontend display
```

## Data Flow - Step by Step

### Step 1: Session Answers se Benefit Scores

**File**: `services/benefit-recommendation.service.ts` → `computeBenefitScores()`

**Flow**:
```typescript
1. Session answers se answerIds extract karo
2. AnswerBenefit table se mappings fetch karo:
   - WHERE answerId IN (answerIds)
3. BenefitFeature table se benefit details fetch karo:
   - WHERE id IN (benefitIds) AND type = 'BENEFIT'
4. Benefit scores aggregate karo:
   benefitScores[code] = sum(points * categoryWeight)
```

**Check karne ke liye**:
```sql
-- 1. Session ke answers check karo
SELECT * FROM SessionAnswer WHERE sessionId = 'YOUR_SESSION_ID';

-- 2. AnswerBenefit mappings check karo
SELECT ab.*, ao.text as answerText 
FROM AnswerBenefit ab
JOIN AnswerOption ao ON ab.answerId = ao.id
WHERE ab.answerId IN (
  SELECT optionId FROM SessionAnswer WHERE sessionId = 'YOUR_SESSION_ID'
);

-- 3. Benefits check karo
SELECT bf.* 
FROM BenefitFeature bf
WHERE bf.type = 'BENEFIT' 
AND bf.id IN (
  SELECT DISTINCT benefitId FROM AnswerBenefit 
  WHERE answerId IN (
    SELECT optionId FROM SessionAnswer WHERE sessionId = 'YOUR_SESSION_ID'
  )
);
```

**Problem ho sakta hai**:
- ❌ SessionAnswer records nahi hain
- ❌ AnswerBenefit mappings missing hain
- ❌ BenefitFeature records missing hain ya type = 'BENEFIT' nahi hai
- ❌ organizationId mismatch (benefits organization-specific hain)

### Step 2: Products Fetch

**File**: `services/benefit-recommendation.service.ts` → `fetchCandidateProducts()`

**Flow**:
```typescript
1. LensProduct fetch karo:
   - WHERE visionType = inferredVisionType
   - AND isActive = true
   - AND tintOption IN (...) [if sunglasses]
2. ProductBenefit mappings fetch karo:
   - WHERE productId IN (productIds)
3. BenefitFeature details fetch karo:
   - WHERE id IN (benefitIds) AND type = 'BENEFIT'
4. RX range, frame type, budget filters apply karo
```

**Check karne ke liye**:
```sql
-- 1. Products check karo
SELECT * FROM LensProduct WHERE isActive = true;

-- 2. ProductBenefit mappings check karo
SELECT pb.*, lp.name as productName, lp.itCode
FROM ProductBenefit pb
JOIN LensProduct lp ON pb.productId = lp.id
WHERE pb.productId IN (
  SELECT id FROM LensProduct WHERE isActive = true LIMIT 10
);

-- 3. Benefits check karo
SELECT bf.* 
FROM BenefitFeature bf
WHERE bf.type = 'BENEFIT'
AND bf.id IN (
  SELECT DISTINCT benefitId FROM ProductBenefit
);
```

**Problem ho sakta hai**:
- ❌ LensProduct records nahi hain
- ❌ ProductBenefit mappings missing hain
- ❌ BenefitFeature records missing hain
- ❌ organizationId mismatch

### Step 3: Scoring

**File**: `services/benefit-recommendation.service.ts` → `scoreProducts()`

**Flow**:
```typescript
For each product:
  benefitComponent = 0
  For each product.benefits:
    code = benefit.code
    userBenefitScore = benefitScores[code] || 0
    productBenefitScore = pb.score || 0  // 0-3 scale
    benefitWeight = benefit.pointWeight || 1.0
    benefitComponent += userBenefitScore * productBenefitScore * benefitWeight
  
  finalScore = benefitComponent
```

**Problem ho sakta hai**:
- ❌ `benefitScores` empty hai (Step 1 fail)
- ❌ `product.benefits` empty hai (Step 2 fail)
- ❌ Benefit codes match nahi kar rahe (user ke benefits vs product ke benefits)
- ❌ `productBenefitScore` (pb.score) 0 hai sab products ke liye

### Step 4: Match Percent Calculation

**File**: `services/benefit-recommendation.service.ts` → `recommend()` line 112-125

**Flow**:
```typescript
1. Sort products by finalScore (desc)
2. maxScore = sorted[0]?.finalScore || 1
3. For each product:
   matchPercent = Math.round((product.finalScore / maxScore) * 100)
```

**Problem ho sakta hai**:
- ❌ Sab products ka `finalScore = 0` → `maxScore = 1` → sab ka `matchPercent = 0`
- ❌ `maxScore = 0` → division by zero (but code me `|| 1` hai, so safe)

## Root Cause Analysis

### Most Likely Issues:

1. **AnswerBenefit mappings missing** (70% probability)
   - User ke selected answers ke liye AnswerBenefit records nahi hain
   - Solution: Seed AnswerBenefit data

2. **ProductBenefit mappings missing** (20% probability)
   - Products ke liye ProductBenefit records nahi hain
   - Solution: Seed ProductBenefit data

3. **Benefit codes mismatch** (5% probability)
   - User ke benefits ka code ≠ Product ke benefits ka code
   - Solution: Verify benefit codes match

4. **organizationId mismatch** (5% probability)
   - Benefits organization-specific hain, wrong org se fetch ho rahe hain
   - Solution: Verify organizationId

## Debugging Script

Run this script to check your data:

```typescript
// Check recommendation data for a session
async function debugRecommendation(sessionId: string) {
  // 1. Check session answers
  const answers = await prisma.sessionAnswer.findMany({
    where: { sessionId },
  });
  console.log('Session Answers:', answers.length);
  
  // 2. Check AnswerBenefit mappings
  const optionIds = answers.map(a => a.optionId);
  const answerBenefits = await prisma.answerBenefit.findMany({
    where: { answerId: { in: optionIds } },
  });
  console.log('AnswerBenefit Mappings:', answerBenefits.length);
  
  // 3. Check benefit scores
  const benefitIds = [...new Set(answerBenefits.map(ab => ab.benefitId))];
  const benefits = await prisma.benefitFeature.findMany({
    where: { 
      id: { in: benefitIds },
      type: 'BENEFIT',
    },
  });
  console.log('Benefits Found:', benefits.length);
  console.log('Benefit Codes:', benefits.map(b => b.code));
  
  // 4. Check products
  const products = await prisma.lensProduct.findMany({
    where: { isActive: true },
    take: 5,
  });
  console.log('Active Products:', products.length);
  
  // 5. Check ProductBenefit mappings
  const productIds = products.map(p => p.id);
  const productBenefits = await prisma.productBenefit.findMany({
    where: { productId: { in: productIds } },
  });
  console.log('ProductBenefit Mappings:', productBenefits.length);
  
  // 6. Check product benefits
  const productBenefitIds = [...new Set(productBenefits.map(pb => pb.benefitId))];
  const productBenefitFeatures = await prisma.benefitFeature.findMany({
    where: {
      id: { in: productBenefitIds },
      type: 'BENEFIT',
    },
  });
  console.log('Product Benefit Codes:', productBenefitFeatures.map(b => b.code));
  
  // 7. Check for code overlap
  const userCodes = new Set(benefits.map(b => b.code));
  const productCodes = new Set(productBenefitFeatures.map(b => b.code));
  const overlap = [...userCodes].filter(code => productCodes.has(code));
  console.log('Matching Benefit Codes:', overlap);
  
  if (overlap.length === 0) {
    console.error('❌ NO MATCHING BENEFIT CODES! This is why matchPercent = 0');
  }
}
```

## Quick Fix Checklist

- [ ] Check SessionAnswer records exist
- [ ] Check AnswerBenefit mappings exist for selected answers
- [ ] Check ProductBenefit mappings exist for products
- [ ] Check BenefitFeature records exist with type = 'BENEFIT'
- [ ] Check organizationId matches in all queries
- [ ] Check benefit codes match between user benefits and product benefits
- [ ] Check ProductBenefit.score values are > 0
- [ ] Check AnswerBenefit.points values are > 0

## Files to Check

1. **Data Seeding**:
   - `prisma/seed-features-benefits.ts` - Benefits seed karta hai
   - Check if AnswerBenefit and ProductBenefit data seeded hai

2. **Recommendation Logic**:
   - `services/benefit-recommendation.service.ts` - Main scoring logic
   - `services/recommendations-adapter.service.ts` - Adapter layer

3. **Database Schema**:
   - `prisma/schema.prisma` - Check AnswerBenefit and ProductBenefit models

## Next Steps

1. Run the debugging script above
2. Check console logs in `benefit-recommendation.service.ts` (already added)
3. Verify database has AnswerBenefit and ProductBenefit data
4. If data missing, run seed scripts or create mappings manually

