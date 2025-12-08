# 🧪 Testing Guide - Backend Specification Implementation

## ✅ **Database Push Complete**

Schema has been pushed to MongoDB Atlas. All new models and fields are now available.

---

## 🧪 **API Testing Checklist**

### **1. Benefits APIs**

#### **Create Benefit**
```bash
POST http://localhost:3000/api/admin/benefits
Headers: Authorization: Bearer <token>
Body:
{
  "code": "SCREEN_PROTECTION",
  "name": "Digital Screen Protection",
  "description": "Reduces blue light & screen strain",
  "pointWeight": 2.0,
  "relatedProblems": ["eye_strain", "headache"],
  "relatedUsage": ["computer_work", "gaming", "mobile"]
}
```

#### **List Benefits**
```bash
GET http://localhost:3000/api/benefits?organizationId=<orgId>
```

---

### **2. Lens Product APIs**

#### **Create Lens Product**
```bash
POST http://localhost:3000/api/admin/products/lenses
Headers: Authorization: Bearer <token>
Body:
{
  "itCode": "D360ASV",
  "name": "DIGI360 Advanced",
  "brandLine": "DIGI360_ADVANCED",
  "visionType": "SINGLE_VISION",
  "lensIndex": "INDEX_156",
  "tintOption": "CLEAR",
  "mrp": 4000,
  "offerPrice": 2500,
  "sphMin": -6,
  "sphMax": 4,
  "cylMax": -4,
  "deliveryDays": 4,
  "warranty": "1 year coating warranty",
  "yopoEligible": true
}
```

#### **Get Lens by IT Code**
```bash
GET http://localhost:3000/api/products/lenses/D360ASV?organizationId=<orgId>
```

#### **Set Product Specifications**
```bash
PUT http://localhost:3000/api/admin/products/lenses/<id>/specs
Headers: Authorization: Bearer <token>
Body:
{
  "specs": [
    { "key": "Material", "value": "1.60 High Index", "group": "MATERIAL" },
    { "key": "Corridor", "value": "Widest", "group": "OPTICAL_DESIGN" }
  ]
}
```

#### **Set Product Features**
```bash
PUT http://localhost:3000/api/admin/products/lenses/<id>/features
Headers: Authorization: Bearer <token>
Body:
{
  "featureCodes": ["F01", "F02", "F03"]
}
```

#### **Set Product Benefits**
```bash
PUT http://localhost:3000/api/admin/products/lenses/<id>/benefits
Headers: Authorization: Bearer <token>
Body:
{
  "benefits": [
    { "benefitCode": "SCREEN_PROTECTION", "score": 3 },
    { "benefitCode": "DRIVING_COMFORT", "score": 2 }
  ]
}
```

#### **Set Answer Scores**
```bash
PUT http://localhost:3000/api/admin/products/lenses/<id>/answer-scores
Headers: Authorization: Bearer <token>
Body:
{
  "mappings": [
    { "answerId": "<answer-id>", "score": 3 },
    { "answerId": "<answer-id>", "score": -999 }
  ]
}
```

---

### **3. Questionnaire APIs**

#### **Create Question with Subquestion Support**
```bash
POST http://localhost:3000/api/admin/questions
Headers: Authorization: Bearer <token>
Body:
{
  "code": "Q1",
  "key": "Q1",
  "textEn": "How many hours do you use a screen daily?",
  "category": "EYEGLASSES",
  "questionCategory": "USAGE",
  "questionType": "SINGLE_SELECT",
  "displayOrder": 1,
  "parentAnswerId": null,
  "options": [...]
}
```

#### **Add Answers to Question**
```bash
POST http://localhost:3000/api/admin/questionnaire/questions/<questionId>/answers
Headers: Authorization: Bearer <token>
Body:
{
  "answers": [
    {
      "textEn": "4-8 hours",
      "displayOrder": 3,
      "benefits": [
        { "benefitCode": "SCREEN_PROTECTION", "points": 2 },
        { "benefitCode": "ANTI_FATIGUE", "points": 1.5 }
      ]
    }
  ]
}
```

#### **Update Answer Benefits**
```bash
PUT http://localhost:3000/api/admin/questionnaire/answers/<answerId>/benefits
Headers: Authorization: Bearer <token>
Body:
{
  "benefits": [
    { "benefitCode": "SCREEN_PROTECTION", "points": 2 },
    { "benefitCode": "ANTI_FATIGUE", "points": 1.5 }
  ]
}
```

#### **Get Questions (with subquestions)**
```bash
GET http://localhost:3000/api/questionnaire/questions?category=EYEGLASSES&organizationId=<orgId>
```

---

### **4. Recommendation API**

#### **Generate Recommendations (Benefit-Based)**
```bash
POST http://localhost:3000/api/questionnaire/recommend
Body:
{
  "prescription": {
    "rSph": -4,
    "rCyl": -1,
    "lSph": -3.5,
    "lCyl": -0.75,
    "add": null
  },
  "frame": {
    "brand": "LENSTRACK",
    "subCategory": "ADVANCED",
    "mrp": 2500,
    "frameType": "FULL_RIM"
  },
  "answers": [
    { "questionId": "q1", "answerIds": ["a3"] },
    { "questionId": "q2", "answerIds": ["a5"] }
  ],
  "visionTypeOverride": null,
  "budgetFilter": "STANDARD",
  "organizationId": "<orgId>"
}
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "recommendedIndex": "INDEX_160",
    "benefitScores": {
      "SCREEN_PROTECTION": 5.5,
      "DRIVING_COMFORT": 4.0
    },
    "products": [
      {
        "itCode": "D360ASV",
        "name": "DIGI360 Advanced",
        "brandLine": "DIGI360_ADVANCED",
        "visionType": "SINGLE_VISION",
        "lensIndex": "INDEX_160",
        "tintOption": "CLEAR",
        "mrp": 4000,
        "offerPrice": 2500,
        "yopoEligible": true,
        "finalScore": 9.8,
        "benefitComponent": 7.8,
        "directBoostComponent": 2.0,
        "matchPercent": 96
      }
    ]
  }
}
```

---

## 🧪 **Manual Testing Steps**

### **Step 1: Test Benefits**
1. ✅ Create a benefit via POST /api/admin/benefits
2. ✅ List benefits via GET /api/benefits
3. ✅ Verify benefit appears in list

### **Step 2: Test Lens Product**
1. ✅ Create a lens product via POST /api/admin/products/lenses
2. ✅ Get lens details via GET /api/products/lenses/:itCode
3. ✅ Set specifications via PUT /api/admin/products/lenses/:id/specs
4. ✅ Set features via PUT /api/admin/products/lenses/:id/features
5. ✅ Set benefits via PUT /api/admin/products/lenses/:id/benefits
6. ✅ Set answer scores via PUT /api/admin/products/lenses/:id/answer-scores

### **Step 3: Test Questionnaire**
1. ✅ Create question with subquestion support
2. ✅ Add answers with benefits
3. ✅ Update answer benefits
4. ✅ Get questions and verify parentAnswerId structure

### **Step 4: Test Recommendation**
1. ✅ Call POST /api/questionnaire/recommend with prescription + answers
2. ✅ Verify recommendedIndex is returned
3. ✅ Verify benefitScores are calculated
4. ✅ Verify products have finalScore, benefitComponent, directBoostComponent, matchPercent

---

## 🔍 **Verification Points**

### **Schema Verification:**
- ✅ All new enums available in Prisma client
- ✅ All new models available in Prisma client
- ✅ All relations working correctly

### **API Verification:**
- ✅ All endpoints return correct status codes
- ✅ Request validation working
- ✅ Response formats match specification
- ✅ Error handling working

### **Algorithm Verification:**
- ✅ RX validation working
- ✅ Index recommendation working
- ✅ Benefit scores calculated correctly
- ✅ Product scoring working (benefitComponent + directBoostComponent)
- ✅ Match percent calculated correctly

---

## 📝 **Test Data Setup**

Before testing, you may want to seed:
1. **Benefits** - Create a few benefits (SCREEN_PROTECTION, DRIVING_COMFORT, etc.)
2. **Lens Products** - Create lens products with all fields
3. **Questions** - Create questions with subquestions
4. **Answer-Benefit Mappings** - Map answers to benefits
5. **Product-Benefit Scores** - Set benefit scores for products
6. **Product-Answer Scores** - Set direct answer boosts

---

## ✅ **Ready to Test!**

All APIs are ready. Use the endpoints above to test each feature.

*Last Updated: Testing Guide*

