# 🔧 Contact Lens Questionnaire - Accurate Benefit Mapping Solution

## Problem
Hardcoded questions se CL benefits ka mapping accuracy ke saath karna hai. Currently hardcoded benefit codes use ho rahe hain jo database ke actual benefit codes se match nahi karte.

## ✅ Solution Implemented

### 1. **Mapping API Endpoint** (`/api/contact-lens/map-questionnaire-benefits`)
- Hardcoded answers ko database benefit codes (B01, B02, etc.) se map karta hai
- Proper points assign karta hai (0-3 scale)
- Organization-specific benefits ko handle karta hai

### 2. **Updated Questionnaire Page**
- Ab API call karta hai mapping ke liye
- Database benefit codes use karta hai
- Fallback mechanism hai agar API fail ho

### 3. **Updated Recommendations API**
- Proper benefit codes (B01, B02, B03, B04) use karta hai
- Benefit scores ko accurately apply karta hai
- Product attributes ke saath benefit matching karta hai

### 4. **Seed Script** (`prisma/seed-contact-lens-questions.ts`)
- Database mein questions create karta hai
- AnswerBenefit mappings with proper points
- Industry-standard mapping logic

---

## 📊 Benefit Code Mapping

### Standard Benefit Codes (B01-B12)
- **B01**: Comfort / General comfort benefits
- **B02**: High Oxygen / Eye Health (Silicone Hydrogel)
- **B03**: UV Protection
- **B04**: Digital Protection / Anti-Fatigue

### Answer → Benefit Mapping

#### Q1: Wearing Time
- `daily_8plus` → B02 (3.0 pts) + B01 (2.5 pts)
- `daily_4to6` → B01 (2.0 pts)
- `occasional` → B01 (1.5 pts)
- `special_events` → B01 (1.0 pts)

#### Q2: Dryness
- `very_often` → B02 (3.0 pts) + B01 (2.5 pts)
- `sometimes` → B02 (2.0 pts)
- `no` → No specific benefit boost

#### Q3: Priority
- `comfort` → B01 (3.0 pts)
- `eye_health` → B02 (3.0 pts)
- `budget` → B01 (1.5 pts)
- `brand` → B01 (2.0 pts)

#### Q4: Routine
- `office` → B04 (2.5 pts) - Digital protection
- `outdoor` → B03 (3.0 pts) - UV protection
- `mixed` → B03 (2.0 pts) + B04 (2.0 pts)
- `home` → B01 (2.0 pts)

#### Q5: Budget
- `under_1000` → B01 (1.0 pts) - Economy
- `1000_2000` → B01 (2.0 pts) - Standard
- `2000_3500` → B01 (2.5 pts) - Premium
- `no_limit` → B01 (3.0 pts) + B02 (3.0 pts) - Best comfort

---

## 🎯 How It Works

### Step 1: User Answers Questions
Frontend pe hardcoded questions dikhte hain (for now).

### Step 2: Mapping API Called
```typescript
POST /api/contact-lens/map-questionnaire-benefits
{
  answers: {
    wearingTime: 'daily_8plus',
    dryness: 'very_often',
    ...
  }
}
```

### Step 3: API Returns Benefit Scores
```typescript
{
  benefitScores: {
    'B01': 5.5,  // Total points from multiple answers
    'B02': 6.0,
    'B03': 0,
    'B04': 0
  },
  mappedBenefits: ['B01', 'B02']
}
```

### Step 4: Recommendations Use Benefit Scores
Recommendations API in scores ko use karke products score karta hai:
- B01 (Comfort) → Daily modality, high water content
- B02 (High Oxygen) → Silicone hydrogel material
- B03 (UV) → UV protection features
- B04 (Digital) → High water content for screen use

---

## 🔄 Future Improvement: Database-Driven Questions

Agar aap questions ko database se load karna chahte hain (instead of hardcoded):

1. **Run seed script**:
   ```bash
   npx tsx prisma/seed-contact-lens-questions.ts
   ```

2. **Update questionnaire page** to fetch questions from database:
   ```typescript
   const questions = await fetch('/api/public/questionnaire/questions?category=CONTACT_LENSES');
   ```

3. **Use existing recommendation engine** that reads from AnswerBenefit automatically.

---

## ✅ Current Implementation Benefits

1. **Accurate Mapping**: Hardcoded answers ko proper benefit codes se map karta hai
2. **Points System**: Industry-standard points (0-3) use karta hai
3. **Flexible**: Database benefits ke saath automatically sync hota hai
4. **Fallback**: Agar API fail ho, basic mapping use hota hai
5. **Scalable**: Seed script se database questions add kar sakte hain

---

## 📝 Testing

1. Questionnaire complete karein
2. Check localStorage: `lenstrack_cl_questionnaire`
3. Verify `benefitScores` object has proper codes (B01, B02, etc.)
4. Check recommendations match user preferences

---

## 🚀 Next Steps (Optional)

1. Run seed script to create database questions
2. Update questionnaire page to use database questions
3. Add more CL-specific benefits if needed (B13, B14, etc.)
4. Create ProductBenefit mappings for ContactLensProduct
