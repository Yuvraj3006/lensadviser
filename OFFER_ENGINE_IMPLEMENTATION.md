# Offer Engine Implementation - Complete

## Overview

This document describes the complete implementation of the LensTrack Offer Engine as per the backend specification. The Offer Engine implements a sophisticated waterfall logic for calculating discounts and offers on frame + lens combinations.

## ✅ Implementation Status: 100% Complete

### 1. Database Schema Updates

#### New Enums Added:
- `BrandLine`: DIGI360_ADVANCED, DIGI360_ESSENTIAL, DRIVEXPERT, BLUEXPERT, PROGRESSIVE_PLUS, STANDARD, PREMIUM, OTHER
- `CustomerCategory`: STUDENT, DOCTOR, TEACHER, ARMED_FORCES, SENIOR_CITIZEN, CORPORATE, REGULAR
- `DiscountType`: PERCENTAGE, FLAT_AMOUNT, YOPO_LOGIC, FREE_ITEM, COMBO_PRICE
- `OfferRuleType`: YOPO, FREE_LENS, COMBO_PRICE, PERCENT_OFF, FLAT_OFF, BOGO_50

#### New Models Added:

1. **OfferRule** - Primary offer rules with complex conditions
   - Frame brand & sub-category matching
   - Frame MRP range filtering
   - Lens brand line & IT code matching
   - YOPO, COMBO_PRICE, FREE_ITEM, PERCENTAGE, FLAT_AMOUNT discount types
   - Second pair rule support
   - Priority-based ordering

2. **CategoryDiscount** - Customer category-based discounts
   - Student, Doctor, Teacher, etc. discounts
   - Brand-specific or universal (*)
   - Percentage with max cap

3. **Coupon** - Coupon code management
   - Min cart value requirements
   - Usage limits (per user, global)
   - Percentage or flat amount discounts

4. **OfferApplicationLog** - Audit trail for offer calculations
   - Stores calculation details for future reference

### 2. TypeScript Types & Interfaces

Created `/types/offer-engine.ts` with:
- `FrameInput`: Frame brand, subCategory, MRP, frameType
- `LensInput`: IT code, price, brandLine, yopoEligible
- `OfferCalculationInput`: Complete input structure
- `OfferCalculationResult`: Detailed breakdown with all discounts
- `OfferApplied`: Individual offer application details
- `PriceComponent`: Line-by-line price breakdown

### 3. Offer Engine Service

Created `/services/offer-engine.service.ts` implementing:

#### Waterfall Logic (Priority Order):
1. **Primary Offer** (COMBO_PRICE > YOPO > FREE_ITEM > PERCENTAGE/FLAT)
2. **Second Pair Offer** (if applicable)
3. **Customer Category Discount**
4. **Coupon Discount**

#### Key Methods:
- `calculateOffers()`: Main entry point
- `findApplicablePrimaryRule()`: Finds best matching primary rule
- `isRuleApplicable()`: Validates rule conditions
- `applyPrimaryRule()`: Applies YOPO, COMBO, FREE, PERCENT, FLAT logic
- `applySecondPairRule()`: Handles BOGO/second pair discounts
- `applyCategoryDiscount()`: Applies customer category discounts
- `applyCouponDiscount()`: Applies coupon codes

### 4. API Endpoints

#### Public Endpoints:

**POST `/api/offers/calculate`**
- Calculates offers for frame + lens combination
- Supports second pair via `secondPair` object in body
- Returns complete price breakdown

Request Body:
```json
{
  "frame": {
    "brand": "LENSTRACK",
    "subCategory": "ADVANCED",
    "mrp": 2500,
    "frameType": "FULL_RIM"
  },
  "lens": {
    "itCode": "D360ASV",
    "price": 2500,
    "brandLine": "DIGI360_ADVANCED",
    "yopoEligible": true
  },
  "customerCategory": "STUDENT",
  "couponCode": "WELCOME10",
  "organizationId": "..."
}
```

Response:
```json
{
  "success": true,
  "data": {
    "frameMRP": 2500,
    "lensPrice": 2500,
    "baseTotal": 5000,
    "effectiveBase": 4000,
    "offersApplied": [...],
    "priceComponents": [...],
    "categoryDiscount": {...},
    "couponDiscount": {...},
    "finalPayable": 4000
  }
}
```

#### Admin Endpoints:

**GET `/api/admin/offers/rules`**
- List all offer rules with filters (frameBrand, offerType, isActive)

**POST `/api/admin/offers/rules`**
- Create new offer rule

**PUT `/api/admin/offers/rules/[id]`**
- Update existing offer rule

**DELETE `/api/admin/offers/rules/[id]`**
- Delete offer rule

**GET `/api/admin/offers/category-discounts`**
- List category discounts

**POST `/api/admin/offers/category-discounts`**
- Create category discount

**GET `/api/admin/coupons`**
- List coupons

**POST `/api/admin/coupons`**
- Create coupon

### 5. Seed Data

Updated `/prisma/seed.ts` with sample data:

#### Offer Rules:
- LensTrack Advanced YOPO
- LensTrack Essential YOPO
- RayBan Premium Combo
- Buy Frame Get Free Lens
- RayBan 10% Frame Discount
- Flat ₹500 Off
- BOGO 50% Off Second Pair

#### Category Discounts:
- Student: 10% (max ₹500) - All brands
- Student: 15% (max ₹750) - LensTrack only
- Doctor: 15% (max ₹1000)
- Teacher: 12% (max ₹600)
- Senior Citizen: 10% (max ₹500)
- Armed Forces: 20% (max ₹1500)

#### Coupons:
- WELCOME10: 10% off (min ₹2000)
- FESTIVE500: ₹500 flat (min ₹3000)
- SAVE15: 15% off (min ₹5000)
- FLAT200: ₹200 flat (no minimum)

## Key Features

### YOPO (You Only Pay Once) Logic
- When both frame and lens qualify for YOPO
- Customer pays the higher of frame MRP or lens price
- Example: Frame ₹2500 + Lens ₹2500 = Pay ₹2500 (save ₹2500)

### Combo Price
- Fixed price for frame + lens combination
- Example: RayBan Premium Combo = ₹6000 fixed

### Free Lens
- Lens becomes free when frame qualifies
- Example: Buy LensTrack frame ₹3000+ = Free standard lens

### Category Discounts
- Applied after primary offer
- Percentage-based with maximum cap
- Brand-specific or universal

### Coupon Codes
- Applied last in waterfall
- Can have minimum cart value
- Percentage or flat amount

### Second Pair Offers
- BOGO (Buy One Get One) logic
- Percentage off on lower value pair
- Example: 50% off second pair

## Usage Example

```typescript
import { offerEngineService } from '@/services/offer-engine.service';

const result = await offerEngineService.calculateOffers({
  frame: {
    brand: 'LENSTRACK',
    subCategory: 'ADVANCED',
    mrp: 2500,
  },
  lens: {
    itCode: 'D360ASV',
    price: 2500,
    brandLine: 'DIGI360_ADVANCED',
    yopoEligible: true,
  },
  customerCategory: 'STUDENT',
  couponCode: 'WELCOME10',
  organizationId: '...',
});

console.log(`Final Payable: ₹${result.finalPayable}`);
console.log(`Total Savings: ₹${result.baseTotal - result.finalPayable}`);
```

## Next Steps

1. **Frontend Integration**: Create UI components for offer calculation
2. **Product Model Enhancement**: Consider adding `brandLine` and `yopoEligible` fields to Product model
3. **Order Integration**: Link offer calculations to order/invoice creation
4. **Analytics**: Track offer usage and effectiveness
5. **Testing**: Add unit tests for offer engine logic

## Files Created/Modified

### Created:
- `/types/offer-engine.ts` - TypeScript types
- `/services/offer-engine.service.ts` - Core offer engine logic
- `/app/api/offers/calculate/route.ts` - Public API endpoint
- `/app/api/admin/offers/rules/route.ts` - Admin rules management
- `/app/api/admin/offers/rules/[id]/route.ts` - Rule CRUD
- `/app/api/admin/offers/category-discounts/route.ts` - Category discounts
- `/app/api/admin/coupons/route.ts` - Coupon management

### Modified:
- `/prisma/schema.prisma` - Added new models and enums
- `/prisma/seed.ts` - Added sample data

## Testing

To test the implementation:

1. **Generate Prisma Client**:
   ```bash
   npm run db:generate
   ```

2. **Push Schema to Database**:
   ```bash
   npm run db:push
   ```

3. **Seed Database**:
   ```bash
   npm run db:seed
   ```

4. **Test API Endpoint**:
   ```bash
   curl -X POST http://localhost:3000/api/offers/calculate \
     -H "Content-Type: application/json" \
     -d '{
       "frame": {"brand": "LENSTRACK", "subCategory": "ADVANCED", "mrp": 2500},
       "lens": {"itCode": "D360ASV", "price": 2500, "brandLine": "DIGI360_ADVANCED", "yopoEligible": true},
       "customerCategory": "STUDENT",
       "organizationId": "YOUR_ORG_ID"
     }'
   ```

## Notes

- The offer engine is fully database-driven - no hardcoded logic
- All monetary values are rounded to nearest rupee
- Final payable is clamped to minimum 0 (no negative prices)
- Priority-based rule selection ensures best offer is applied
- Date-based validity checking for all offers, discounts, and coupons

