import { NextRequest } from 'next/server';
import { handleApiError, ValidationError } from '@/lib/errors';
import { z } from 'zod';

const convertPowerSchema = z.object({
  spectaclePower: z.object({
    odSphere: z.number().nullable().optional(),
    odCylinder: z.number().nullable().optional(),
    odAxis: z.number().nullable().optional(),
    odAdd: z.number().nullable().optional(),
    osSphere: z.number().nullable().optional(),
    osCylinder: z.number().nullable().optional(),
    osAxis: z.number().nullable().optional(),
    osAdd: z.number().nullable().optional(),
  }),
});

/**
 * POST /api/contact-lens/convert-power
 * Convert spectacle power to contact lens power
 * 
 * FINAL STANDARD DOCUMENT (V3) - Based on Clinical Guidelines
 * 
 * 0️⃣ CORE PRINCIPLE
 * Spectacle lenses sit ~12mm away from eye, contact lenses sit on cornea.
 * Higher powers require vertex distance correction.
 * 
 * 1️⃣ UNIVERSAL VERTEX CONVERSION FORMULA
 * CL Power = F / (1 − d × F)
 * Where: F = Spectacle power (diopters), d = 0.012m (12mm)
 * 
 * 2️⃣ SPHERICAL CONTACT LENS CONVERSION
 * - When to Convert: |SPH| ≥ ±4.00 D
 * - If |SPH| ≤ ±3.75 D → No conversion required
 * - Always round to nearest 0.25 D
 * - Auto-conversion allowed up to ±10.00 D
 * 
 * 3️⃣ TORIC CONTACT LENS CONVERSION (CRITICAL)
 * Clinical Rule: For toric lenses, CYL may change after conversion.
 * Correct method: Convert both principal meridians, then recombine.
 * 
 * Step-by-Step:
 * 1. Identify principal meridians:
 *    - Meridian 1 = SPH
 *    - Meridian 2 = SPH + CYL
 * 2. Vertex convert both meridians separately
 * 3. Recombine:
 *    - New SPH = weaker (less minus/more plus) meridian
 *    - New CYL = difference between converted meridians
 *    - Axis = same as spectacle axis
 * 
 * Example: -4.00 / -3.00 × 180
 * - Meridians: -4.00 @180, -7.00 @90
 * - Convert: -4.00 → -3.75, -7.00 → -6.50
 * - Recombine: SPH = -3.75, CYL = -2.75, Axis = 180
 * 
 * Toric Eligibility: CYL ≥ -0.75 (toric), CYL < -0.75 (spherical)
 * 
 * 4️⃣ MULTIFOCAL CONTACT LENS CONVERSION
 * - Do NOT vertex-convert ADD
 * - Map ADD to categories:
 *   • +0.75 – +1.25 → LOW
 *   • +1.50 – +1.75 → MID
 *   • +2.00 – +3.00 → HIGH
 * 
 * 5️⃣ AUTO-CONVERSION LIMITS
 * - Spherical: ±10.00 D
 * - Toric: CYL up to -2.75
 * - Beyond limits → Optometrist review required
 */

// Vertex distance in meters (standard: 12mm = 0.012m)
const VERTEX_DISTANCE = 0.012;
const TORIC_THRESHOLD = 0.75; // CYL ≥ -0.75 → Toric
const SPHERICAL_EQ_THRESHOLD = 0.50; // CYL ≤ 0.50 → Use spherical equivalent
const VERTEX_THRESHOLD = 4.00; // |SPH| ≥ 4.00 D → Vertex conversion required
const MAX_AUTO_SPH = 10.00; // Auto-conversion limit for spherical
const MAX_AUTO_CYL = 2.75; // Auto-conversion limit for toric CYL

/**
 * Round to nearest 0.25D
 */
function roundToQuarter(value: number): number {
  return Math.round(value * 4) / 4;
}

/**
 * Check if prescription requires toric lens
 * Toric CLs start at -0.75 cyl, so if |CYL| >= 0.75 → Toric
 */
function isToric(cyl: number | null | undefined): boolean {
  if (cyl === null || cyl === undefined) return false;
  return Math.abs(cyl) >= TORIC_THRESHOLD;
}

/**
 * Check if should use spherical equivalent
 * If |CYL| <= 0.50 → use Spherical Equivalent
 */
function useSphericalEquivalent(cyl: number | null | undefined): boolean {
  if (cyl === null || cyl === undefined) return false;
  const absCyl = Math.abs(cyl);
  return absCyl > 0 && absCyl <= SPHERICAL_EQ_THRESHOLD;
}

/**
 * Vertex convert sphere power
 * Formula: CL Power = F / (1 − d × F)
 * Only applies if |SPH| ≥ 4.00 D
 * 
 * @param sph Spectacle sphere power
 * @returns Contact lens sphere power (rounded to 0.25 D)
 */
function vertexConvertSphere(sph: number): number {
  const absSph = Math.abs(sph);
  
  // No vertex conversion if |SPH| ≤ 3.75 D (threshold is 4.00)
  if (absSph < VERTEX_THRESHOLD) {
    return roundToQuarter(sph);
  }
  
  // Apply vertex formula: F_cl = F_s / (1 - d * F_s)
  // Where d = 0.012m (12mm vertex distance)
  const clSphere = sph / (1 - VERTEX_DISTANCE * sph);
  
  // Round to nearest 0.25 D
  return roundToQuarter(clSphere);
}

/**
 * Convert toric prescription using principal meridians method
 * This is the clinically correct method for toric conversion.
 * 
 * Steps:
 * 1. Identify principal meridians (SPH and SPH + CYL)
 * 2. Vertex convert both meridians separately
 * 3. Recombine: SPH = weaker meridian, CYL = difference, Axis = same
 * 
 * @param sph Spectacle sphere
 * @param cyl Spectacle cylinder (negative value)
 * @param axis Spectacle axis
 * @returns Converted contact lens power {sphere, cylinder, axis}
 */
function convertToricByPrincipalMeridians(
  sph: number,
  cyl: number,
  axis: number
): { sphere: number; cylinder: number; axis: number } {
  // Step 1: Identify principal meridians
  // Meridian 1 = SPH (at the axis)
  // Meridian 2 = SPH + CYL (perpendicular to axis)
  const meridian1 = sph;
  const meridian2 = sph + cyl; // CYL is negative, so this is more minus
  
  // Step 2: Vertex convert both meridians separately
  const convertedMeridian1 = vertexConvertSphere(meridian1);
  const convertedMeridian2 = vertexConvertSphere(meridian2);
  
  // Step 3: Recombine
  // New SPH = weaker (less minus / more plus) meridian
  // New CYL = difference between the two converted meridians
  // Axis = same as spectacle axis
  
  // Determine which meridian is weaker (less minus or more plus)
  const weakerMeridian = convertedMeridian1 > convertedMeridian2 
    ? convertedMeridian1  // Less minus (or more plus)
    : convertedMeridian2;
  
  const strongerMeridian = convertedMeridian1 > convertedMeridian2
    ? convertedMeridian2  // More minus (or less plus)
    : convertedMeridian1;
  
  // New SPH = weaker meridian
  const clSphere = weakerMeridian;
  
  // New CYL = difference between meridians (always negative)
  const clCyl = strongerMeridian - weakerMeridian;
  
  // Axis remains the same
  const clAxis = axis;
  
  return {
    sphere: clSphere,
    cylinder: roundToQuarter(clCyl),
    axis: clAxis,
  };
}

/**
 * Map ADD to category according to FINAL STANDARD DOCUMENT
 * Returns both category and numeric value
 * 
 * Mapping:
 * - +0.75 – +1.25 → LOW
 * - +1.50 – +1.75 → MID
 * - +2.00 – +3.00 → HIGH
 * 
 * Note: Do NOT vertex-convert ADD (effect is negligible)
 */
function mapMultifocalAdd(add: number | null | undefined): {
  value: number | null;
  category: 'LOW' | 'MID' | 'HIGH' | null;
} {
  if (add === null || add === undefined || add < 0.75) {
    return { value: null, category: null };
  }
  
  let value: number;
  let category: 'LOW' | 'MID' | 'HIGH';
  
  if (add >= 0.75 && add <= 1.25) {
    // +0.75 – +1.25 → LOW
    value = 1.25;
    category = 'LOW';
  } else if (add >= 1.50 && add <= 1.75) {
    // +1.50 – +1.75 → MID
    value = 1.75;
    category = 'MID';
  } else if (add >= 2.00 && add <= 3.00) {
    // +2.00 – +3.00 → HIGH
    value = 2.75; // Use highest available value for HIGH category
    category = 'HIGH';
  } else if (add > 3.00) {
    // Beyond 3.00 → Use HIGH (with note that optometrist review may be needed)
    value = 2.75;
    category = 'HIGH';
  } else {
    // Edge case: 1.26 - 1.49 → map to nearest (LOW)
    value = 1.25;
    category = 'LOW';
  }
  
  return { value, category };
}

/**
 * Convert single eye prescription to contact lens power
 */
function convertEyeToContactLens(eye: {
  sph: number | null | undefined;
  cyl: number | null | undefined;
  axis: number | null | undefined;
  add?: number | null | undefined;
}): {
  sphere: number | null;
  cylinder: number | null;
  axis: number | null;
  add: number | null;
  addCategory: 'LOW' | 'MID' | 'HIGH' | null;
  isToric: boolean;
  usedSphericalEquivalent: boolean;
} {
  if (eye.sph === null || eye.sph === undefined) {
    return {
      sphere: null,
      cylinder: null,
      axis: null,
      add: null,
      addCategory: null,
      isToric: false,
      usedSphericalEquivalent: false,
    };
  }
  
  let sphSpec = eye.sph;
  let cylSpec = eye.cyl ?? 0;
  let axisSpec = eye.axis ?? null;
  const isToricLens = isToric(cylSpec);
  const isSphericalEq = useSphericalEquivalent(cylSpec);
  let usedSphericalEquivalent = false;
  
  // Map multifocal ADD early (needed for all return paths)
  const addMapping = mapMultifocalAdd(eye.add);
  
  // Check auto-conversion limits
  const absSph = Math.abs(sphSpec);
  const absCyl = Math.abs(cylSpec);
  
  // Validate auto-conversion limits
  if (absSph > MAX_AUTO_SPH) {
    // Beyond auto-conversion limit - would need optometrist review
    // For now, still convert but note the limit
    console.warn(`[convert-power] SPH ${sphSpec} exceeds auto-conversion limit of ±${MAX_AUTO_SPH} D`);
  }
  
  if (isToricLens && absCyl > MAX_AUTO_CYL) {
    // Beyond auto-conversion limit for toric
    console.warn(`[convert-power] CYL ${cylSpec} exceeds auto-conversion limit of -${MAX_AUTO_CYL} D`);
  }
  
  // 1) Decide spherical vs toric
  // Rule: If |CYL| < 0.75 → Spherical lens (use Spherical Equivalent if CYL > 0)
  //       If |CYL| >= 0.75 → Toric lens (convert using principal meridians method)
  if (!isToricLens) {
    // Not toric: use spherical equivalent if CYL exists (|CYL| <= 0.50)
    if (Math.abs(cylSpec) > 0.01) {
      // Spherical equivalent flow: SE = SPH + (CYL / 2)
      sphSpec = sphSpec + cylSpec / 2;
      cylSpec = 0;
      axisSpec = null;
      usedSphericalEquivalent = true;
    }
    // If CYL is 0 or very small, keep sphere as-is (no SE needed)
    
    // 2) Vertex convert sphere (or SE if spherical equivalent was used)
    // Rule: If |SPH| < 4.00 D → no vertex (CL = spectacle power)
    //       If |SPH| >= 4.00 D → F_cl = F_s / (1 - 0.012 * F_s)
    const clSphere = vertexConvertSphere(sphSpec);
    const clCyl = 0;
    const clAxis = null;
    
    return {
      sphere: clSphere,
      cylinder: null,
      axis: null,
      add: addMapping.value,
      addCategory: addMapping.category,
      isToric: false,
      usedSphericalEquivalent,
    };
  }
  
  // Toric conversion: Use principal meridians method (CLINICALLY CORRECT)
  // This is the critical fix: convert both meridians separately, then recombine
  if (axisSpec === null || axisSpec === undefined) {
    // If no axis provided but CYL >= 0.75, this is an error
    // Fall back to spherical equivalent
    const seSph = sphSpec + cylSpec / 2;
    const clSphere = vertexConvertSphere(seSph);
    return {
      sphere: clSphere,
      cylinder: null,
      axis: null,
      add: addMapping.value,
      addCategory: addMapping.category,
      isToric: false,
      usedSphericalEquivalent: true,
    };
  }
  
  // Convert using principal meridians method
  const toricResult = convertToricByPrincipalMeridians(sphSpec, cylSpec, axisSpec);
  
  const clSphere = toricResult.sphere;
  const clCyl = toricResult.cylinder;
  const clAxis = toricResult.axis;
  
  return {
    sphere: clSphere,
    cylinder: clCyl !== 0 ? clCyl : null,
    axis: clAxis,
    add: addMapping.value,
    addCategory: addMapping.category,
    isToric: isToricLens,
    usedSphericalEquivalent,
  };
}

/**
 * Validate power values
 */
function validatePower(power: {
  odSphere?: number | null;
  odCylinder?: number | null;
  odAxis?: number | null;
  odAdd?: number | null;
  osSphere?: number | null;
  osCylinder?: number | null;
  osAxis?: number | null;
  osAdd?: number | null;
}): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Validate SPH range (typically -20.00 to +20.00)
  const validateSphere = (sph: number | undefined | null, eye: string) => {
    if (sph !== undefined && sph !== null && (sph < -20 || sph > 20)) {
      errors.push(`${eye} Sphere power (${sph}) is outside valid range (-20.00 to +20.00)`);
    }
  };

  // Validate CYL range (typically -6.00 to 0.00)
  const validateCylinder = (cyl: number | undefined | null, eye: string) => {
    if (cyl !== undefined && cyl !== null && (cyl < -6 || cyl > 0)) {
      errors.push(`${eye} Cylinder power (${cyl}) is outside valid range (-6.00 to 0.00)`);
    }
  };

  // Validate AXIS range (0-180)
  const validateAxis = (axis: number | undefined | null, eye: string) => {
    if (axis !== undefined && axis !== null && (axis < 0 || axis > 180)) {
      errors.push(`${eye} Axis (${axis}°) is outside valid range (0-180)`);
    }
  };

  // Validate ADD range (typically +0.75 to +3.50)
  const validateAdd = (add: number | undefined | null, eye: string) => {
    if (add !== undefined && add !== null && (add < 0 || add > 4)) {
      errors.push(`${eye} Addition power (${add}) is outside valid range (+0.75 to +3.50)`);
    }
  };

  // Validate that if CYL is present, AXIS is also present
  const validateCylAxis = (cyl: number | undefined | null, axis: number | undefined | null, eye: string) => {
    if (cyl !== undefined && cyl !== null && Math.abs(cyl) > 0.01 && (axis === undefined || axis === null)) {
      errors.push(`${eye} Axis is required when cylinder is specified`);
    }
  };

  validateSphere(power.odSphere, 'OD');
  validateSphere(power.osSphere, 'OS');
  validateCylinder(power.odCylinder, 'OD');
  validateCylinder(power.osCylinder, 'OS');
  validateAxis(power.odAxis, 'OD');
  validateAxis(power.osAxis, 'OS');
  validateAdd(power.odAdd, 'OD');
  validateAdd(power.osAdd, 'OS');
  validateCylAxis(power.odCylinder, power.odAxis, 'OD');
  validateCylAxis(power.osCylinder, power.osAxis, 'OS');

  return {
    valid: errors.length === 0,
    errors,
  };
}

export async function POST(request: NextRequest) {
  try {
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      throw new ValidationError('Invalid JSON in request body');
    }

    const validated = convertPowerSchema.parse(body);

    const { spectaclePower } = validated;

    // Validate power values
    const validation = validatePower(spectaclePower);
    if (!validation.valid) {
      return Response.json({
        success: false,
        error: {
          message: 'Invalid power values',
          details: validation.errors,
        },
      }, { status: 400 });
    }

    // Convert right eye (OD)
    const odConversion = convertEyeToContactLens({
      sph: spectaclePower.odSphere,
      cyl: spectaclePower.odCylinder,
      axis: spectaclePower.odAxis,
      add: spectaclePower.odAdd,
    });

    // Convert left eye (OS)
    const osConversion = convertEyeToContactLens({
      sph: spectaclePower.osSphere,
      cyl: spectaclePower.osCylinder,
      axis: spectaclePower.osAxis,
      add: spectaclePower.osAdd,
    });

    // Format for backward compatibility
    const odClPower = {
      sphere: odConversion.sphere,
      cylinder: odConversion.cylinder,
      axis: odConversion.axis,
      add: odConversion.add,
    };

    const osClPower = {
      sphere: osConversion.sphere,
      cylinder: osConversion.cylinder,
      axis: osConversion.axis,
      add: osConversion.add,
    };

    // Format for display
    const formatPower = (power: typeof odClPower, conversionInfo?: { addCategory?: 'LOW' | 'MID' | 'HIGH' | null }) => {
      if (power.sphere === null && power.cylinder === null) return 'Plano';
      
      let result = '';
      if (power.sphere !== null) {
        result += power.sphere >= 0 ? `+${power.sphere.toFixed(2)}` : power.sphere.toFixed(2);
      }
      
      if (power.cylinder !== null && power.cylinder !== 0) {
        result += ` / ${power.cylinder >= 0 ? `+${power.cylinder.toFixed(2)}` : power.cylinder.toFixed(2)}`;
        if (power.axis !== null) {
          result += ` × ${power.axis}`;
        }
      }
      
      if (power.add !== null && power.add > 0) {
        const addCategory = conversionInfo?.addCategory;
        if (addCategory) {
          result += ` ADD +${power.add.toFixed(2)} (${addCategory})`;
        } else {
          result += ` ADD +${power.add.toFixed(2)}`;
        }
      }
      
      return result || 'Plano';
    };

    // Calculate exact conversion values (before rounding) for display
    const getExactConversion = (sph: number | null | undefined) => {
      if (sph === null || sph === undefined || Math.abs(sph) < 0.01) return null;
      const absSph = Math.abs(sph);
      if (absSph < VERTEX_THRESHOLD) return sph;
      return sph / (1 - VERTEX_DISTANCE * sph);
    };

    // Build conversion details
    const conversionDetails = {
      vertexConversionApplied: {
        od: spectaclePower.odSphere !== null && spectaclePower.odSphere !== undefined && Math.abs(spectaclePower.odSphere) >= VERTEX_THRESHOLD,
        os: spectaclePower.osSphere !== null && spectaclePower.osSphere !== undefined && Math.abs(spectaclePower.osSphere) >= VERTEX_THRESHOLD,
      },
      addMappingApplied: {
        od: spectaclePower.odAdd !== null && spectaclePower.odAdd !== undefined && spectaclePower.odAdd > 0.5,
        os: spectaclePower.osAdd !== null && spectaclePower.osAdd !== undefined && spectaclePower.osAdd > 0.5,
      },
      originalPower: spectaclePower,
      convertedPower: {
        od: odClPower,
        os: osClPower,
      },
      conversionInfo: {
        od: {
          isToric: odConversion.isToric,
          usedSphericalEquivalent: odConversion.usedSphericalEquivalent,
          addCategory: odConversion.addCategory,
        },
        os: {
          isToric: osConversion.isToric,
          usedSphericalEquivalent: osConversion.usedSphericalEquivalent,
          addCategory: osConversion.addCategory,
        },
      },
      exactConversion: {
        od: {
          sphere: getExactConversion(spectaclePower.odSphere),
        },
        os: {
          sphere: getExactConversion(spectaclePower.osSphere),
        },
      },
    };

    return Response.json({
      success: true,
      data: {
        contactLensPower: {
          od: odClPower,
          os: osClPower,
        },
        formatted: {
          od: formatPower(odClPower, { addCategory: odConversion.addCategory }),
          os: formatPower(osClPower, { addCategory: osConversion.addCategory }),
        },
        conversionApplied: true,
        conversionDetails,
      },
    });
  } catch (error: any) {
    console.error('[contact-lens/convert-power] Error:', error);
    
    // Handle Zod validation errors
    if (error instanceof z.ZodError) {
      return Response.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Validation failed',
            details: error.issues,
          },
        },
        { status: 400 }
      );
    }
    
    return handleApiError(error);
  }
}

