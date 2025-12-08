#!/bin/bash

# Comprehensive Backend API Test Script
# Tests all new backend specification endpoints

BASE_URL="http://localhost:3000"
TOKEN=""
ORG_ID=""

echo "🧪 BACKEND SPECIFICATION API TEST SUITE"
echo "=================================================="
echo "Testing against: $BASE_URL"
echo "=================================================="

# Test 1: Authentication
echo ""
echo "🔐 TEST 1: Authentication"
echo "=================================================="

LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@lenstrack.com","password":"admin123"}')

TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.data.token // empty')
ORG_ID=$(echo $LOGIN_RESPONSE | jq -r '.data.user.organizationId // empty')

if [ -n "$TOKEN" ] && [ "$TOKEN" != "null" ]; then
  echo "✅ Login successful"
  echo "   Token: ${TOKEN:0:30}..."
  echo "   Organization ID: $ORG_ID"
else
  echo "❌ Login failed"
  echo "$LOGIN_RESPONSE" | jq '.'
  exit 1
fi

# Test 2: Create Benefit
echo ""
echo "🎯 TEST 2: Create Benefit"
echo "=================================================="

BENEFIT_RESPONSE=$(curl -s -X POST "$BASE_URL/api/admin/benefits" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"code\": \"SCREEN_PROTECTION\",
    \"name\": \"Digital Screen Protection\",
    \"description\": \"Reduces blue light & screen strain\",
    \"pointWeight\": 2.0,
    \"relatedProblems\": [\"eye_strain\", \"headache\"],
    \"relatedUsage\": [\"computer_work\", \"gaming\", \"mobile\"]
  }")

if echo "$BENEFIT_RESPONSE" | jq -e '.success == true' > /dev/null; then
  BENEFIT_ID=$(echo "$BENEFIT_RESPONSE" | jq -r '.data.id')
  echo "✅ Benefit created: $BENEFIT_ID"
else
  echo "❌ Benefit creation failed"
  echo "$BENEFIT_RESPONSE" | jq '.error'
fi

# Test 3: List Benefits
echo ""
echo "📋 TEST 3: List Benefits"
echo "=================================================="

BENEFITS_LIST=$(curl -s -X GET "$BASE_URL/api/benefits?organizationId=$ORG_ID")

if echo "$BENEFITS_LIST" | jq -e '.success == true' > /dev/null; then
  COUNT=$(echo "$BENEFITS_LIST" | jq '.data | length')
  echo "✅ Benefits listed: $COUNT benefits found"
else
  echo "❌ Benefits list failed"
  echo "$BENEFITS_LIST" | jq '.error'
fi

# Test 4: Create Lens Product
echo ""
echo "👓 TEST 4: Create Lens Product"
echo "=================================================="

LENS_RESPONSE=$(curl -s -X POST "$BASE_URL/api/admin/products/lenses" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"itCode\": \"D360ASV\",
    \"name\": \"DIGI360 Advanced\",
    \"brandLine\": \"DIGI360_ADVANCED\",
    \"visionType\": \"SINGLE_VISION\",
    \"lensIndex\": \"INDEX_156\",
    \"tintOption\": \"CLEAR\",
    \"mrp\": 4000,
    \"offerPrice\": 2500,
    \"sphMin\": -6,
    \"sphMax\": 4,
    \"cylMax\": -4,
    \"deliveryDays\": 4,
    \"warranty\": \"1 year coating warranty\",
    \"yopoEligible\": true
  }")

if echo "$LENS_RESPONSE" | jq -e '.success == true' > /dev/null; then
  LENS_ID=$(echo "$LENS_RESPONSE" | jq -r '.data.id')
  echo "✅ Lens product created: $LENS_ID"
else
  echo "❌ Lens product creation failed"
  echo "$LENS_RESPONSE" | jq '.error'
  LENS_ID=""
fi

# Test 5: Get Lens by IT Code
echo ""
echo "🔍 TEST 5: Get Lens by IT Code"
echo "=================================================="

if [ -n "$LENS_ID" ]; then
  LENS_GET=$(curl -s -X GET "$BASE_URL/api/products/lenses/D360ASV?organizationId=$ORG_ID")
  
  if echo "$LENS_GET" | jq -e '.success == true' > /dev/null; then
    echo "✅ Lens retrieved successfully"
    echo "$LENS_GET" | jq '.data | {itCode, name, brandLine, visionType, lensIndex, mrp, offerPrice}'
  else
    echo "❌ Lens retrieval failed"
    echo "$LENS_GET" | jq '.error'
  fi
else
  echo "⚠️  Skipping - Lens not created"
fi

# Test 6: Set Product Specifications
echo ""
echo "📝 TEST 6: Set Product Specifications"
echo "=================================================="

if [ -n "$LENS_ID" ]; then
  SPECS_RESPONSE=$(curl -s -X PUT "$BASE_URL/api/admin/products/lenses/$LENS_ID/specs" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{
      "specs": [
        {"key": "Material", "value": "1.60 High Index", "group": "MATERIAL"},
        {"key": "Corridor", "value": "Widest", "group": "OPTICAL_DESIGN"}
      ]
    }')
  
  if echo "$SPECS_RESPONSE" | jq -e '.success == true' > /dev/null; then
    echo "✅ Specifications set successfully"
  else
    echo "❌ Specifications failed"
    echo "$SPECS_RESPONSE" | jq '.error'
  fi
else
  echo "⚠️  Skipping - Lens not created"
fi

# Test 7: Set Product Benefits
echo ""
echo "⭐ TEST 7: Set Product Benefits"
echo "=================================================="

if [ -n "$LENS_ID" ] && [ -n "$BENEFIT_ID" ]; then
  BENEFITS_RESPONSE=$(curl -s -X PUT "$BASE_URL/api/admin/products/lenses/$LENS_ID/benefits" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d "{
      \"benefits\": [
        {\"benefitCode\": \"SCREEN_PROTECTION\", \"score\": 3}
      ]
    }")
  
  if echo "$BENEFITS_RESPONSE" | jq -e '.success == true' > /dev/null; then
    echo "✅ Product benefits set successfully"
  else
    echo "❌ Product benefits failed"
    echo "$BENEFITS_RESPONSE" | jq '.error'
  fi
else
  echo "⚠️  Skipping - Lens or Benefit not created"
fi

# Test 8: Get Questions
echo ""
echo "❓ TEST 8: Get Questions"
echo "=================================================="

QUESTIONS_RESPONSE=$(curl -s -X GET "$BASE_URL/api/questionnaire/questions?category=EYEGLASSES&organizationId=$ORG_ID")

if echo "$QUESTIONS_RESPONSE" | jq -e '.success == true' > /dev/null; then
  Q_COUNT=$(echo "$QUESTIONS_RESPONSE" | jq '.data | length')
  echo "✅ Questions retrieved: $Q_COUNT questions"
  echo "$QUESTIONS_RESPONSE" | jq '.data[0] | {code, text, questionCategory, questionType, parentAnswerId}'
else
  echo "❌ Questions retrieval failed"
  echo "$QUESTIONS_RESPONSE" | jq '.error'
fi

# Test 9: Recommendation API
echo ""
echo "🎯 TEST 9: Recommendation API (Benefit-Based)"
echo "=================================================="

RECOMMEND_RESPONSE=$(curl -s -X POST "$BASE_URL/api/questionnaire/recommend" \
  -H "Content-Type: application/json" \
  -d "{
    \"prescription\": {
      \"rSph\": -4,
      \"rCyl\": -1,
      \"lSph\": -3.5,
      \"lCyl\": -0.75,
      \"add\": null
    },
    \"frame\": {
      \"brand\": \"LENSTRACK\",
      \"subCategory\": \"ADVANCED\",
      \"mrp\": 2500,
      \"frameType\": \"FULL_RIM\"
    },
    \"answers\": [],
    \"visionTypeOverride\": null,
    \"budgetFilter\": \"STANDARD\",
    \"organizationId\": \"$ORG_ID\"
  }")

if echo "$RECOMMEND_RESPONSE" | jq -e '.success == true' > /dev/null; then
  echo "✅ Recommendation API working"
  echo "$RECOMMEND_RESPONSE" | jq '.data | {recommendedIndex, benefitScores, products: (.products | length)}'
else
  echo "❌ Recommendation API failed"
  echo "$RECOMMEND_RESPONSE" | jq '.error'
fi

# Summary
echo ""
echo "=================================================="
echo "✅ TESTING COMPLETE"
echo "=================================================="
echo "All backend specification APIs tested!"
echo "Check results above for any failures."

