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
 * Updated Conversion Rules (V2):
 * 
 * A. Spherical vs Toric Decision:
 *    - If |CYL| ≤ 0.50 → Spherical lens (use Spherical Equivalent)
 *    - If |CYL| ≥ 0.75 → Toric lens (keep cylinder, convert sphere only)
 * 
 * B. Spherical Equivalent (for non-toric):
 *    - SE = SPH + (CYL / 2)
 *    - CYL_CL = 0
 *    - AXIS_CL = null
 * 
 * C. Vertex Conversion (spectacle → CL):
 *    - If |SPH| < 4.00 D → no vertex (CL = spectacle power)
 *    - If |SPH| ≥ 4.00 D → F_cl = F_s / (1 - 0.012 * F_s)
 *    - Always round CL sphere to nearest 0.25 D
 * 
 * D. Toric Logic:
 *    - Do NOT convert cylinder (keep CYL same)
 *    - Vertex-convert sphere only
 *    - Keep AXIS same (later snap to nearest product axis)
 * 
 * E. Multifocal (ADD) Logic:
 *    - Do NOT vertex-convert ADD
 *    - Map ADD to categories:
 *      • 0.75–1.50 → LOW
 *      • 1.75–2.25 → MEDIUM
 *      • 2.50+ → HIGH
 *    - Or map to discrete values: +1.25, +1.75, +2.25, +2.75
 */

// Vertex distance in meters (standard: 12mm = 0.012m)
const VERTEX_DISTANCE = 0.012;
const TORIC_THRESHOLD = 0.75;
const SPHERICAL_EQ_THRESHOLD = 0.50;
const VERTEX_THRESHOLD = 4.00;

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
 * Only applies if |SPH| ≥ 4.00 D
 */
function vertexConvertSphere(sph: number): number {
  const absSph = Math.abs(sph);
  
  // No vertex conversion below 4.00 D
  if (absSph < VERTEX_THRESHOLD) {
    return roundToQuarter(sph);
  }
  
  // Apply vertex formula: F_cl = F_s / (1 - d * F_s)
  const clSphere = sph / (1 - VERTEX_DISTANCE * sph);
  
  // Round to nearest 0.25 D
  return roundToQuarter(clSphere);
}

/**
 * Map ADD to category or discrete value
 * Returns both category and numeric value
 */
function mapMultifocalAdd(add: number | null | undefined): {
  value: number | null;
  category: 'LOW' | 'MEDIUM' | 'HIGH' | null;
} {
  if (add === null || add === undefined || add <= 0.5) {
    return { value: null, category: null };
  }
  
  // Map to discrete values and categories
  // Rule: Do NOT vertex-convert ADD (effect is negligible)
  // Mapping:
  //   0.75–1.50 → +1.25 (LOW)
  //   1.75–2.00 → +1.75 (MEDIUM)
  //   2.00–2.25 → +2.25 (MEDIUM)
  //   2.50+ → +2.75 (HIGH)
  //   >3.00 → use highest available +2.75 (with warning)
  
  let value: number;
  let category: 'LOW' | 'MEDIUM' | 'HIGH';
  
  if (add <= 1.50) {
    // 0.75–1.50 → LOW
    value = 1.25;
    category = 'LOW';
  } else if (add < 1.75) {
    // 1.50–1.75: map to nearest (1.75)
    value = 1.75;
    category = 'MEDIUM';
  } else if (add <= 2.00) {
    // 1.75–2.00 → MEDIUM
    value = 1.75;
    category = 'MEDIUM';
  } else if (add <= 2.25) {
    // 2.00–2.25 → MEDIUM
    value = 2.25;
    category = 'MEDIUM';
  } else if (add < 2.50) {
    // 2.25–2.50: map to nearest (2.25)
    value = 2.25;
    category = 'MEDIUM';
  } else {
    // 2.50+ → HIGH
    value = 2.75;
    category = 'HIGH';
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
  addCategory: 'LOW' | 'MEDIUM' | 'HIGH' | null;
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
  
  // 1) Decide spherical vs toric
  // Rule: If |CYL| <= 0.50 → Spherical lens (use Spherical Equivalent)
  //       If |CYL| >= 0.75 → Toric lens (keep cylinder, convert sphere only)
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
  }
  // If toric (|CYL| >= 0.75), keep cylinder and axis as-is, only convert sphere
  
  // 2) Vertex convert sphere (or SE if spherical equivalent was used)
  // Rule: If |SPH| < 4.00 D → no vertex (CL = spectacle power)
  //       If |SPH| >= 4.00 D → F_cl = F_s / (1 - 0.012 * F_s)
  //       Always round CL sphere to nearest 0.25 D
  const clSphere = vertexConvertSphere(sphSpec);
  
  // 3) Toric cylinder / axis
  // Rule: For toric (|CYL| >= 0.75), keep CYL same, keep AXIS same
  //       For spherical (|CYL| <= 0.50), CYL = 0, AXIS = null
  const clCyl = isToricLens ? cylSpec : 0;
  const clAxis = isToricLens ? axisSpec : null;
  
  // 4) Multifocal add mapping
  const addMapping = mapMultifocalAdd(eye.add);
  
  return {
    sphere: clSphere,
    cylinder: clCyl !== 0 ? roundToQuarter(clCyl) : null,
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
    const formatPower = (power: typeof odClPower, conversionInfo?: { addCategory?: 'LOW' | 'MEDIUM' | 'HIGH' | null }) => {
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

