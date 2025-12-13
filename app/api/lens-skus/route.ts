import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleApiError } from '@/lib/errors';

/**
 * GET /api/lens-skus?context=COMBO|REGULAR
 * Get lens SKUs filtered by context eligibility
 * COMBO: lens_brand.combo_allowed=true AND lens_sku.combo_allowed=true (double-lock)
 * REGULAR: all active lenses (YOPO eligibility checked separately)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const context = searchParams.get('context'); // 'COMBO' | 'REGULAR' | null
    const organizationId = searchParams.get('organizationId');

    // Build base where clause
    const whereClause: any = {
      isActive: true,
    };

    // If context is COMBO, apply double-lock eligibility check
    if (context === 'COMBO') {
      // We need to filter by both brand and SKU combo_allowed
      // This requires a join with LensBrand
      const lensBrands = await prisma.lensBrand.findMany({
        where: {
          isActive: true,
          comboAllowed: true,
        },
        select: {
          name: true,
        },
      });

      const allowedBrandLines = lensBrands.map(b => b.name);

      // Filter by brand line combo_allowed AND SKU combo_allowed
      whereClause.brandLine = { in: allowedBrandLines };
      whereClause.comboAllowed = true;
    }
    // REGULAR shows all active lenses (no filtering)

    const lenses = await prisma.lensProduct.findMany({
      where: whereClause,
      include: {
        features: {
          include: {
            feature: {
              select: {
                code: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        brandLine: 'asc',
      },
    });

    // For COMBO, double-check that both brand and SKU are allowed
    let filteredLenses = lenses;
    if (context === 'COMBO') {
      // Get all combo-allowed brands
      const comboBrands = await prisma.lensBrand.findMany({
        where: {
          comboAllowed: true,
          isActive: true,
        },
      });
      const comboBrandNames = new Set(comboBrands.map(b => b.name));

      // Filter: brand must be combo_allowed AND SKU must be combo_allowed
      filteredLenses = lenses.filter(lens => 
        comboBrandNames.has(lens.brandLine) && lens.comboAllowed === true
      );
    }

    return Response.json({
      success: true,
      data: filteredLenses.map(lens => ({
        lens_sku_id: lens.id,
        it_code: lens.itCode,
        name: lens.name,
        lens_brand_id: lens.brandLine, // Using brandLine as identifier
        lens_brand_name: lens.brandLine,
        combo_allowed: lens.comboAllowed,
        yopo_eligible: lens.yopoEligible,
        category: lens.category,
        vision_type: lens.visionType,
        lens_index: lens.lensIndex,
        base_offer_price: lens.baseOfferPrice,
        mrp: lens.mrp,
        feature_codes: lens.features.map(f => f.feature.code),
      })),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

