import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleApiError } from '@/lib/errors';

/**
 * POST /api/contact-lens/map-questionnaire-benefits
 * Maps hardcoded CL questionnaire answers to database benefit codes with points
 * 
 * This ensures accurate mapping from questionnaire answers to benefits
 * that are used in the recommendation engine.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { answers, organizationId } = body;

    if (!answers || typeof answers !== 'object') {
      return Response.json({
        success: false,
        error: { message: 'Answers object is required' },
      }, { status: 400 });
    }

    // Get organization ID (required for benefits)
    const orgId = organizationId || (await prisma.organization.findFirst())?.id;
    if (!orgId) {
      return Response.json({
        success: false,
        error: { message: 'Organization ID is required' },
      }, { status: 400 });
    }

    // Get all active benefits for this organization
    const benefits = await (prisma as any).benefitFeature.findMany({
      where: {
        type: 'BENEFIT',
        organizationId: orgId,
        isActive: true,
      },
    });

    // Create a map of benefit codes to benefit IDs
    const benefitCodeMap = new Map<string, string>();
    benefits.forEach((b: any) => {
      benefitCodeMap.set(b.code, b.id);
    });

    // Define mapping from hardcoded answers to benefit codes with points
    // This mapping is based on CL industry standards and best practices
    const answerToBenefitMapping: Record<string, Record<string, Array<{ code: string; points: number }>>> = {
      wearingTime: {
        daily_8plus: [
          { code: 'B01', points: 3.0 }, // Long wear comfort (if exists)
          { code: 'B02', points: 2.5 }, // High oxygen
        ],
        daily_4to6: [
          { code: 'B01', points: 2.0 },
          { code: 'B02', points: 2.0 },
        ],
        occasional: [
          { code: 'B01', points: 1.5 },
        ],
        special_events: [
          { code: 'B01', points: 1.0 },
        ],
      },
      dryness: {
        very_often: [
          { code: 'B02', points: 3.0 }, // High oxygen (silicone hydrogel)
          { code: 'B01', points: 2.5 }, // Comfort
          // Note: DRY_EYE_SUPPORT might need to be a custom benefit code
        ],
        sometimes: [
          { code: 'B02', points: 2.0 },
          { code: 'B01', points: 2.0 },
        ],
        no: [
          { code: 'B01', points: 1.0 },
        ],
      },
      priority: {
        comfort: [
          { code: 'B01', points: 3.0 }, // Maximum comfort
        ],
        eye_health: [
          { code: 'B02', points: 3.0 }, // High oxygen / Silicone hydrogel
        ],
        budget: [
          { code: 'B01', points: 1.5 }, // Value
        ],
        brand: [
          { code: 'B01', points: 2.0 }, // Premium brand
        ],
      },
      routine: {
        office: [
          { code: 'B04', points: 2.5 }, // Anti-fatigue (digital protection)
        ],
        outdoor: [
          { code: 'B03', points: 3.0 }, // UV protection
        ],
        mixed: [
          { code: 'B03', points: 2.0 },
          { code: 'B04', points: 2.0 },
        ],
        home: [
          { code: 'B01', points: 2.0 },
        ],
      },
      budget: {
        under_1000: [
          { code: 'B01', points: 1.0 }, // Economy
        ],
        '1000_2000': [
          { code: 'B01', points: 2.0 }, // Standard
        ],
        '2000_3500': [
          { code: 'B01', points: 2.5 }, // Premium
        ],
        no_limit: [
          { code: 'B01', points: 3.0 }, // Best comfort
          { code: 'B02', points: 3.0 }, // High oxygen
        ],
      },
    };

    // Build benefit scores from answers
    const benefitScores: Record<string, number> = {};
    const benefitDetails: Array<{ code: string; name: string; points: number }> = [];

    Object.entries(answers).forEach(([questionId, answerValue]) => {
      const mappings = answerToBenefitMapping[questionId]?.[answerValue as string] || [];
      
      mappings.forEach(({ code, points }) => {
        // Check if benefit code exists in database
        if (benefitCodeMap.has(code)) {
          const benefit = benefits.find((b: any) => b.code === code);
          if (benefit) {
            // Accumulate points (can be from multiple answers)
            benefitScores[code] = (benefitScores[code] || 0) + points;
            
            // Track details for response
            const existing = benefitDetails.find(b => b.code === code);
            if (existing) {
              existing.points += points;
            } else {
              benefitDetails.push({
                code,
                name: benefit.name,
                points,
              });
            }
          }
        } else {
          // Benefit code not found - log warning but continue
          console.warn(`[map-questionnaire-benefits] Benefit code ${code} not found in database`);
        }
      });
    });

    // Also support custom CL-specific benefit codes if they exist
    // Map custom codes to standard benefits as fallback
    const customCodeMapping: Record<string, string> = {
      'HIGH_OXYGEN': 'B02',
      'DRY_EYE_SUPPORT': 'B02', // Map to high oxygen
      'SILICONE_HYDROGEL': 'B02',
      'COMFORT_MAX': 'B01',
      'VALUE': 'B01',
      'PREMIUM_BRAND': 'B01',
      'UV_PROTECTION': 'B03',
      'DIGITAL_PROTECTION': 'B04',
    };

    // If any custom codes were used, map them
    Object.entries(answers).forEach(([questionId, answerValue]) => {
      // This handles the old hardcoded mapping if still used
      const oldMapping: Record<string, Record<string, string[]>> = {
        wearingTime: {
          daily_8plus: ['HIGH_OXYGEN'],
          daily_4to6: ['VALUE'],
          occasional: ['VALUE'],
          special_events: ['VALUE'],
        },
        dryness: {
          very_often: ['DRY_EYE_SUPPORT', 'HIGH_OXYGEN'],
          sometimes: ['DRY_EYE_SUPPORT'],
          no: [],
        },
        priority: {
          comfort: ['COMFORT_MAX'],
          eye_health: ['SILICONE_HYDROGEL', 'HIGH_OXYGEN'],
          budget: ['VALUE'],
          brand: ['PREMIUM_BRAND'],
        },
        routine: {
          office: ['DIGITAL_PROTECTION'],
          outdoor: ['UV_PROTECTION'],
          mixed: [],
          home: [],
        },
      };

      const customCodes = oldMapping[questionId]?.[answerValue as string] || [];
      customCodes.forEach((customCode) => {
        const mappedCode = customCodeMapping[customCode];
        if (mappedCode && benefitCodeMap.has(mappedCode)) {
          const benefit = benefits.find((b: any) => b.code === mappedCode);
          if (benefit) {
            benefitScores[mappedCode] = (benefitScores[mappedCode] || 0) + 2.0;
            
            const existing = benefitDetails.find(b => b.code === mappedCode);
            if (existing) {
              existing.points += 2.0;
            } else {
              benefitDetails.push({
                code: mappedCode,
                name: benefit.name,
                points: 2.0,
              });
            }
          }
        }
      });
    });

    return Response.json({
      success: true,
      data: {
        benefitScores, // Map of benefit code to total points
        benefitDetails, // Array with code, name, and points
        mappedBenefits: Object.keys(benefitScores), // List of benefit codes
      },
    });
  } catch (error: any) {
    console.error('[contact-lens/map-questionnaire-benefits] Error:', error);
    return handleApiError(error);
  }
}
