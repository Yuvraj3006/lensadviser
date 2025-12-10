/**
 * Contact Lens Power Range Validation
 * Validates if a contact lens product supports a given power prescription
 */

export interface ContactLensPower {
  odSphere?: number | null;
  odCylinder?: number | null;
  odAxis?: number | null;
  odAdd?: number | null;
  osSphere?: number | null;
  osCylinder?: number | null;
  osAxis?: number | null;
  osAdd?: number | null;
}

export interface ContactLensProductPowerRange {
  sphMin?: number | null;
  sphMax?: number | null;
  cylMin?: number | null;
  cylMax?: number | null;
  axisSteps?: string | null; // JSON array of numbers
  addMin?: number | null;
  addMax?: number | null;
  lensType: 'SPHERICAL' | 'TORIC' | 'MULTIFOCAL' | 'COSMETIC';
}

export interface PowerValidationResult {
  isValid: boolean;
  reasons: string[]; // Reasons why power is not available
  warnings?: string[]; // Warnings (e.g., residual astigmatism)
  residualAstigmatism?: {
    od?: number;
    os?: number;
  };
}

/**
 * Check if a contact lens product supports the given power
 */
export function validateContactLensPower(
  power: ContactLensPower,
  product: ContactLensProductPowerRange
): PowerValidationResult {
  const reasons: string[] = [];

  // Helper to check if value is defined
  const isDefined = (val: number | null | undefined): val is number => {
    return val !== null && val !== undefined;
  };

  // Check SPH range for both eyes
  const checkSph = (sph: number | null | undefined, eye: 'OD' | 'OS') => {
    if (!isDefined(sph)) return true;

    if (product.sphMin !== null && product.sphMin !== undefined && sph < product.sphMin) {
      reasons.push(`${eye} Sphere (${sph}) is below minimum (${product.sphMin})`);
      return false;
    }
    if (product.sphMax !== null && product.sphMax !== undefined && sph > product.sphMax) {
      reasons.push(`${eye} Sphere (${sph}) is above maximum (${product.sphMax})`);
      return false;
    }
    return true;
  };

  // Check CYL range for both eyes
  const checkCyl = (cyl: number | null | undefined, eye: 'OD' | 'OS') => {
    if (!isDefined(cyl)) {
      // No cylinder specified - check if product requires it
      if (product.lensType === 'TORIC') {
        // Toric lenses require cylinder, but if not specified, we'll allow it (might be spherical power)
        return true;
      }
      return true;
    }

    const absCyl = Math.abs(cyl);
    
    // For spherical lenses, cylinder should be 0 or very small
    if (product.lensType === 'SPHERICAL' && absCyl > 0.01) {
      reasons.push(`${eye} has cylinder (${cyl}) but product is spherical only`);
      return false;
    }

    // For toric/multifocal, check CYL range
    if (product.lensType === 'TORIC' || product.lensType === 'MULTIFOCAL') {
      // If cylinder is 0 or very small, it's okay for multifocal but not ideal for toric
      if (product.lensType === 'TORIC' && absCyl < 0.01) {
        // Toric lens but no cylinder - might be okay if product supports low cylinder
        // Continue with range check
      }
      
      if (product.cylMin !== null && product.cylMin !== undefined) {
        const minCyl = Math.abs(product.cylMin);
        if (absCyl < minCyl) {
          reasons.push(`${eye} Cylinder (${cyl}) is below minimum (${product.cylMin})`);
          return false;
        }
      }
      if (product.cylMax !== null && product.cylMax !== undefined) {
        const maxCyl = Math.abs(product.cylMax);
        if (absCyl > maxCyl) {
          reasons.push(`${eye} Cylinder (${cyl}) is above maximum (${product.cylMax})`);
          return false;
        }
      }
    }

    return true;
  };

  // Check AXIS for toric lenses
  const checkAxis = (axis: number | null | undefined, eye: 'OD' | 'OS') => {
    if (!isDefined(axis)) {
      // Axis is required for toric lenses with cylinder
      if (product.lensType === 'TORIC') {
        const hasCyl = (eye === 'OD' && isDefined(power.odCylinder)) || 
                       (eye === 'OS' && isDefined(power.osCylinder));
        if (hasCyl && Math.abs((eye === 'OD' ? power.odCylinder : power.osCylinder) || 0) > 0.01) {
          reasons.push(`${eye} Axis is required for toric lenses with cylinder`);
          return false;
        }
      }
      return true;
    }

    // Validate axis range (0-180 degrees)
    if (axis < 0 || axis > 180) {
      reasons.push(`${eye} Axis (${axis}°) is out of valid range (0-180°)`);
      return false;
    }

    // Only check axis steps for toric lenses with cylinder
    if (product.lensType === 'TORIC') {
      const hasCyl = (eye === 'OD' && isDefined(power.odCylinder)) || 
                     (eye === 'OS' && isDefined(power.osCylinder));
      if (hasCyl && product.axisSteps) {
        try {
          const axisSteps = JSON.parse(product.axisSteps);
          if (Array.isArray(axisSteps) && axisSteps.length > 0) {
            // Check if axis matches any of the defined steps (within 1 degree tolerance)
            const matchesStep = axisSteps.some((step: number) => {
              const stepValue = typeof step === 'number' ? step : parseFloat(String(step));
              return Math.abs(axis - stepValue) <= 1; // 1 degree tolerance
            });

            if (!matchesStep) {
              // If steps are defined but axis doesn't match, check if it's a multiple of step size
              // For example, if steps are [0, 10, 20, ...], axis should be close to a multiple of 10
              const stepSize = axisSteps.length > 1 
                ? Math.abs(axisSteps[1] - axisSteps[0])
                : 10; // Default step size
              
              const normalizedAxis = Math.round(axis / stepSize) * stepSize;
              const tolerance = Math.min(stepSize / 2, 5); // 5 degree max tolerance
              
              if (Math.abs(axis - normalizedAxis) > tolerance) {
                reasons.push(`${eye} Axis (${axis}°) does not match available steps (${axisSteps.join(', ')})`);
                return false;
              }
            }
          }
        } catch (e) {
          // Invalid axisSteps JSON - skip axis step validation, but axis range is still valid
        }
      }
    }

    return true;
  };

  // Check ADD range for multifocal lenses
  const checkAdd = (add: number | null | undefined, eye: 'OD' | 'OS') => {
    if (!isDefined(add)) return true;

    // Only check ADD for multifocal lenses
    if (product.lensType === 'MULTIFOCAL') {
      if (product.addMin !== null && product.addMin !== undefined && add < product.addMin) {
        reasons.push(`${eye} Addition (${add}) is below minimum (${product.addMin})`);
        return false;
      }
      if (product.addMax !== null && product.addMax !== undefined && add > product.addMax) {
        reasons.push(`${eye} Addition (${add}) is above maximum (${product.addMax})`);
        return false;
      }
    } else if (add > 0.01) {
      // Non-multifocal lens but ADD is specified
      reasons.push(`${eye} has addition (${add}) but product is not multifocal`);
      return false;
    }

    return true;
  };

  // Calculate residual astigmatism for toric lenses
  const calculateResidualAstigmatism = (
    cyl: number | null | undefined,
    axis: number | null | undefined,
    clCyl: number | null | undefined,
    clAxis: number | null | undefined
  ): number | null => {
    if (!isDefined(cyl) || !isDefined(axis) || !isDefined(clCyl) || !isDefined(clAxis)) {
      return null;
    }

    // Convert to radians
    const cylRad = (cyl * Math.PI) / 180;
    const clCylRad = (clCyl * Math.PI) / 180;
    const axisRad = (axis * Math.PI) / 180;
    const clAxisRad = (clAxis * Math.PI) / 180;

    // Calculate residual astigmatism
    // RE = sqrt(C^2 + CA^2 - 2*C*CA*cos(theta))
    // where C = spectacle cylinder, CA = contact lens cylinder, theta = axis difference
    const theta = Math.abs(axisRad - clAxisRad);
    const C = Math.abs(cyl);
    const CA = Math.abs(clCyl);

    const residualAstigmatism = Math.sqrt(
      C * C + CA * CA - 2 * C * CA * Math.cos(theta)
    );

    return residualAstigmatism;
  };

  // Validate all power components
  const odSphValid = checkSph(power.odSphere, 'OD');
  const osSphValid = checkSph(power.osSphere, 'OS');
  const odCylValid = checkCyl(power.odCylinder, 'OD');
  const osCylValid = checkCyl(power.osCylinder, 'OS');
  const odAxisValid = checkAxis(power.odAxis, 'OD');
  const osAxisValid = checkAxis(power.osAxis, 'OS');
  const odAddValid = checkAdd(power.odAdd, 'OD');
  const osAddValid = checkAdd(power.osAdd, 'OS');

  const isValid = odSphValid && osSphValid && odCylValid && osCylValid && 
                  odAxisValid && osAxisValid && odAddValid && osAddValid;

  // Calculate residual astigmatism for toric lenses
  const warnings: string[] = [];
  const residualAstigmatism: { od?: number; os?: number } = {};

  if (product.lensType === 'TORIC') {
    // For toric lenses, calculate residual astigmatism
    // This is a simplified calculation - in practice, you'd use the actual CL power
    // For now, we'll calculate based on spectacle power and warn if > 0.75D
    
    // Note: This is a placeholder - actual residual astigmatism requires CL power
    // which would come from the converted power, not the spectacle power
    // This should be calculated after power conversion
    
    // For validation purposes, we'll just check if cylinder exists
    if (isDefined(power.odCylinder) && isDefined(power.odAxis)) {
      // In real implementation, this would use converted CL power
      // For now, we'll add a note that residual astigmatism should be checked
      warnings.push('Residual astigmatism should be calculated after power conversion');
    }
    if (isDefined(power.osCylinder) && isDefined(power.osAxis)) {
      warnings.push('Residual astigmatism should be calculated after power conversion');
    }
  }

  return {
    isValid,
    reasons,
    warnings: warnings.length > 0 ? warnings : undefined,
    residualAstigmatism: Object.keys(residualAstigmatism).length > 0 ? residualAstigmatism : undefined,
  };
}

/**
 * Calculate residual astigmatism for toric contact lenses
 * Formula: RE = sqrt(C^2 + CA^2 - 2*C*CA*cos(theta))
 * where C = spectacle cylinder, CA = contact lens cylinder, theta = axis difference
 */
export function calculateResidualAstigmatism(
  spectacleCyl: number,
  spectacleAxis: number,
  contactLensCyl: number,
  contactLensAxis: number
): number {
  // Convert to radians
  const cylRad = (spectacleCyl * Math.PI) / 180;
  const clCylRad = (contactLensCyl * Math.PI) / 180;
  const axisRad = (spectacleAxis * Math.PI) / 180;
  const clAxisRad = (contactLensAxis * Math.PI) / 180;

  // Calculate axis difference
  const theta = Math.abs(axisRad - clAxisRad);
  
  // Use absolute values for cylinder
  const C = Math.abs(spectacleCyl);
  const CA = Math.abs(contactLensCyl);

  // Calculate residual astigmatism
  const residualAstigmatism = Math.sqrt(
    C * C + CA * CA - 2 * C * CA * Math.cos(theta)
  );

  return Math.round(residualAstigmatism * 100) / 100; // Round to 2 decimal places
}

/**
 * Filter contact lens products by power eligibility
 */
export function filterProductsByPower(
  products: any[],
  power: ContactLensPower
): { eligible: any[]; ineligible: Array<{ product: any; reasons: string[] }> } {
  const eligible: any[] = [];
  const ineligible: Array<{ product: any; reasons: string[] }> = [];

  for (const product of products) {
    const validation = validateContactLensPower(power, {
      sphMin: product.sphMin,
      sphMax: product.sphMax,
      cylMin: product.cylMin,
      cylMax: product.cylMax,
      axisSteps: product.axisSteps,
      addMin: product.addMin,
      addMax: product.addMax,
      lensType: product.lensType,
    });

    if (validation.isValid) {
      eligible.push(product);
    } else {
      ineligible.push({
        product,
        reasons: validation.reasons,
      });
    }
  }

  return { eligible, ineligible };
}
