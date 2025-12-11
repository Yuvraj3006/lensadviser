import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleApiError } from '@/lib/errors';
import { filterProductsByPower } from '@/lib/contact-lens-power-validation';

/**
 * POST /api/contact-lens/recommendations
 * Get contact lens recommendations based on power and questionnaire answers
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { contactLensPower, questionnaireAnswers } = body;

    if (!contactLensPower) {
      return Response.json({
        success: false,
        error: { message: 'Contact lens power is required' },
      }, { status: 400 });
    }

    // Fetch all active contact lens products
    const allProducts = await (prisma as any).contactLensProduct.findMany({
      where: { isActive: true },
    });

    // Filter by power compatibility
    const { eligible } = filterProductsByPower(allProducts, contactLensPower);

    if (eligible.length === 0) {
      return Response.json({
        success: true,
        data: {
          recommendations: [],
          message: 'No compatible products found for your power',
        },
      });
    }

    // Map questionnaire benefits to product scoring
    // Use benefitScores from API if available, otherwise use benefits array
    const benefitScores = new Map<string, number>();
    if (questionnaireAnswers?.benefitScores) {
      // Use pre-calculated benefit scores from mapping API
      Object.entries(questionnaireAnswers.benefitScores).forEach(([code, points]) => {
        benefitScores.set(code, points as number);
      });
    } else if (questionnaireAnswers?.benefits) {
      // Fallback: use benefits array (each benefit = 1 point)
      questionnaireAnswers.benefits.forEach((benefit: string) => {
        benefitScores.set(benefit, (benefitScores.get(benefit) || 0) + 1);
      });
    }

    // Get organization ID for fetching benefits
    const orgId = (await prisma.organization.findFirst())?.id;
    
    // Get product benefits from ProductBenefit (if exists for ContactLensProduct)
    // Note: ContactLensProduct might not have ProductBenefit mappings yet
    // For now, we'll use attribute-based scoring with benefit matching
    
    // Get all benefits to understand what codes exist
    const allBenefits = orgId ? await (prisma as any).benefitFeature.findMany({
      where: {
        type: 'BENEFIT',
        organizationId: orgId,
        isActive: true,
      },
    }) : [];
    
    const benefitCodeToName = new Map(allBenefits.map((b: any) => [b.code, b.name]));

    const scoredProducts = eligible.map((product: any) => {
      let matchScore = 50; // Base score
      let benefitMatchScore = 0; // Score from benefit matching

      // Get product's benefit scores from benefitScores JSON field
      let productBenefitScores: Record<string, number> = {};
      if (product.benefitScores) {
        try {
          productBenefitScores = JSON.parse(product.benefitScores);
        } catch (e) {
          console.warn('[recommendations] Failed to parse product benefitScores:', e);
        }
      }

      // Score based on material (silicone hydrogel = higher score)
      const isSiliconeHydrogel = product.material?.toLowerCase().includes('silicone');
      if (isSiliconeHydrogel) {
        matchScore += 20;
      }

      // Score based on water content (higher = better for dry eyes)
      const waterContent = parseFloat(product.waterContent || '0');
      if (waterContent > 50) {
        matchScore += 15;
      } else if (waterContent > 40) {
        matchScore += 10;
      }

      // Score based on modality (daily = higher comfort score)
      if (product.modality === 'DAILY') {
        matchScore += 10;
      }

      // Score based on ProductBenefit mappings (if available)
      // Formula: userBenefitScore * productBenefitScore
      if (Object.keys(productBenefitScores).length > 0) {
        // Use stored product benefit scores
        Object.entries(productBenefitScores).forEach(([code, productScore]) => {
          const userScore = benefitScores.get(code) || 0;
          if (userScore > 0 && productScore > 0) {
            // Multiply user benefit score by product benefit score
            benefitMatchScore += userScore * (productScore as number) * 5; // Scale factor
          }
        });
      } else {
        // Fallback: Attribute-based scoring if no ProductBenefit mappings
        // B01 = Comfort related
        // B02 = High Oxygen / Eye Health
        // B03 = UV Protection
        // B04 = Digital/Anti-Fatigue
        
        if (benefitScores.has('B01')) {
          const comfortPoints = benefitScores.get('B01') || 0;
          benefitMatchScore += comfortPoints * 5;
          if (product.modality === 'DAILY') {
            benefitMatchScore += comfortPoints * 3;
          }
        }
        
        if (benefitScores.has('B02')) {
          const oxygenPoints = benefitScores.get('B02') || 0;
          if (isSiliconeHydrogel) {
            benefitMatchScore += oxygenPoints * 8;
          } else if (waterContent > 50) {
            benefitMatchScore += oxygenPoints * 4;
          }
        }
        
        if (benefitScores.has('B03')) {
          const uvPoints = benefitScores.get('B03') || 0;
          if (isSiliconeHydrogel || product.material?.toLowerCase().includes('uv')) {
            benefitMatchScore += uvPoints * 6;
          } else {
            benefitMatchScore += uvPoints * 3;
          }
        }
        
        if (benefitScores.has('B04')) {
          const digitalPoints = benefitScores.get('B04') || 0;
          if (waterContent > 50) {
            benefitMatchScore += digitalPoints * 5;
          }
        }
      }

      // Combine base score with benefit match score
      const totalScore = matchScore + benefitMatchScore;

      // Clamp score to 0-100
      const finalScore = Math.min(100, Math.max(0, totalScore));

      return {
        ...product,
        matchScore: Math.round(finalScore),
        comfortScore: Math.min(5, Math.max(1, Math.round(finalScore / 20))), // 1-5 stars
      };
    });

    // Sort by match score
    scoredProducts.sort((a: any, b: any) => b.matchScore - a.matchScore);

    // Categorize into 4 recommendation types
    const bestMatch = scoredProducts[0] || null;
    const premiumComfort = scoredProducts.find((p: any) => 
      p.material?.toLowerCase().includes('silicone') && p.matchScore > 70
    ) || scoredProducts[1] || null;
    const valuePick = scoredProducts.find((p: any) => 
      p.offerPrice < p.mrp * 0.85 && p.matchScore > 60
    ) || scoredProducts[2] || null;
    const budgetPick = scoredProducts[scoredProducts.length - 1] || null;

    const recommendations = [
      { type: 'BEST_MATCH', product: bestMatch },
      { type: 'PREMIUM_COMFORT', product: premiumComfort },
      { type: 'VALUE', product: valuePick },
      { type: 'BUDGET', product: budgetPick },
    ].filter(rec => rec.product !== null);

    return Response.json({
      success: true,
      data: {
        recommendations: recommendations.map(rec => ({
          type: rec.type,
          product: {
            id: rec.product.id,
            name: `${rec.product.brand} ${rec.product.line}`,
            brand: rec.product.brand,
            line: rec.product.line,
            mrp: rec.product.mrp,
            offerPrice: rec.product.offerPrice,
            modality: rec.product.modality,
            lensType: rec.product.lensType,
            material: rec.product.material || 'Hydrogel',
            waterContent: rec.product.waterContent || 'N/A',
            packSize: rec.product.packSize,
            isColorLens: rec.product.isColorLens || false,
            colorOptions: rec.product.colorOptions 
              ? (typeof rec.product.colorOptions === 'string' 
                  ? JSON.parse(rec.product.colorOptions) 
                  : rec.product.colorOptions)
              : [],
            matchScore: rec.product.matchScore,
            comfortScore: rec.product.comfortScore,
            powerRange: {
              sphMin: rec.product.sphMin,
              sphMax: rec.product.sphMax,
              cylMin: rec.product.cylMin,
              cylMax: rec.product.cylMax,
              axisSteps: rec.product.axisSteps,
              addMin: rec.product.addMin,
              addMax: rec.product.addMax,
            },
          },
        })),
        allProducts: scoredProducts.map((p: any) => ({
          id: p.id,
          name: `${p.brand} ${p.line}`,
          brand: p.brand,
          line: p.line,
          mrp: p.mrp,
          offerPrice: p.offerPrice,
          matchScore: p.matchScore,
          comfortScore: p.comfortScore,
        })),
      },
    });
  } catch (error: any) {
    console.error('[contact-lens/recommendations] Error:', error);
    return handleApiError(error);
  }
}
