import { NextRequest } from 'next/server';
import { handleApiError, ValidationError } from '@/lib/errors';
import { z } from 'zod';

const convertPowerSchema = z.object({
  spectaclePower: z.object({
    odSphere: z.number().optional(),
    odCylinder: z.number().optional(),
    odAxis: z.number().optional(),
    odAdd: z.number().optional(),
    osSphere: z.number().optional(),
    osCylinder: z.number().optional(),
    osAxis: z.number().optional(),
    osAdd: z.number().optional(),
  }),
});

/**
 * POST /api/contact-lens/convert-power
 * Convert spectacle power to contact lens power
 * 
 * Conversion rules:
 * - SPH: Apply vertex distance compensation if |SPH| > 4.00D
 *   Formula: CL_SPH = SPH / (1 - (vertex_distance * SPH))
 *   Default vertex distance: 12mm (0.012m)
 * - CYL: Same as SPH (cylinder power doesn't change with vertex distance)
 * - AXIS: Same (axis remains unchanged)
 * - ADD: Map to standard ranges for multifocal
 *   +1.00 to +1.50 → LOW
 *   +1.75 to +2.25 → MED
 *   +2.50+ → HIGH
 *   Then round to nearest 0.25D
 */

// Vertex distance in meters (standard: 12mm = 0.012m)
const VERTEX_DISTANCE = 0.012;

/**
 * Convert sphere power with vertex distance compensation
 */
function convertSphere(sphere: number | null | undefined): number | null {
  if (sphere === null || sphere === undefined) return null;
  
  const absSphere = Math.abs(sphere);
  
  // Only apply vertex conversion if |SPH| > 4.00D
  if (absSphere <= 4.0) {
    return roundToQuarter(sphere);
  }
  
  // Vertex distance formula: CL_SPH = SPH / (1 - (d * SPH))
  // where d is vertex distance in meters
  const clSphere = sphere / (1 - (VERTEX_DISTANCE * sphere));
  
  return roundToQuarter(clSphere);
}

/**
 * Round to nearest 0.25D
 */
function roundToQuarter(value: number): number {
  return Math.round(value * 4) / 4;
}

/**
 * Map ADD power to standard multifocal ranges
 */
function mapMultifocalAdd(add: number | null | undefined): number | null {
  if (add === null || add === undefined || add <= 0) return null;
  
  // Map to standard ranges
  if (add >= 1.0 && add <= 1.5) {
    // LOW range: use midpoint
    return roundToQuarter(1.25);
  } else if (add >= 1.75 && add <= 2.25) {
    // MED range: use midpoint
    return roundToQuarter(2.0);
  } else if (add >= 2.5) {
    // HIGH range: round to nearest 0.25
    return roundToQuarter(add);
  } else {
    // Below 1.0, round to nearest 0.25
    return roundToQuarter(add);
  }
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
    const body = await request.json();
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
    const odClPower = {
      sphere: convertSphere(spectaclePower.odSphere),
      cylinder: spectaclePower.odCylinder !== undefined && spectaclePower.odCylinder !== null
        ? roundToQuarter(spectaclePower.odCylinder)
        : null,
      axis: spectaclePower.odAxis ?? null,
      add: mapMultifocalAdd(spectaclePower.odAdd),
    };

    // Convert left eye (OS)
    const osClPower = {
      sphere: convertSphere(spectaclePower.osSphere),
      cylinder: spectaclePower.osCylinder !== undefined && spectaclePower.osCylinder !== null
        ? roundToQuarter(spectaclePower.osCylinder)
        : null,
      axis: spectaclePower.osAxis ?? null,
      add: mapMultifocalAdd(spectaclePower.osAdd),
    };

    // Format for display
    const formatPower = (power: typeof odClPower) => {
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
        result += ` ADD +${power.add.toFixed(2)}`;
      }
      
      return result || 'Plano';
    };

    // Build conversion details
    const conversionDetails = {
      vertexConversionApplied: {
        od: spectaclePower.odSphere !== null && spectaclePower.odSphere !== undefined && Math.abs(spectaclePower.odSphere) > 4.0,
        os: spectaclePower.osSphere !== null && spectaclePower.osSphere !== undefined && Math.abs(spectaclePower.osSphere) > 4.0,
      },
      addMappingApplied: {
        od: spectaclePower.odAdd !== null && spectaclePower.odAdd !== undefined && spectaclePower.odAdd > 0,
        os: spectaclePower.osAdd !== null && spectaclePower.osAdd !== undefined && spectaclePower.osAdd > 0,
      },
      originalPower: spectaclePower,
      convertedPower: {
        od: odClPower,
        os: osClPower,
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
          od: formatPower(odClPower),
          os: formatPower(osClPower),
        },
        conversionApplied: true,
        conversionDetails,
      },
    });
  } catch (error: any) {
    console.error('[contact-lens/convert-power] Error:', error);
    return handleApiError(error);
  }
}

