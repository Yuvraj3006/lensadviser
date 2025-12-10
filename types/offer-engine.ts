/**
 * Offer Engine TypeScript Types
 * Based on LensTrack Offer Engine Backend Specification
 */

// Frame input - manually entered
export interface FrameInput {
  brand: string; // "LENSTRACK", "RAYBAN", etc.
  subCategory?: string | null; // "ESSENTIAL", "ALFA", etc. for LensTrack
  mrp: number; // Frame MRP
  frameType?: 'FULL_RIM' | 'HALF_RIM' | 'RIMLESS';
}

// Lens input - selected from LensProduct
export interface LensInput {
  itCode: string; // SKU
  price: number; // Offer Price from product catalog
  brandLine: string; // BrandLine enum string
  yopoEligible: boolean;
}

export type CustomerCategoryCode =
  | 'STUDENT'
  | 'DOCTOR'
  | 'TEACHER'
  | 'ARMED_FORCES'
  | 'SENIOR_CITIZEN'
  | 'CORPORATE'
  | 'REGULAR';

// Breakdown line item
export interface PriceComponent {
  label: string; // e.g. "Frame MRP", "Lens Offer Price", "YOPO - Pay Higher"
  amount: number; // positive or negative
  meta?: Record<string, any>;
}

export interface OfferApplied {
  ruleCode: string; // OfferRule.code or special code e.g. "YOPO_AUTO"
  description: string; // human readable summary
  savings: number; // how much saved by this step
}

export interface ContactLensItem {
  type: 'CONTACT_LENS';
  brand: string;
  mrp: number;
  finalPrice: number;
  quantity?: number;
}

export interface AccessoryItem {
  type: 'ACCESSORY';
  brand: string;
  mrp: number;
  finalPrice: number;
  quantity?: number;
}

export interface OfferCalculationInput {
  frame?: FrameInput | null; // Optional for "Only Lens" flow
  lens?: LensInput | null; // Optional for CONTACT_LENS_ONLY mode
  customerCategory?: CustomerCategoryCode | null;
  couponCode?: string | null;
  // For second pair flow
  secondPair?: {
    enabled: boolean;
    firstPairTotal: number; // total of first pair (frame + lens)
    secondPairFrameMRP?: number;
    secondPairLensPrice?: number;
  } | null;
  organizationId: string; // Required for fetching rules
  storeId?: string | null; // Optional: for store-based offer activation
  // For CONTACT_LENS_ONLY mode
  mode?: 'FRAME_AND_LENS' | 'ONLY_LENS' | 'CONTACT_LENS_ONLY';
  otherItems?: (ContactLensItem | AccessoryItem)[]; // For CL and accessories
}

export interface UpsellSuggestion {
  type: 'BONUS_FREE_PRODUCT' | 'UPGRADE_LENS' | 'ADD_ON_FEATURE';
  message: string; // e.g., "Add ₹500 more to unlock FREE Sunglasses worth ₹1499"
  rewardText: string; // e.g., "FREE Sunglasses worth ₹1499"
  remaining: number; // Amount needed to unlock (e.g., 500)
}

export interface OfferCalculationResult {
  frameMRP: number;
  lensPrice: number;
  baseTotal: number; // frameMRP + lensPrice before any offer
  effectiveBase: number; // price after primary offer (combo/YOPO/flat/percent)
  offersApplied: OfferApplied[];
  priceComponents: PriceComponent[];
  categoryDiscount?: OfferApplied | null;
  couponDiscount?: OfferApplied | null;
  couponError?: string | null; // Error message if coupon validation failed
  secondPairDiscount?: OfferApplied | null;
  bonusProduct?: OfferApplied | null; // Bonus free product (doesn't reduce price, free add-on)
  finalPayable: number;
  upsell?: UpsellSuggestion | null; // V2: Dynamic Upsell Engine
}

