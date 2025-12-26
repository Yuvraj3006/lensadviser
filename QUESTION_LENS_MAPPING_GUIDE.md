# Question to Lens Mapping & Recommendation Guide

## Table of Contents
1. [System Overview](#system-overview)
2. [Understanding the Flow](#understanding-the-flow)
3. [Step-by-Step Setup Guide](#step-by-step-setup-guide)
4. [Question to Benefit Mapping](#question-to-benefit-mapping)
5. [Creating Lenses for Accurate Recommendations](#creating-lenses-for-accurate-recommendations)
6. [Offer Configuration](#offer-configuration)
7. [Testing & Validation](#testing--validation)
8. [Troubleshooting](#troubleshooting)

---

## System Overview

The LensTrack recommendation system uses a **benefit-based matching algorithm** that connects:
- **Questions** → **Answer Options** → **Benefits** → **Lens Products** → **Offers**

### Key Components

1. **Questions & Answers**: Customer questionnaire responses
2. **Benefits (B01-B12)**: Master benefits that represent customer needs (e.g., B01 = Comfort, B02 = High Oxygen, etc.)
3. **AnswerBenefit Mapping**: Links answer options to benefits with point values (0-3 scale)
4. **Lens Products**: Products with benefit scores (0-3 scale) indicating how well they satisfy each benefit
5. **Features**: Technical lens features (Anti-Reflection, Blue Light Filter, etc.)
6. **Offers**: Discount rules, combo pricing, YOPO, BOGO, etc.

---

## Understanding the Flow

### Complete Recommendation Flow

```
Customer Answers Questions
         ↓
Answer Options Selected
         ↓
AnswerBenefit Mappings (Points: 0-3)
         ↓
Benefit Scores Calculated (Aggregated from all answers)
         ↓
Lens Products Matched (Product Benefit Scores × User Benefit Scores)
         ↓
Match Percentage Calculated (0-100%)
         ↓
Products Sorted by Match Score
         ↓
Offers Calculated (Based on frame + lens combination)
         ↓
Recommendations Displayed with Prices & Offers
```

### Example Flow

**Customer Answers:**
- Question: "How much time do you spend on screens?"
  - Answer: "8+ hours" → Maps to B01 (Comfort) = 2.5 points, B04 (Blue Light Protection) = 3.0 points
- Question: "What's your budget?"
  - Answer: "₹2000-3500" → Maps to B01 (Comfort) = 2.5 points

**Benefit Scores Calculated:**
- B01 (Comfort): 2.5 + 2.5 = 5.0 points
- B04 (Blue Light Protection): 3.0 points

**Lens Product Matching:**
- Lens A has B01 score = 3.0, B04 score = 2.5
  - Match Component = (5.0 × 3.0) + (3.0 × 2.5) = 15.0 + 7.5 = 22.5
- Lens B has B01 score = 2.0, B04 score = 3.0
  - Match Component = (5.0 × 2.0) + (3.0 × 3.0) = 10.0 + 9.0 = 19.0

**Result:** Lens A ranks higher (22.5 > 19.0)

---

## Step-by-Step Setup Guide

### Step 1: Create Benefits Master

**Location:** `/admin/benefits`

1. Navigate to **Admin → Benefits**
2. Create benefits with codes **B01, B02, B03, ... B12**
3. Set **pointWeight** (default: 1.0) and **maxScore** (default: 3.0)

**Example Benefits:**
- **B01**: Comfort / All-Day Wear
- **B02**: High Oxygen Permeability
- **B03**: UV Protection
- **B04**: Blue Light Filter
- **B05**: Anti-Reflection
- **B06**: Scratch Resistance
- **B07**: Anti-Fog
- **B08**: Lightweight
- **B09**: Durability
- **B10**: Clarity / Sharp Vision
- **B11**: Style / Aesthetics
- **B12**: Value for Money

**Important:** Benefits are **organization-specific**. Each organization must have its own set of benefits.

---

### Step 2: Create Questions & Map to Benefits

**Location:** `/admin/questionnaire`

#### 2.1 Create Questions

1. Navigate to **Admin → Questionnaire**
2. Click **"Add Question"**
3. Fill in:
   - **Question Text** (English, Hindi)
   - **Category** (Eyeglasses, Sunglasses, Contact Lenses, Accessories)
   - **Order** (Display order)
   - **Is Required** (Yes/No)
   - **Allow Multiple** (Yes/No)

#### 2.2 Add Answer Options

1. For each question, add **Answer Options**
2. Fill in:
   - **Answer Text** (English, Hindi)
   - **Order** (Display order)
   - **Icon** (Optional)

#### 2.3 Map Answer Options to Benefits

**This is the critical step for accurate recommendations!**

1. In the **Question Form**, expand the **"Benefit Mapping"** section for each answer option
2. For each answer option, assign **benefit points** (0-3 scale):
   - **0**: This answer does NOT relate to this benefit
   - **1**: Weak relationship
   - **2**: Moderate relationship
   - **3**: Strong relationship

**Example Mapping:**

**Question:** "How much time do you spend on screens?"
- **Answer:** "8+ hours"
  - B01 (Comfort): **2.5** (long screen time needs comfort)
  - B04 (Blue Light Filter): **3.0** (strong need for blue light protection)
  - B05 (Anti-Reflection): **2.0** (reduces glare from screens)

- **Answer:** "2-4 hours"
  - B01 (Comfort): **1.5** (moderate comfort need)
  - B04 (Blue Light Filter): **1.0** (light blue light protection)
  - B05 (Anti-Reflection): **1.0** (minimal glare reduction)

**Question:** "What's your budget?"
- **Answer:** "₹2000-3500"
  - B01 (Comfort): **2.5** (premium comfort)
  - B12 (Value for Money): **2.0** (good value range)

- **Answer:** "Under ₹1000"
  - B12 (Value for Money): **3.0** (maximum value focus)
  - B01 (Comfort): **1.0** (basic comfort)

**Category Weight (Optional):**
- Some answers amplify certain benefit categories
- Example: "Screen-heavy" answers can have `categoryWeight: 1.5` for screen-related benefits (B04, B05)

---

### Step 3: Create Features

**Location:** `/admin/features`

1. Navigate to **Admin → Features**
2. Create features that represent **technical lens capabilities**:
   - Anti-Reflection (F01)
   - Blue Light Filter (F02)
   - UV Protection (F03)
   - Scratch Resistance (F04)
   - Anti-Fog (F05)
   - Water Repellent (F06)
   - etc.

3. **Optional:** Upload an icon for each feature (displayed in recommendations)

4. **Optional:** Map features to benefits (for advanced matching):
   - Click **"Manage Benefits"** on a feature
   - Assign benefit weights (0-3 scale)
   - This creates a secondary mapping: Feature → Benefit

**Note:** Features are **technical specifications**, while Benefits are **customer needs**. A feature can contribute to multiple benefits.

---

### Step 4: Create Lens Products

**Location:** `/admin/lens-products`

#### 4.1 Basic Lens Information

1. Navigate to **Admin → Lens Products**
2. Click **"Add Lens Product"**
3. Fill in:
   - **IT Code** (Unique identifier, e.g., "L001")
   - **Name** (e.g., "Premium Blue Light Lens")
   - **Brand Line** (e.g., "Essilor", "Zeiss")
   - **Vision Type** (Single Vision, Progressive, Bifocal, etc.)
   - **Lens Index** (1.56, 1.60, 1.67, 1.74)
   - **Tint Option** (Clear, Tinted, Photochromic, etc.)
   - **Category** (Standard, Premium, Luxury)
   - **MRP** (Maximum Retail Price)
   - **Base Offer Price** (Default selling price)
   - **Add-On Price** (Optional additional charge)

#### 4.2 Assign Features

1. In the lens creation form, select **Features** that this lens has:
   - Check boxes for: Anti-Reflection, Blue Light Filter, UV Protection, etc.
   - These features will be displayed in recommendations

#### 4.3 Assign Benefit Scores (CRITICAL!)

**This is the most important step for accurate recommendations!**

1. In the lens creation form, find the **"Benefit Scores"** section
2. For each benefit (B01-B12), assign a **score (0-3 scale)**:
   - **0**: This lens does NOT satisfy this benefit
   - **1**: Weak satisfaction
   - **2**: Moderate satisfaction
   - **3**: Strong satisfaction

**Example Benefit Scores for a Premium Blue Light Lens:**

```
B01 (Comfort): 3.0        (Excellent all-day comfort)
B02 (High Oxygen): 2.0   (Good breathability)
B03 (UV Protection): 3.0 (Full UV protection)
B04 (Blue Light Filter): 3.0 (Strong blue light blocking)
B05 (Anti-Reflection): 3.0 (Premium AR coating)
B06 (Scratch Resistance): 2.5 (Good scratch resistance)
B07 (Anti-Fog): 1.0      (Basic anti-fog)
B08 (Lightweight): 2.0   (Moderately lightweight)
B09 (Durability): 2.5    (Good durability)
B10 (Clarity): 3.0       (Excellent clarity)
B11 (Style): 2.0         (Modern design)
B12 (Value): 2.0         (Good value for premium)
```

**Example Benefit Scores for a Budget Lens:**

```
B01 (Comfort): 1.5       (Basic comfort)
B02 (High Oxygen): 1.0   (Standard breathability)
B03 (UV Protection): 2.0 (Basic UV protection)
B04 (Blue Light Filter): 1.0 (Light blue light filtering)
B05 (Anti-Reflection): 1.5 (Standard AR coating)
B06 (Scratch Resistance): 1.5 (Basic scratch resistance)
B07 (Anti-Fog): 0.5     (Minimal anti-fog)
B08 (Lightweight): 1.5  (Moderately lightweight)
B09 (Durability): 1.5   (Basic durability)
B10 (Clarity): 2.0      (Good clarity)
B11 (Style): 1.5        (Standard design)
B12 (Value): 3.0        (Excellent value for money)
```

#### 4.4 RX Range Configuration (Optional)

1. If the lens has **RX add-on pricing** for high powers:
   - Click **"Add RX Range"**
   - Set **SPH Min/Max**, **CYL Min/Max**, **ADD Min/Max**
   - Set **Add-On Price** for this range

**Example:**
- **Range 1**: SPH -6.00 to -8.00, CYL 0 to -2.00 → Add-On: ₹500
- **Range 2**: SPH -8.00 to -10.00, CYL 0 to -2.00 → Add-On: ₹1000

#### 4.5 Band Pricing (Optional)

1. If the lens has **band-based pricing** (different prices for different power ranges):
   - Configure band pricing in the lens product form
   - Set price bands based on SPH/CYL ranges

---

### Step 5: Configure Offers

**Location:** `/admin/offers/rules`

#### 5.1 Create Offer Rules

1. Navigate to **Admin → Offer Rules**
2. Click **"Add Offer Rule"**
3. Select **Offer Type**:
   - **COMBO_PRICE**: Fixed price for frame + lens
   - **YOPO**: Pay for higher of frame or lens
   - **FREE_LENS**: Free lens with frame purchase
   - **PERCENT_OFF**: Percentage discount
   - **FLAT_OFF**: Flat amount discount
   - **BOGO**: Buy One Get One (second pair)
   - **BOG50**: Buy One Get 50% Off (second pair)

#### 5.2 Set Eligibility Criteria

1. **Frame Brands**: Which frame brands are eligible?
2. **Frame Sub-Categories**: Which frame types (Full Rim, Rimless, etc.)?
3. **Lens Brand Lines**: Which lens brands are eligible?
4. **Lens Categories**: Standard, Premium, Luxury?
5. **Min Purchase**: Minimum purchase amount?
6. **Priority**: Higher priority = applied first

#### 5.3 Configure Offer Details

**For COMBO_PRICE:**
- Set **Combo Price** (e.g., ₹5000 for frame + lens combo)

**For PERCENT_OFF:**
- Set **Discount Percent** (e.g., 20% off)
- Set **Max Discount** (optional cap, e.g., max ₹2000)

**For FLAT_OFF:**
- Set **Flat Amount** (e.g., ₹500 off)

**For BOGO/BOG50:**
- Set **Second Pair Discount** (100% for BOGO, 50% for BOG50)
- Set **Eligible Lens Categories**

#### 5.4 Activate Offers for Stores

1. After creating an offer rule, **activate it for specific stores**:
   - Go to **Admin → Stores**
   - Edit a store
   - Enable the offer rules you want to apply

---

## Question to Benefit Mapping

### Mapping Strategy

**Best Practices:**

1. **Map Multiple Benefits per Answer:**
   - Each answer option should map to **2-4 benefits** (not just one)
   - Example: "8+ hours screen time" → B01 (Comfort: 2.5), B04 (Blue Light: 3.0), B05 (AR: 2.0)

2. **Use Fractional Points:**
   - Points can be **0.5, 1.5, 2.5, etc.** (not just whole numbers)
   - Allows fine-grained matching

3. **Consider Answer Context:**
   - "High budget" answers → Higher points for premium benefits (B01, B10, B11)
   - "Low budget" answers → Higher points for value benefit (B12)
   - "Screen-heavy" answers → Higher points for screen-related benefits (B04, B05)

4. **Category Weight Multiplier:**
   - Use `categoryWeight` to amplify certain benefit categories
   - Example: Screen-heavy answers → `categoryWeight: 1.5` for B04, B05

### Example Complete Mapping

**Question:** "What activities do you do most?"

**Answer Options & Mappings:**

1. **"Computer Work (8+ hours)"**
   ```
   B01 (Comfort): 2.5
   B04 (Blue Light): 3.0
   B05 (Anti-Reflection): 2.5
   B10 (Clarity): 2.0
   Category Weight: 1.5 (for screen benefits)
   ```

2. **"Driving"**
   ```
   B03 (UV Protection): 3.0
   B05 (Anti-Reflection): 3.0
   B10 (Clarity): 3.0
   B11 (Style): 2.0
   ```

3. **"Reading"**
   ```
   B01 (Comfort): 2.0
   B10 (Clarity): 3.0
   B05 (Anti-Reflection): 2.0
   ```

4. **"Outdoor Sports"**
   ```
   B03 (UV Protection): 3.0
   B06 (Scratch Resistance): 3.0
   B09 (Durability): 3.0
   B08 (Lightweight): 2.5
   ```

---

## Creating Lenses for Accurate Recommendations

### Lens Creation Checklist

✅ **Basic Information**
- [ ] IT Code (unique)
- [ ] Name
- [ ] Brand Line
- [ ] Vision Type
- [ ] Lens Index
- [ ] Tint Option
- [ ] Category
- [ ] MRP & Base Offer Price

✅ **Features** (Technical capabilities)
- [ ] Select all applicable features
- [ ] Upload feature icons (optional)

✅ **Benefit Scores** (CRITICAL for recommendations)
- [ ] Assign scores (0-3) for ALL benefits (B01-B12)
- [ ] Ensure scores reflect the lens's actual capabilities
- [ ] Premium lenses should have higher scores (2.5-3.0)
- [ ] Budget lenses should have lower scores (1.0-2.0) but high B12 (Value)

✅ **RX Ranges** (If applicable)
- [ ] Configure default range (no add-on)
- [ ] Configure high-power ranges with add-on prices

✅ **Band Pricing** (If applicable)
- [ ] Set different prices for different power bands

✅ **Offer Eligibility**
- [ ] Set `yopoEligible` (Yes/No)
- [ ] Set `comboAllowed` (Yes/No)
- [ ] Ensure lens category matches offer rules

### Benefit Score Guidelines

**Premium Lens (₹3000-5000):**
```
B01: 3.0  B02: 2.5  B03: 3.0  B04: 3.0
B05: 3.0  B06: 2.5  B07: 2.0  B08: 2.5
B09: 2.5  B10: 3.0  B11: 2.5  B12: 2.0
```

**Standard Lens (₹1500-3000):**
```
B01: 2.0  B02: 2.0  B03: 2.5  B04: 2.0
B05: 2.0  B06: 2.0  B07: 1.5  B08: 2.0
B09: 2.0  B10: 2.5  B11: 2.0  B12: 2.5
```

**Budget Lens (₹500-1500):**
```
B01: 1.5  B02: 1.5  B03: 2.0  B04: 1.0
B05: 1.5  B06: 1.5  B07: 1.0  B08: 1.5
B09: 1.5  B10: 2.0  B11: 1.5  B12: 3.0
```

---

## Offer Configuration

### Offer Types Explained

1. **COMBO_PRICE**
   - Fixed price for frame + lens combination
   - Example: Frame ₹3000 + Lens ₹2000 = Combo ₹4000 (save ₹1000)

2. **YOPO (You Only Pay Once)**
   - Pay for the higher of frame or lens price
   - Example: Frame ₹3000 + Lens ₹2000 = Pay ₹3000 (save ₹2000)

3. **FREE_LENS**
   - Lens is free with frame purchase
   - Example: Frame ₹3000 + Lens ₹2000 = Pay ₹3000 (save ₹2000)

4. **PERCENT_OFF**
   - Percentage discount on total
   - Example: 20% off on ₹5000 = Pay ₹4000 (save ₹1000)

5. **FLAT_OFF**
   - Fixed amount discount
   - Example: ₹500 off on ₹5000 = Pay ₹4500 (save ₹500)

6. **BOGO (Buy One Get One)**
   - Second pair is free
   - Example: First pair ₹5000 + Second pair ₹3000 = Pay ₹5000 (save ₹3000)

7. **BOG50 (Buy One Get 50% Off)**
   - Second pair is 50% off
   - Example: First pair ₹5000 + Second pair ₹3000 = Pay ₹6500 (save ₹1500)

### Offer Priority

Offers are applied in **waterfall order**:
1. **COMBO_PRICE** (highest priority)
2. **YOPO**
3. **FREE_LENS**
4. **PERCENT_OFF**
5. **FLAT_OFF**

Only **one primary offer** is applied. After that:
- **Category Discounts** (if applicable)
- **Coupon Discounts** (if applicable)
- **BOGO/BOG50** (for second pair)

### Setting Up Offers

1. **Create Offer Rule:**
   - Go to `/admin/offers/rules`
   - Set offer type, eligibility criteria, discount amount

2. **Activate for Stores:**
   - Go to `/admin/stores`
   - Edit store → Enable offer rules

3. **Test Offer:**
   - Use `/admin/offers/calculator` to test offer calculation
   - Enter frame + lens combination
   - Verify correct offer is applied

---

## Testing & Validation

### Testing Recommendations

1. **Create a Test Session:**
   - Go through the questionnaire flow
   - Answer questions that map to specific benefits
   - Verify recommendations appear

2. **Check Match Scores:**
   - Recommendations should show **match percentage** (0-100%)
   - Higher match = better fit for customer needs

3. **Verify Benefit Mapping:**
   - Check that lenses with high benefit scores for customer's needs rank higher
   - Example: Customer needs B04 (Blue Light) → Lenses with B04 score 3.0 should rank higher than those with 1.0

### Testing Offers

1. **Use Offer Calculator:**
   - Go to `/admin/offers/calculator`
   - Enter frame + lens combination
   - Verify correct offer is applied

2. **Test in Real Flow:**
   - Complete questionnaire → Select frame → View recommendations
   - Check offer summary page shows correct discounts
   - Verify final payable amount is correct

### Validation Checklist

✅ **Questions:**
- [ ] All questions have answer options
- [ ] All answer options have benefit mappings (at least 1 benefit with points > 0)
- [ ] Benefit points are in range 0-3

✅ **Lenses:**
- [ ] All lenses have benefit scores for all benefits (B01-B12)
- [ ] Benefit scores are in range 0-3
- [ ] Features are correctly assigned
- [ ] MRP and prices are set correctly

✅ **Offers:**
- [ ] Offer rules are created and active
- [ ] Offers are activated for stores
- [ ] Eligibility criteria match lens/frame combinations

✅ **System Sync Check:**
- [ ] Go to `/admin/tools/system-sync-check`
- [ ] Verify no sync issues
- [ ] Fix any "Answer-Benefit Mapping" issues

---

## Troubleshooting

### Issue: No Recommendations Appearing

**Possible Causes:**
1. **No AnswerBenefit Mappings:**
   - Check: Answer options don't have benefit mappings
   - Fix: Map answer options to benefits in `/admin/questionnaire`

2. **No Lens Benefit Scores:**
   - Check: Lenses don't have benefit scores assigned
   - Fix: Assign benefit scores in `/admin/lens-products`

3. **No Matching Lenses:**
   - Check: No lenses match the customer's vision type/prescription
   - Fix: Create lenses with correct vision type and RX ranges

**Debug Steps:**
1. Check session answers: `/admin/sessions` → View session → Check answers
2. Check benefit scores: Verify `AnswerBenefit` records exist
3. Check lens products: Verify lenses have benefit scores

### Issue: Wrong Recommendations (Low Match Scores)

**Possible Causes:**
1. **Incorrect Benefit Mappings:**
   - Answer options mapped to wrong benefits
   - Fix: Review and correct benefit mappings

2. **Incorrect Lens Benefit Scores:**
   - Lenses have wrong benefit scores
   - Fix: Review and correct lens benefit scores

3. **Missing Benefit Mappings:**
   - Some answer options not mapped to benefits
   - Fix: Map all answer options to relevant benefits

**Debug Steps:**
1. Check customer's benefit scores: View session → Check calculated benefit scores
2. Check lens benefit scores: Compare with customer's needs
3. Verify match calculation: Benefit scores × Lens scores = Match component

### Issue: Offers Not Showing

**Possible Causes:**
1. **Offer Not Activated for Store:**
   - Check: Store doesn't have offer enabled
   - Fix: Activate offer in `/admin/stores`

2. **Eligibility Criteria Not Met:**
   - Check: Frame/lens doesn't match offer criteria
   - Fix: Review offer eligibility (brands, categories, etc.)

3. **Offer Priority:**
   - Check: Another offer with higher priority is applied
   - Fix: Review offer priorities

**Debug Steps:**
1. Use Offer Calculator: `/admin/offers/calculator`
2. Check offer rules: `/admin/offers/rules`
3. Check store activation: `/admin/stores` → Edit store → Check offers

### Issue: RX Add-On Not Applied

**Possible Causes:**
1. **RX Range Not Configured:**
   - Check: Lens doesn't have RX ranges configured
   - Fix: Add RX ranges in lens product

2. **Power Not in Range:**
   - Check: Customer's power doesn't match any RX range
   - Fix: Add RX range that covers customer's power

**Debug Steps:**
1. Check lens RX ranges: `/admin/lens-products` → View lens → Check RX ranges
2. Check customer prescription: View session → Check prescription
3. Verify power calculation: Use `/admin/tools/power-converter` if needed

---

## Quick Reference

### Benefit Codes
- **B01**: Comfort / All-Day Wear
- **B02**: High Oxygen Permeability
- **B03**: UV Protection
- **B04**: Blue Light Filter
- **B05**: Anti-Reflection
- **B06**: Scratch Resistance
- **B07**: Anti-Fog
- **B08**: Lightweight
- **B09**: Durability
- **B10**: Clarity / Sharp Vision
- **B11**: Style / Aesthetics
- **B12**: Value for Money

### Score Ranges
- **Answer → Benefit Points**: 0-3 (can be fractional: 0.5, 1.5, 2.5)
- **Lens Benefit Scores**: 0-3 (can be fractional: 0.5, 1.5, 2.5)
- **Match Percentage**: 0-100% (calculated from benefit scores)

### Admin Pages
- **Benefits**: `/admin/benefits`
- **Questions**: `/admin/questionnaire`
- **Features**: `/admin/features`
- **Lens Products**: `/admin/lens-products`
- **Offers**: `/admin/offers/rules`
- **Stores**: `/admin/stores`
- **System Sync Check**: `/admin/tools/system-sync-check`
- **Offer Calculator**: `/admin/offers/calculator`

---

## Summary

**For Accurate Recommendations:**
1. ✅ Map **all answer options** to **benefits** with appropriate points (0-3)
2. ✅ Assign **benefit scores** (0-3) to **all lenses** for all benefits (B01-B12)
3. ✅ Ensure **benefit scores reflect actual lens capabilities**
4. ✅ Test recommendations using **System Sync Check** and **Offer Calculator**

**For Accurate Offers:**
1. ✅ Create **offer rules** with correct eligibility criteria
2. ✅ **Activate offers** for stores
3. ✅ Set correct **offer priorities**
4. ✅ Test offers using **Offer Calculator**

**Key Principle:** The recommendation system matches **customer needs (benefits)** with **lens capabilities (benefit scores)**. Accurate mapping = accurate recommendations!

---

*Last Updated: 2025-01-23*

