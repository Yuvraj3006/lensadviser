# Product Creation & Offer Engine Complete Guide

## Table of Contents
1. [Lens Product Creation](#lens-product-creation)
2. [Frame/Product Creation](#frameproduct-creation)
3. [Contact Lens Product Creation](#contact-lens-product-creation)
4. [Accessories/Retail Product Creation](#accessoriesretail-product-creation)
5. [Offer Engine - Complete Guide](#offer-engine---complete-guide)
6. [How Offers Work - Complete Flow](#how-offers-work---complete-flow)
7. [Field Reference Guide](#field-reference-guide)
8. [Examples & Use Cases](#examples--use-cases)

---

## Lens Product Creation

**Location:** `/admin/lens-products`

### Step-by-Step Guide

#### 1. Basic Information

**IT Code** (Required)
- **What to Enter:** Unique identifier for the lens (e.g., "L001", "ESS-001", "ZEISS-PRO-001")
- **Format:** Alphanumeric string, must be unique across all lenses
- **Example:** `ESS-001`, `ZEISS-PRO-001`, `VARILUX-156`
- **Note:** This is used for inventory tracking and order processing

**Name** (Required)
- **What to Enter:** Display name of the lens product
- **Format:** Descriptive text
- **Example:** `Essilor Blue Light Filter Premium`, `Zeiss Progressive Plus`, `Varilux Comfort 1.56`

**Lens Brand** (Required)
- **What to Enter:** Select from existing lens brands
- **How to Add:** First create brand in `/admin/lens-brands`
- **Example:** `Essilor`, `Zeiss`, `Varilux`, `Hoya`

**Vision Type** (Required)
- **Options:**
  - `SINGLE_VISION`: Standard single vision lenses
  - `PROGRESSIVE`: Progressive/multifocal lenses
  - `BIFOCAL`: Bifocal lenses
  - `ANTI_FATIGUE`: Anti-fatigue lenses
  - `MYOPIA_CONTROL`: Myopia control lenses
- **What to Enter:** Select based on lens type
- **Example:** For reading glasses → `SINGLE_VISION`, For presbyopia → `PROGRESSIVE`

**Lens Index** (Required)
- **Options:**
  - `INDEX_156`: 1.56 index (standard thickness)
  - `INDEX_160`: 1.60 index (thinner)
  - `INDEX_167`: 1.67 index (thinner, for high powers)
  - `INDEX_174`: 1.74 index (thinnest, for very high powers)
- **What to Enter:** Select based on lens thickness
- **Guidelines:**
  - Low power (-2.00 to +2.00): `INDEX_156`
  - Medium power (-4.00 to -6.00): `INDEX_160`
  - High power (-6.00 to -8.00): `INDEX_167`
  - Very high power (-8.00+): `INDEX_174`

**Tint Option** (Optional, Default: CLEAR)
- **Options:**
  - `CLEAR`: No tint
  - `TINT`: Colored tint
  - `PHOTOCHROMIC`: Light-adaptive (Transitions)
  - `TRANSITION`: Same as photochromic
- **What to Enter:** Select based on lens tinting

**Category** (Optional, Default: STANDARD)
- **Options:**
  - `ECONOMY`: Budget lenses (₹500-1500)
  - `STANDARD`: Standard lenses (₹1500-3000)
  - `PREMIUM`: Premium lenses (₹3000-5000)
  - `ULTRA`: Ultra-premium lenses (₹5000+)
- **What to Enter:** Select based on price range
- **Note:** Used for offer eligibility and filtering

**Delivery Days** (Optional, Default: 4)
- **What to Enter:** Number of days for delivery
- **Format:** Integer (1-30)
- **Example:** `4` (4 days), `7` (1 week)

---

#### 2. Pricing Information

**MRP (Maximum Retail Price)** (Optional)
- **What to Enter:** Maximum retail price (strikethrough price)
- **Format:** Number (₹)
- **Example:** `5000` (₹5,000)
- **Note:** If not provided, `baseOfferPrice` will be used as MRP

**Base Offer Price** (Required)
- **What to Enter:** Default selling price for standard power range
- **Format:** Number (₹)
- **Example:** `3000` (₹3,000)
- **Note:** This is the price shown to customers (before offers)

**Add-On Price** (Optional)
- **What to Enter:** Additional charge for special features
- **Format:** Number (₹)
- **Example:** `500` (₹500 add-on)
- **Note:** This is added to base price for special features (not RX add-on)

---

#### 3. RX Ranges (Power Ranges)

**Purpose:** Define different pricing for different power ranges

**Default Range (No Add-On):**
- **SPH Min:** Minimum sphere power (e.g., `-6.00`)
- **SPH Max:** Maximum sphere power (e.g., `-2.00`)
- **CYL Min:** Minimum cylinder power (e.g., `-2.00`)
- **CYL Max:** Maximum cylinder power (e.g., `0.00`)
- **ADD Min:** Minimum addition (for progressive, e.g., `null` for single vision)
- **ADD Max:** Maximum addition (for progressive, e.g., `null` for single vision)
- **Add-On Price:** `0` (no add-on for this range)

**High Power Range (With Add-On):**
- **SPH Min:** `-8.00`
- **SPH Max:** `-6.00`
- **CYL Min:** `-2.00`
- **CYL Max:** `0.00`
- **ADD Min:** `null`
- **ADD Max:** `null`
- **Add-On Price:** `500` (₹500 add-on for this range)

**How to Add Multiple Ranges:**
1. Click **"Add RX Range"**
2. Fill in power limits for each range
3. Set add-on price for each range
4. **Important:** Ensure ranges don't overlap

**Example RX Range Configuration:**

```
Range 1 (Standard - No Add-On):
  SPH: -6.00 to +6.00
  CYL: -2.00 to 0.00
  ADD: null to null
  Add-On: ₹0

Range 2 (High Power - ₹500 Add-On):
  SPH: -8.00 to -6.00
  CYL: -2.00 to 0.00
  ADD: null to null
  Add-On: ₹500

Range 3 (Very High Power - ₹1000 Add-On):
  SPH: -10.00 to -8.00
  CYL: -2.00 to 0.00
  ADD: null to null
  Add-On: ₹1000
```

---

#### 4. Features

**Purpose:** Technical capabilities of the lens (displayed in recommendations)

**What to Enter:**
- Select from existing features (created in `/admin/features`)
- Check boxes for applicable features
- **Example Features:**
  - Anti-Reflection (F01)
  - Blue Light Filter (F02)
  - UV Protection (F03)
  - Scratch Resistance (F04)
  - Anti-Fog (F05)
  - Water Repellent (F06)

**How to Add:**
1. Features must be created first in `/admin/features`
2. Then select them in the lens product form
3. Features are displayed in recommendation cards

---

#### 5. Benefit Scores (CRITICAL for Recommendations)

**Purpose:** Maps lens capabilities to customer needs (B01-B12)

**What to Enter:**
- For each benefit (B01-B12), assign a score from **0 to 3**
- **0:** Lens does NOT satisfy this benefit
- **1:** Weak satisfaction
- **2:** Moderate satisfaction
- **3:** Strong satisfaction
- **Can use decimals:** 0.5, 1.5, 2.5, etc.

**Benefit Codes:**
- **B01:** Comfort / All-Day Wear
- **B02:** High Oxygen Permeability
- **B03:** UV Protection
- **B04:** Blue Light Filter
- **B05:** Anti-Reflection
- **B06:** Scratch Resistance
- **B07:** Anti-Fog
- **B08:** Lightweight
- **B09:** Durability
- **B10:** Clarity / Sharp Vision
- **B11:** Style / Aesthetics
- **B12:** Value for Money

**Example Benefit Scores for Premium Blue Light Lens:**

```
B01 (Comfort): 3.0
B02 (High Oxygen): 2.0
B03 (UV Protection): 3.0
B04 (Blue Light Filter): 3.0
B05 (Anti-Reflection): 3.0
B06 (Scratch Resistance): 2.5
B07 (Anti-Fog): 1.0
B08 (Lightweight): 2.0
B09 (Durability): 2.5
B10 (Clarity): 3.0
B11 (Style): 2.0
B12 (Value): 2.0
```

**Example Benefit Scores for Budget Lens:**

```
B01 (Comfort): 1.5
B02 (High Oxygen): 1.0
B03 (UV Protection): 2.0
B04 (Blue Light Filter): 1.0
B05 (Anti-Reflection): 1.5
B06 (Scratch Resistance): 1.5
B07 (Anti-Fog): 0.5
B08 (Lightweight): 1.5
B09 (Durability): 1.5
B10 (Clarity): 2.0
B11 (Style): 1.5
B12 (Value): 3.0  ← High value score for budget lens
```

**Guidelines:**
- **Premium lenses:** Higher scores (2.5-3.0) for most benefits
- **Budget lenses:** Lower scores (1.0-2.0) but high B12 (Value)
- **Specialty lenses:** High scores for specific benefits (e.g., Blue Light lens → B04 = 3.0)

---

#### 6. Offer Eligibility

**YOPO Eligible** (Yes/No)
- **What to Enter:** Check if lens is eligible for YOPO (You Only Pay Once) offers
- **Default:** `false`
- **When to Enable:** If lens should be part of YOPO offers

**Combo Allowed** (Yes/No)
- **What to Enter:** Check if lens can be part of combo offers
- **Default:** `false`
- **When to Enable:** If lens should be part of combo pricing

**Is Active** (Yes/No)
- **What to Enter:** Check if lens is active and available
- **Default:** `true`
- **When to Disable:** Temporarily hide lens from recommendations

---

### Complete Lens Product Example

```
IT Code: ESS-BLUE-001
Name: Essilor Blue Light Filter Premium
Lens Brand: Essilor
Vision Type: SINGLE_VISION
Lens Index: INDEX_160
Tint Option: CLEAR
Category: PREMIUM
Delivery Days: 4

MRP: ₹5,000
Base Offer Price: ₹3,000
Add-On Price: ₹0

RX Ranges:
  Range 1: SPH -6.00 to +6.00, CYL -2.00 to 0.00, Add-On: ₹0
  Range 2: SPH -8.00 to -6.00, CYL -2.00 to 0.00, Add-On: ₹500
  Range 3: SPH -10.00 to -8.00, CYL -2.00 to 0.00, Add-On: ₹1000

Features:
  ✓ Anti-Reflection (F01)
  ✓ Blue Light Filter (F02)
  ✓ UV Protection (F03)
  ✓ Scratch Resistance (F04)

Benefit Scores:
  B01: 3.0  B02: 2.0  B03: 3.0  B04: 3.0
  B05: 3.0  B06: 2.5  B07: 1.0  B08: 2.0
  B09: 2.5  B10: 3.0  B11: 2.0  B12: 2.0

YOPO Eligible: ✓
Combo Allowed: ✓
Is Active: ✓
```

---

## Frame/Product Creation

**Location:** `/admin/products`

### Step-by-Step Guide

#### 1. Basic Information

**Product Type** (Required)
- **Options:**
  - `EYEGLASSES`: Regular eyeglasses
  - `SUNGLASSES`: Sunglasses
  - `CONTACT_LENSES`: Contact lenses (use Contact Lens Products page)
  - `ACCESSORIES`: Accessories (lens cleaner, cases, etc.)
- **What to Enter:** Select based on product type

**Brand** (Required)
- **What to Enter:** Select from existing brands
- **How to Add:** First create brand in `/admin/brands`
- **Example:** `Ray-Ban`, `Oakley`, `Tom Ford`

**Sub-Brand** (Optional)
- **What to Enter:** Select sub-brand if applicable
- **How to Add:** Create sub-brand under main brand
- **Example:** Under "Ray-Ban" → "Aviator", "Wayfarer"

**Name** (Required)
- **What to Enter:** Product name
- **Format:** Descriptive text
- **Example:** `Ray-Ban Aviator Classic RB3025`, `Oakley Holbrook`

**SKU** (Required)
- **What to Enter:** Stock Keeping Unit (unique identifier)
- **Format:** Alphanumeric string
- **Example:** `RB3025-001`, `OAK-HB-001`

**HSN Code** (Optional)
- **What to Enter:** HSN code for tax purposes
- **Format:** Numeric code
- **Example:** `90041000` (for eyeglasses)

---

#### 2. Pricing Information

**MRP** (Required)
- **What to Enter:** Maximum Retail Price
- **Format:** Number (₹)
- **Example:** `8000` (₹8,000)

**Note:** Frame products use MRP directly. No separate "offer price" field (offers are calculated by offer engine).

---

#### 3. Frame-Specific Fields (For EYEGLASSES/SUNGLASSES)

**Frame Type** (Optional)
- **Options:**
  - `FULL_RIM`: Full rim frames
  - `HALF_RIM`: Half rim frames
  - `RIMLESS`: Rimless frames
- **What to Enter:** Select based on frame style
- **Note:** Used for offer eligibility

**Applicable Lens Indexes** (Optional)
- **What to Enter:** Select which lens indexes can be used with this frame
- **Options:** INDEX_156, INDEX_160, INDEX_167, INDEX_174
- **Example:** Rimless frames → Only INDEX_167, INDEX_174 (thinner lenses)
- **Note:** Used for index recommendation

---

### Complete Frame Product Example

```
Product Type: EYEGLASSES
Brand: Ray-Ban
Sub-Brand: Aviator
Name: Ray-Ban Aviator Classic RB3025
SKU: RB3025-001
HSN Code: 90041000

MRP: ₹8,000

Frame Type: FULL_RIM
Applicable Lens Indexes:
  ✓ INDEX_156
  ✓ INDEX_160
  ✓ INDEX_167
  ✓ INDEX_174
```

---

## Contact Lens Product Creation

**Location:** `/admin/contact-lens-products`

### Step-by-Step Guide

#### 1. Basic Information

**SKU Code** (Required)
- **What to Enter:** Unique identifier
- **Format:** Alphanumeric string
- **Example:** `CL-ACUVUE-001`, `CL-BAUSCH-001`

**Brand** (Required)
- **What to Enter:** Brand name
- **Format:** Text
- **Example:** `Acuvue`, `Bausch & Lomb`, `CooperVision`

**Line** (Required)
- **What to Enter:** Product line
- **Format:** Text
- **Example:** `Oasys`, `Moist`, `Biofinity`

**Modality** (Required)
- **Options:**
  - `DAILY`: Daily disposable
  - `BIWEEKLY`: Bi-weekly replacement
  - `MONTHLY`: Monthly replacement
  - `YEARLY`: Yearly replacement
- **What to Enter:** Select replacement schedule

**Lens Type** (Required)
- **Options:**
  - `SPHERICAL`: Standard spherical
  - `TORIC`: For astigmatism
  - `MULTIFOCAL`: For presbyopia
  - `COSMETIC`: Colored/cosmetic lenses
- **What to Enter:** Select based on lens type

**Material** (Optional)
- **What to Enter:** Lens material
- **Example:** `Silicone Hydrogel`, `Hydrogel`

**Water Content** (Optional)
- **What to Enter:** Water content percentage
- **Example:** `58%`, `38%`

**Design Notes** (Optional)
- **What to Enter:** Additional design information
- **Example:** `Aspheric design for sharper vision`

**Pack Size** (Required)
- **What to Enter:** Number of lenses per pack
- **Format:** Integer
- **Example:** `6` (6 lenses = 3 months for monthly), `30` (30 lenses = 1 month for daily)

---

#### 2. Pricing Information

**MRP** (Required)
- **What to Enter:** Maximum Retail Price per pack
- **Format:** Number (₹)
- **Example:** `1500` (₹1,500 per pack)

**Offer Price** (Required)
- **What to Enter:** Selling price per pack
- **Format:** Number (₹)
- **Example:** `1200` (₹1,200 per pack)

---

#### 3. Power Range

**SPH Min/Max** (Optional)
- **What to Enter:** Sphere power range
- **Example:** SPH Min: `-10.00`, SPH Max: `+6.00`

**CYL Min/Max** (Optional)
- **What to Enter:** Cylinder power range (for toric lenses)
- **Example:** CYL Min: `-4.00`, CYL Max: `-0.25`

**ADD Min/Max** (Optional)
- **What to Enter:** Addition range (for multifocal lenses)
- **Example:** ADD Min: `+0.75`, ADD Max: `+2.50`

**Axis Steps** (Optional)
- **What to Enter:** Available axis values (for toric lenses)
- **Format:** Array of numbers
- **Example:** `[0, 10, 20, 30, ..., 180]`

---

#### 4. Additional Options

**Is Color Lens** (Yes/No)
- **What to Enter:** Check if lens has color options
- **Default:** `false`

**Color Options** (Optional)
- **What to Enter:** Available colors (if color lens)
- **Format:** Array of color names
- **Example:** `["Blue", "Green", "Brown", "Hazel"]`

**Is Active** (Yes/No)
- **What to Enter:** Check if product is active
- **Default:** `true`

---

### Complete Contact Lens Product Example

```
SKU Code: CL-ACUVUE-OASYS-001
Brand: Acuvue
Line: Oasys
Modality: BIWEEKLY
Lens Type: SPHERICAL
Material: Silicone Hydrogel
Water Content: 38%
Design Notes: Advanced aspheric design
Pack Size: 6

MRP: ₹1,500
Offer Price: ₹1,200

SPH Min: -10.00
SPH Max: +6.00
CYL Min: -2.00
CYL Max: 0.00

Is Color Lens: No
Is Active: Yes
```

---

## Accessories/Retail Product Creation

**Location:** `/admin/products` (Select "ACCESSORIES" tab)

### Step-by-Step Guide

#### 1. Basic Information

**Product Type:** `ACCESSORIES` (Selected)

**Brand** (Required)
- **What to Enter:** Brand name
- **Example:** `Generic`, `Essilor`, `Zeiss`

**Name** (Required)
- **What to Enter:** Product name
- **Example:** `Lens Cleaner Solution 100ml`, `Microfiber Cloth`, `Frame Case`

**SKU** (Required)
- **What to Enter:** Unique identifier
- **Example:** `ACC-CLEANER-001`, `ACC-CLOTH-001`

**HSN Code** (Optional)
- **What to Enter:** HSN code for tax
- **Example:** `3307` (for cleaning solutions)

---

#### 2. Pricing Information

**MRP** (Required)
- **What to Enter:** Maximum Retail Price
- **Format:** Number (₹)
- **Example:** `200` (₹200)

**Note:** Accessories use MRP directly. Discounts are applied via offer engine.

---

### Complete Accessory Product Example

```
Product Type: ACCESSORIES
Brand: Generic
Name: Lens Cleaner Solution 100ml
SKU: ACC-CLEANER-001
HSN Code: 3307

MRP: ₹200
```

---

## Offer Engine - Complete Guide

**Location:** `/admin/offers/rules`

### Understanding Offer Types

#### 1. YOPO (You Only Pay Once)

**What it does:** Customer pays for the higher of frame or lens price

**Configuration:**
- **Offer Type:** `YOPO`
- **Discount Type:** `YOPO_LOGIC` (automatic)
- **Free Under YOPO:** 
  - `BEST_OF`: Pay higher of frame or lens (default)
  - `FRAME`: Frame free, pay lens price
  - `LENS`: Lens free, pay frame price
- **Bonus Free Allowed:** Yes/No (allow additional free products)

**Example:**
- Frame: ₹3,000
- Lens: ₹2,000
- **YOPO Result:** Pay ₹3,000 (save ₹2,000)

**Eligibility Criteria:**
- Frame Brand (optional)
- Frame Sub-Category (optional)
- Lens Brand Lines (optional)
- Min/Max Frame MRP (optional)
- Lens must have `yopoEligible: true`

---

#### 2. COMBO_PRICE

**What it does:** Fixed price for frame + lens combination

**Configuration:**
- **Offer Type:** `COMBO_PRICE`
- **Discount Type:** `COMBO_PRICE`
- **Combo Price:** Fixed price (e.g., ₹5,000)
- **Combo Type:** (Optional)
  - `STANDARD`: Standard combo
  - `PREMIUM`: Premium combo
- **Required Frame Sub-Category:** (Optional) Specific frame type required

**Example:**
- Frame: ₹3,000
- Lens: ₹2,000
- Total: ₹5,000
- **Combo Price:** ₹4,000
- **Result:** Pay ₹4,000 (save ₹1,000)

**Eligibility Criteria:**
- Frame Brand (optional)
- Frame Sub-Category (optional)
- Lens Brand Lines (optional)
- Min/Max Frame MRP (optional)
- Lens must have `comboAllowed: true`

---

#### 3. FREE_LENS

**What it does:** Lens is free with frame purchase

**Configuration:**
- **Offer Type:** `FREE_LENS`
- **Discount Type:** `FREE_ITEM`
- **Free Product ID:** (Optional) Specific lens product ID

**Example:**
- Frame: ₹3,000
- Lens: ₹2,000
- **Result:** Pay ₹3,000 (save ₹2,000)

**Eligibility Criteria:**
- Frame Brand (optional)
- Frame Sub-Category (optional)
- Lens Brand Lines (optional)
- Min/Max Frame MRP (optional)

---

#### 4. PERCENT_OFF

**What it does:** Percentage discount on total

**Configuration:**
- **Offer Type:** `PERCENT_OFF`
- **Discount Type:** `PERCENTAGE`
- **Discount Value:** Percentage (e.g., `20` for 20%)
- **Max Discount:** (Optional) Maximum discount cap (₹)

**Example:**
- Frame: ₹3,000
- Lens: ₹2,000
- Total: ₹5,000
- **Discount:** 20%
- **Result:** Pay ₹4,000 (save ₹1,000)

**Eligibility Criteria:**
- Frame Brand (optional)
- Frame Sub-Category (optional)
- Lens Brand Lines (optional)
- Min/Max Frame MRP (optional)

---

#### 5. FLAT_OFF

**What it does:** Fixed amount discount

**Configuration:**
- **Offer Type:** `FLAT_OFF`
- **Discount Type:** `FLAT_AMOUNT`
- **Discount Value:** Fixed amount (₹)

**Example:**
- Frame: ₹3,000
- Lens: ₹2,000
- Total: ₹5,000
- **Discount:** ₹500
- **Result:** Pay ₹4,500 (save ₹500)

**Eligibility Criteria:**
- Frame Brand (optional)
- Frame Sub-Category (optional)
- Lens Brand Lines (optional)
- Min/Max Frame MRP (optional)

---

#### 6. BOGO (Buy One Get One Free)

**What it does:** Second pair is free

**Configuration:**
- **Offer Type:** `BOGO`
- **Discount Type:** `FREE_ITEM`
- **Eligible Brands:** Select frame brands eligible for BOGO
- **Eligible Categories:** (Optional) Lens categories eligible

**Example:**
- First Pair: ₹5,000
- Second Pair: ₹3,000
- **Result:** Pay ₹5,000 (save ₹3,000)

**Eligibility Criteria:**
- Frame Brands (required - select eligible brands)
- Lens Categories (optional)
- Min/Max Frame MRP (optional)

---

#### 7. BOG50 (Buy One Get 50% Off)

**What it does:** Second pair is 50% off

**Configuration:**
- **Offer Type:** `BOG50`
- **Discount Type:** `PERCENTAGE`
- **Second Pair Percent:** `50` (50% off)
- **Eligible Brands:** Select frame brands eligible for BOG50
- **Eligible Categories:** (Optional) Lens categories eligible

**Example:**
- First Pair: ₹5,000
- Second Pair: ₹3,000 (50% off = ₹1,500)
- **Result:** Pay ₹6,500 (save ₹1,500)

**Eligibility Criteria:**
- Frame Brands (required - select eligible brands)
- Lens Categories (optional)
- Min/Max Frame MRP (optional)

---

#### 8. CATEGORY_DISCOUNT

**What it does:** Discount based on product category

**Configuration:**
- **Offer Type:** `CATEGORY_DISCOUNT`
- **Discount Type:** `PERCENTAGE` or `FLAT_AMOUNT`
- **Discount Value:** Percentage or amount
- **Category:** Product category (ECONOMY, STANDARD, PREMIUM, ULTRA)

**Example:**
- Lens Category: PREMIUM
- Discount: 15% off
- Lens Price: ₹3,000
- **Result:** Pay ₹2,550 (save ₹450)

---

#### 9. BONUS_FREE_PRODUCT

**What it does:** Free product when bill exceeds threshold

**Configuration:**
- **Offer Type:** `BONUS_FREE_PRODUCT`
- **Trigger Min Bill:** Minimum bill amount (₹)
- **Bonus Limit:** Maximum value of free product (₹)
- **Bonus Category:** Category of free product (e.g., "ACCESSORIES")

**Example:**
- Bill Amount: ₹6,000
- Trigger: ₹5,000
- Bonus: ₹500 worth of accessories
- **Result:** Free accessories worth ₹500

---

### Creating an Offer Rule - Step by Step

#### Step 1: Basic Information

1. Navigate to `/admin/offers/rules`
2. Click **"Create Rule"**
3. Fill in:
   - **Name:** Descriptive name (e.g., "YOPO Premium Offer")
   - **Code:** Unique code (e.g., "YOPO-PREM-001")
   - **Offer Type:** Select from dropdown
   - **Priority:** Lower number = higher priority (default: 100)

#### Step 2: Discount Configuration

**For YOPO:**
- **Discount Type:** `YOPO_LOGIC` (automatic)
- **Free Under YOPO:** Select option (BEST_OF, FRAME, LENS)
- **Bonus Free Allowed:** Yes/No

**For COMBO_PRICE:**
- **Discount Type:** `COMBO_PRICE`
- **Combo Price:** Enter fixed price (₹)
- **Combo Type:** (Optional) STANDARD or PREMIUM

**For PERCENT_OFF:**
- **Discount Type:** `PERCENTAGE`
- **Discount Value:** Enter percentage (e.g., `20` for 20%)
- **Max Discount:** (Optional) Maximum discount cap (₹)

**For FLAT_OFF:**
- **Discount Type:** `FLAT_AMOUNT`
- **Discount Value:** Enter amount (₹)

**For BOGO/BOG50:**
- **Discount Type:** `FREE_ITEM` (BOGO) or `PERCENTAGE` (BOG50)
- **Second Pair Percent:** `100` (BOGO) or `50` (BOG50)
- **Eligible Brands:** Select frame brands (required)

#### Step 3: Eligibility Criteria

**Frame Criteria:**
- **Frame Brand:** Select brand (or leave empty for "Any")
- **Frame Sub-Category:** Select sub-category (or leave empty)
- **Min Frame MRP:** Minimum frame price (₹)
- **Max Frame MRP:** Maximum frame price (₹)

**Lens Criteria:**
- **Lens Brand Lines:** Select lens brand lines (or leave empty)
- **Lens IT Codes:** (Optional) Specific lens IT codes
- **Lens Categories:** (Optional) Lens categories

**Note:** Leave fields empty to allow "Any" (no restriction)

#### Step 4: Additional Settings

- **Is Active:** Check to activate offer
- **Start Date:** (Optional) Offer start date
- **End Date:** (Optional) Offer end date
- **Upsell Enabled:** (Optional) Enable upsell suggestions
- **Upsell Threshold:** (Optional) Bill amount for upsell
- **Upsell Reward Text:** (Optional) Text to display

#### Step 5: Save and Activate

1. Click **"Create"** or **"Update"**
2. Go to `/admin/stores`
3. Edit store
4. Enable the offer rule for that store

---

### Offer Priority System

Offers are applied in **waterfall order** (highest priority first):

1. **COMBO_PRICE** (Priority 1-10)
2. **YOPO** (Priority 11-20)
3. **FREE_LENS** (Priority 21-30)
4. **PERCENT_OFF** (Priority 31-40)
5. **FLAT_OFF** (Priority 41-50)

**Only ONE primary offer** is applied. After that:
- **Category Discounts** (if applicable)
- **Coupon Discounts** (if applicable)
- **BOGO/BOG50** (for second pair)

**Example:**
- Offer 1: COMBO_PRICE (Priority: 10)
- Offer 2: YOPO (Priority: 20)
- Offer 3: PERCENT_OFF (Priority: 30)

If all are applicable, **COMBO_PRICE** is applied (lowest priority number = highest priority).

---

## How Offers Work - Complete Flow

### Step 1: Customer Selects Frame + Lens

Customer completes questionnaire and selects:
- Frame: ₹3,000
- Lens: ₹2,000
- Total: ₹5,000

### Step 2: System Fetches Applicable Offers

System checks all active offer rules for:
- Frame brand match
- Frame sub-category match
- Lens brand line match
- Frame MRP range match
- Lens eligibility (yopoEligible, comboAllowed)

### Step 3: Offer Priority Check

System sorts offers by priority (ascending):
- Priority 10: COMBO_PRICE
- Priority 20: YOPO
- Priority 30: PERCENT_OFF

### Step 4: Apply Best Offer

System applies the **first applicable offer** (lowest priority number):

**If COMBO_PRICE applies:**
- Combo Price: ₹4,000
- Effective Base: ₹4,000
- Savings: ₹1,000

**If YOPO applies:**
- Pay Higher: ₹3,000
- Effective Base: ₹3,000
- Savings: ₹2,000

**If PERCENT_OFF applies:**
- Discount: 20% of ₹5,000 = ₹1,000
- Effective Base: ₹4,000
- Savings: ₹1,000

### Step 5: Apply Additional Discounts

After primary offer:
- **Category Discount:** If lens category matches
- **Coupon Discount:** If coupon code applied
- **RX Add-On:** Added to final price (non-discountable)

### Step 6: Calculate Final Payable

```
Base Total: ₹5,000
- Primary Offer: -₹1,000 (COMBO_PRICE)
= Effective Base: ₹4,000
- Category Discount: -₹200 (5% off PREMIUM)
- Coupon Discount: -₹100
+ RX Add-On: +₹500 (high power)
= Final Payable: ₹4,200
```

### Step 7: BOGO/BOG50 (Second Pair)

If customer selects second pair:
- First Pair: ₹4,200 (after offers)
- Second Pair: ₹3,000
- **BOGO:** Second pair free → Pay ₹4,200
- **BOG50:** Second pair 50% off → Pay ₹5,700

---

## Field Reference Guide

### Lens Product Fields

| Field | Type | Required | Description | Example |
|-------|------|----------|-------------|---------|
| `itCode` | String | Yes | Unique identifier | `ESS-001` |
| `name` | String | Yes | Product name | `Essilor Blue Light Premium` |
| `lensBrandId` | String | Yes | Lens brand ID | `brand123` |
| `type` | Enum | Yes | Vision type | `SINGLE_VISION` |
| `index` | Enum | Yes | Lens index | `INDEX_160` |
| `tintOption` | Enum | No | Tint type | `CLEAR` |
| `category` | Enum | No | Price category | `PREMIUM` |
| `deliveryDays` | Number | No | Delivery time | `4` |
| `mrp` | Number | No | Maximum retail price | `5000` |
| `baseOfferPrice` | Number | Yes | Selling price | `3000` |
| `addOnPrice` | Number | No | Additional charge | `500` |
| `rxRanges` | Array | No | Power ranges | See RX Ranges section |
| `yopoEligible` | Boolean | No | YOPO eligibility | `true` |
| `comboAllowed` | Boolean | No | Combo eligibility | `true` |
| `featureCodes` | Array | No | Feature codes | `["F01", "F02"]` |
| `benefitScores` | Object | No | Benefit scores | `{"B01": 3.0, "B04": 3.0}` |
| `isActive` | Boolean | No | Active status | `true` |

### Offer Rule Fields

| Field | Type | Required | Description | Example |
|-------|------|----------|-------------|---------|
| `code` | String | Yes | Unique code | `YOPO-001` |
| `name` | String | Yes | Rule name | `YOPO Premium Offer` |
| `offerType` | Enum | Yes | Offer type | `YOPO` |
| `discountType` | Enum | Yes | Discount type | `YOPO_LOGIC` |
| `discountValue` | Number | No | Discount amount | `20` (for %) |
| `comboPrice` | Number | No | Combo price | `4000` |
| `priority` | Number | No | Priority (lower = higher) | `10` |
| `frameBrands` | Array | No | Eligible frame brands | `["Ray-Ban"]` |
| `frameSubCategories` | Array | No | Eligible sub-categories | `["FULL_RIM"]` |
| `lensBrandLines` | Array | No | Eligible lens brands | `["Essilor"]` |
| `lensItCodes` | Array | No | Specific lens codes | `["ESS-001"]` |
| `minFrameMRP` | Number | No | Min frame price | `2000` |
| `maxFrameMRP` | Number | No | Max frame price | `5000` |
| `isActive` | Boolean | No | Active status | `true` |
| `config` | Object | No | Additional config | See config section |

---

## Examples & Use Cases

### Example 1: Premium YOPO Offer

**Scenario:** Offer YOPO for premium frames (₹5,000+) with Essilor lenses

**Configuration:**
```
Name: Premium YOPO Offer
Code: YOPO-PREM-001
Offer Type: YOPO
Priority: 10

Frame Criteria:
  Frame Brands: ["Ray-Ban", "Oakley", "Tom Ford"]
  Min Frame MRP: 5000
  Max Frame MRP: (empty - no limit)

Lens Criteria:
  Lens Brand Lines: ["Essilor"]
  
Result: Customer pays higher of frame or lens price
```

### Example 2: Budget Combo Offer

**Scenario:** Fixed combo price for budget frames + standard lenses

**Configuration:**
```
Name: Budget Combo Offer
Code: COMBO-BUDGET-001
Offer Type: COMBO_PRICE
Priority: 5
Combo Price: 3000

Frame Criteria:
  Max Frame MRP: 3000

Lens Criteria:
  Lens Categories: ["ECONOMY", "STANDARD"]
  
Result: Any frame (≤₹3,000) + Economy/Standard lens = ₹3,000
```

### Example 3: BOGO for Specific Brands

**Scenario:** Buy one get one free for Ray-Ban frames

**Configuration:**
```
Name: Ray-Ban BOGO
Code: BOGO-RAYBAN-001
Offer Type: BOGO
Priority: 50
Eligible Brands: ["Ray-Ban"]

Result: First pair full price, second pair free
```

### Example 4: Category Discount

**Scenario:** 15% off on all PREMIUM category lenses

**Configuration:**
```
Name: Premium Lens Discount
Code: CAT-PREM-001
Offer Type: CATEGORY_DISCOUNT
Discount Type: PERCENTAGE
Discount Value: 15
Lens Categories: ["PREMIUM"]

Result: 15% off on all premium lenses
```

---

## Summary

### Key Points

1. **Lens Products:**
   - Must have benefit scores (B01-B12) for recommendations
   - RX ranges define pricing for different powers
   - Features are displayed in recommendations
   - YOPO/Combo eligibility controls offer participation

2. **Offer Rules:**
   - Priority determines which offer is applied
   - Eligibility criteria filter applicable offers
   - Only one primary offer is applied
   - BOGO/BOG50 applies to second pair

3. **Offer Flow:**
   - System checks all active offers
   - Sorts by priority
   - Applies first applicable offer
   - Adds category/coupon discounts
   - Adds RX add-ons (non-discountable)

4. **Best Practices:**
   - Set lower priority numbers for better offers
   - Use specific eligibility criteria for targeted offers
   - Test offers using `/admin/offers/calculator`
   - Activate offers for stores after creation

---

*Last Updated: 2025-01-23*

