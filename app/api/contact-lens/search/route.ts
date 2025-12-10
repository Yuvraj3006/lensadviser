import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleApiError, ValidationError } from '@/lib/errors';
import { z } from 'zod';
import { filterProductsByPower, validateContactLensPower } from '@/lib/contact-lens-power-validation';

const searchSchema = z.object({
  mode: z.enum(['SPECTACLE', 'CONTACT_LENS']),
  spectaclePower: z.object({
    odSphere: z.number().optional(),
    odCylinder: z.number().optional(),
    odAxis: z.number().optional(),
    odAdd: z.number().optional(),
    osSphere: z.number().optional(),
    osCylinder: z.number().optional(),
    osAxis: z.number().optional(),
    osAdd: z.number().optional(),
  }).optional(),
  contactLensPower: z.object({
    odSphere: z.number().optional(),
    odCylinder: z.number().optional(),
    odAxis: z.number().optional(),
    odAdd: z.number().optional(),
    osSphere: z.number().optional(),
    osCylinder: z.number().optional(),
    osAxis: z.number().optional(),
    osAdd: z.number().optional(),
  }).optional(),
  brand: z.string().optional(),
  line: z.string().optional(),
  packType: z.enum(['DAILY', 'MONTHLY', 'YEARLY']).optional(),
  modality: z.enum(['DAILY', 'BIWEEKLY', 'MONTHLY', 'YEARLY']).optional(),
  lensType: z.enum(['SPHERICAL', 'TORIC', 'MULTIFOCAL', 'COSMETIC']).optional(),
});

/**
 * POST /api/contact-lens/search
 * Search contact lens products with power filtering
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = searchSchema.parse(body);

    // Determine which power to use
    const powerToUse = validated.mode === 'SPECTACLE' 
      ? validated.spectaclePower 
      : validated.contactLensPower;

    if (!powerToUse) {
      throw new ValidationError('Power data is required');
    }

    // Fetch all active contact lens products directly from ContactLensProduct model
    const whereClause: any = {
      isActive: true,
    };

    if (validated.brand) {
      whereClause.brand = {
        contains: validated.brand,
        mode: 'insensitive',
      };
    }

    if (validated.line) {
      whereClause.line = {
        contains: validated.line,
        mode: 'insensitive',
      };
    }

    if ((validated as any).modality) {
      whereClause.modality = (validated as any).modality;
    } else if (validated.packType) {
      // Map packType to modality if modality not provided
      const packTypeToModality: Record<string, string> = {
        'DAILY': 'DAILY',
        'MONTHLY': 'MONTHLY',
        'YEARLY': 'YEARLY',
      };
      if (packTypeToModality[validated.packType]) {
        whereClause.modality = packTypeToModality[validated.packType] as any;
      }
    }

    if ((validated as any).lensType) {
      whereClause.lensType = (validated as any).lensType;
    }

    const contactLensProducts = await (prisma as any).contactLensProduct.findMany({
      where: whereClause,
    });

    // Enhanced power range validation using dedicated validation function
    const { eligible, ineligible } = filterProductsByPower(
      contactLensProducts,
      {
        odSphere: powerToUse.odSphere,
        odCylinder: powerToUse.odCylinder,
        odAxis: powerToUse.odAxis,
        odAdd: powerToUse.odAdd,
        osSphere: powerToUse.osSphere,
        osCylinder: powerToUse.osCylinder,
        osAxis: powerToUse.osAxis,
        osAdd: powerToUse.osAdd,
      }
    );

    // Map eligible products to response format
    const filteredProducts = eligible.map((product) => {
      return {
        id: product.id,
        name: `${product.brand} ${product.line}`,
        brand: product.brand,
        line: product.line,
        subBrand: null,
        mrp: product.mrp,
        offerPrice: product.offerPrice,
        sku: product.skuCode,
        modality: product.modality,
        lensType: product.lensType,
        packSize: product.packSize,
        isAvailable: true,
        packTypes: [product.modality],
        isColorLens: product.isColorLens || false,
        colorOptions: product.colorOptions 
          ? (typeof product.colorOptions === 'string' ? JSON.parse(product.colorOptions) : product.colorOptions)
          : [],
        powerSupport: {
          spherical: product.lensType === 'SPHERICAL',
          toric: product.lensType === 'TORIC',
          multifocal: product.lensType === 'MULTIFOCAL',
          cosmetic: product.lensType === 'COSMETIC',
        },
        powerRange: {
          sphMin: product.sphMin,
          sphMax: product.sphMax,
          cylMin: product.cylMin,
          cylMax: product.cylMax,
          addMin: product.addMin,
          addMax: product.addMax,
          axisSteps: product.axisSteps,
        },
      };
    });

    // Check if any products are available
    const hasAvailableProducts = filteredProducts.length > 0;
    
    // Build error message if no products available
    let errorMessage: string | null = null;
    if (!hasAvailableProducts && contactLensProducts.length > 0) {
      // Some products exist but none match the power
      const sampleProduct = contactLensProducts[0];
      const sampleValidation = validateContactLensPower(
        {
          odSphere: powerToUse.odSphere,
          odCylinder: powerToUse.odCylinder,
          odAxis: powerToUse.odAxis,
          odAdd: powerToUse.odAdd,
          osSphere: powerToUse.osSphere,
          osCylinder: powerToUse.osCylinder,
          osAxis: powerToUse.osAxis,
          osAdd: powerToUse.osAdd,
        },
        {
          sphMin: sampleProduct.sphMin,
          sphMax: sampleProduct.sphMax,
          cylMin: sampleProduct.cylMin,
          cylMax: sampleProduct.cylMax,
          axisSteps: sampleProduct.axisSteps,
          addMin: sampleProduct.addMin,
          addMax: sampleProduct.addMax,
          lensType: sampleProduct.lensType,
        }
      );
      
      if (sampleValidation.reasons.length > 0) {
        errorMessage = `No contact lenses available for your power. ${sampleValidation.reasons[0]}`;
      } else {
        errorMessage = 'No contact lenses available for your power range. Please check with store staff.';
      }
    } else if (!hasAvailableProducts) {
      errorMessage = 'No contact lens products found. Please check with store staff.';
    }

    return Response.json({
      success: true,
      data: {
        products: filteredProducts,
        powerUsed: powerToUse,
        mode: validated.mode,
        filters: {
          brand: validated.brand,
          line: validated.line,
          packType: validated.packType,
        },
        availability: {
          totalProducts: contactLensProducts.length,
          eligibleProducts: filteredProducts.length,
          ineligibleCount: ineligible.length,
        },
        error: errorMessage ? {
          message: errorMessage,
          code: 'NO_PRODUCTS_AVAILABLE',
        } : null,
      },
    });
  } catch (error: any) {
    console.error('[contact-lens/search] Error:', error);
    return handleApiError(error);
  }
}

