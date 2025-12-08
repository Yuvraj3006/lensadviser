// Lens Brand Lines - Fixed list
export const BRAND_LINES = [
  'DIGI360_ADVANCED',
  'DIGI360_ESSENTIAL',
  'DRIVEXPERT',
  'DURASHIELD_NATURE',
  'BLUEXPERT',
  'BLUEXPERT_ADVANCED',
  'CITYLIFE',
  'VISIONX_ULTRA',
  'VISIONX_NEO',
  'PUREVIEW',
  'HARDX',
  'RELAX_PLUS',
  'MYOCONTROL_INTRO',
  'MYOCONTROL_ADVANCED',
  'TINT_NEXT',
  'TINT_PREMIUM',
  'TINT_ESSENTIAL',
  'IGNITE_BLUEBAN',
  'IGNITE_NATURE',
  'IGNITE_DRIVE',
  'IGNITE_DIGITAL',
  'IGNITE_GOLD',
  'IGNITE_PLATINUM',
  'PROGRESSIVE_PLUS',
  'STANDARD',
  'PREMIUM',
  'OTHER',
] as const;

export type BrandLine = typeof BRAND_LINES[number];

// Specification Groups
export const SPEC_GROUPS = [
  'OPTICAL_DESIGN',
  'MATERIAL',
  'COATING',
  'INDEX_USAGE',
  'LIFESTYLE_TAG',
] as const;

export type SpecGroup = typeof SPEC_GROUPS[number];

