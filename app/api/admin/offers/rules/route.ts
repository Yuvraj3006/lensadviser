import { NextRequest } from 'next/server';
import { handleApiError, ValidationError, NotFoundError } from '@/lib/errors';
import { prisma } from '@/lib/prisma';
import { authenticate, authorize } from '@/middleware/auth.middleware';
import { UserRole } from '@/lib/constants';
import { serializePrismaModels, serializePrismaModel } from '@/lib/serialization';
import { z } from 'zod';

// Validation schema for creating offer rules - matches Prisma OfferRule model
// Using passthrough to allow legacy fields from frontend
const offerRuleSchema = z.object({
  code: z.string().min(1),
  offerType: z.enum(['YOPO', 'COMBO_PRICE', 'FREE_LENS', 'PERCENT_OFF', 'FLAT_OFF', 'BOG50', 'CATEGORY_DISCOUNT', 'BONUS_FREE_PRODUCT']), // Match OfferType enum
  // Handle arrays that might be null/undefined - transform to empty array
  frameBrands: z.union([z.array(z.string()), z.null(), z.undefined()]).transform(val => val || []).default([]),
  frameSubCategories: z.union([z.array(z.string()), z.null(), z.undefined()]).transform(val => val || []).default([]),
  lensBrandLines: z.union([z.array(z.string()), z.null(), z.undefined()]).transform(val => val || []).default([]),
  // Handle numbers that might be strings
  minFrameMRP: z.union([z.number(), z.string(), z.null(), z.undefined()]).transform(val => {
    if (val === null || val === undefined || val === '') return null;
    return typeof val === 'string' ? parseFloat(val) : val;
  }).nullable().optional(),
  maxFrameMRP: z.union([z.number(), z.string(), z.null(), z.undefined()]).transform(val => {
    if (val === null || val === undefined || val === '') return null;
    return typeof val === 'string' ? parseFloat(val) : val;
  }).nullable().optional(),
  config: z.any().optional(), // JSON field for flexible configuration
  upsellEnabled: z.union([z.boolean(), z.undefined()]).default(true),
  upsellThreshold: z.union([z.number(), z.string(), z.null(), z.undefined()]).transform(val => {
    if (val === null || val === undefined || val === '') return null;
    return typeof val === 'string' ? parseFloat(val) : val;
  }).nullable().optional(),
  upsellRewardText: z.union([z.string(), z.null(), z.undefined()]).nullable().optional(),
  priority: z.union([z.number(), z.string(), z.undefined()]).transform(val => {
    if (val === undefined) return 100;
    return typeof val === 'string' ? parseInt(val, 10) : val;
  }).default(100),
  isActive: z.union([z.boolean(), z.undefined()]).default(true),
  organizationId: z.union([z.string(), z.undefined()]).optional(), // Make optional, will use user's orgId if not provided
  // Legacy fields from frontend - accept but don't validate strictly
  discountType: z.string().optional(),
  discountValue: z.union([z.number(), z.string()]).optional(),
  comboPrice: z.union([z.number(), z.string(), z.null()]).optional(),
  freeProductId: z.string().nullable().optional(),
  isSecondPairRule: z.union([z.boolean(), z.undefined()]).optional(),
  secondPairPercent: z.union([z.number(), z.string(), z.null(), z.undefined()]).optional(),
  lensItCodes: z.union([z.array(z.string()), z.null(), z.undefined()]).transform(val => val || []).optional(),
  frameBrand: z.string().optional(),
  frameSubCategory: z.string().optional(),
}).passthrough();

/**
 * GET /api/admin/offers/rules
 * List all offer rules with optional filters
 */
export async function GET(request: NextRequest) {
  try {
    const user = await authenticate(request);
    authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN)(user);

    const { searchParams } = new URL(request.url);
    let organizationId = searchParams.get('organizationId') || user.organizationId;
    const frameBrand = searchParams.get('frameBrand');
    const offerType = searchParams.get('offerType');
    const isActive = searchParams.get('isActive');

    if (!organizationId || organizationId.trim() === '') {
      throw new ValidationError('organizationId is required');
    }

    // Validate organizationId is a valid ObjectID format
    if (!/^[0-9a-fA-F]{24}$/.test(organizationId)) {
      throw new ValidationError('Invalid organizationId format');
    }

    const where: any = {
      organizationId,
    };

    if (frameBrand) {
      where.frameBrands = { has: frameBrand }; // frameBrands is an array, use 'has' operator
    }

    if (offerType) {
      where.offerType = offerType;
    }

    if (isActive !== null && isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    const rules = await prisma.offerRule.findMany({
      where,
      orderBy: [
        { priority: 'asc' },
        { createdAt: 'desc' },
      ],
    });

    // Transform rules to include discount fields from config for frontend compatibility
    const transformedRules = rules.map((rule) => {
      const config = rule.config as any || {};
      
      // Generate display name from code and offerType
      const getDisplayName = (code: string, offerType: string) => {
        // If code is descriptive, use it
        if (code && code.length > 0) {
          // Convert code to readable format: "YOPO_OFFER" -> "YOPO Offer"
          return code
            .split('_')
            .map(word => word.charAt(0) + word.slice(1).toLowerCase())
            .join(' ');
        }
        // Fallback to offerType
        return offerType
          .split('_')
          .map(word => word.charAt(0) + word.slice(1).toLowerCase())
          .join(' ');
      };
      
      // Serialize BigInt and Date fields first
      const serializedRule = serializePrismaModels([rule], { bigIntFields: ['priority'] })[0];
      
      return {
        ...serializedRule,
        // Add name field for display
        name: getDisplayName(rule.code, rule.offerType),
        // Extract discount fields from config for frontend
        discountType: config.discountType || null,
        discountValue: config.discountValue || 0,
        comboPrice: config.comboPrice || null,
        freeProductId: config.freeProductId || null,
        isSecondPairRule: config.isSecondPairRule || false,
        secondPairPercent: config.secondPairPercent || null,
        lensItCodes: config.lensItCodes || [],
        // Legacy field mappings
        frameBrand: rule.frameBrands && rule.frameBrands.length > 0 ? rule.frameBrands[0] : null,
        frameSubCategory: rule.frameSubCategories && rule.frameSubCategories.length > 0 ? rule.frameSubCategories[0] : null,
        // Keep config for backward compatibility
        config,
      };
    });

    return Response.json({
      success: true,
      data: transformedRules,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/admin/offers/rules
 * Create a new offer rule
 */
export async function POST(request: NextRequest) {
  try {
    const user = await authenticate(request);
    authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN)(user);

    const body = await request.json();

    const validationResult = offerRuleSchema.safeParse(body);
    if (!validationResult.success) {
      // Log validation errors for debugging
      console.error('[POST /api/admin/offers/rules] Validation errors:', JSON.stringify(validationResult.error.issues, null, 2));
      throw new ValidationError('Invalid input', validationResult.error.issues);
    }

    const data = validationResult.data;

    // Build config from legacy fields if provided
    const ruleConfigData: any = data.config || {};
    if (data.discountType !== undefined) ruleConfigData.discountType = data.discountType;
    if (data.discountValue !== undefined) ruleConfigData.discountValue = typeof data.discountValue === 'string' ? parseFloat(data.discountValue) : data.discountValue;
    if (data.comboPrice !== undefined) ruleConfigData.comboPrice = typeof data.comboPrice === 'string' ? parseFloat(data.comboPrice) : data.comboPrice;
    if (data.freeProductId !== undefined) ruleConfigData.freeProductId = data.freeProductId;
    if (data.isSecondPairRule !== undefined) ruleConfigData.isSecondPairRule = data.isSecondPairRule;
    if (data.secondPairPercent !== undefined) ruleConfigData.secondPairPercent = typeof data.secondPairPercent === 'string' ? parseFloat(data.secondPairPercent) : data.secondPairPercent;
    if (data.lensItCodes !== undefined) ruleConfigData.lensItCodes = Array.isArray(data.lensItCodes) ? data.lensItCodes : [];
    
    // YOPO-specific config fields
    if (data.config?.freeUnderYOPO !== undefined) ruleConfigData.freeUnderYOPO = data.config.freeUnderYOPO;
    if (data.config?.bonusFreeAllowed !== undefined) ruleConfigData.bonusFreeAllowed = data.config.bonusFreeAllowed;
    
    // Bonus Free Product config fields
    if (data.config?.triggerMinBill !== undefined) ruleConfigData.triggerMinBill = typeof data.config.triggerMinBill === 'string' ? parseFloat(data.config.triggerMinBill) : data.config.triggerMinBill;
    if (data.config?.bonusLimit !== undefined) ruleConfigData.bonusLimit = typeof data.config.bonusLimit === 'string' ? parseFloat(data.config.bonusLimit) : data.config.bonusLimit;
    if (data.config?.bonusCategory !== undefined) ruleConfigData.bonusCategory = data.config.bonusCategory;
    if (data.config?.eligibleBrands !== undefined) ruleConfigData.eligibleBrands = Array.isArray(data.config.eligibleBrands) ? data.config.eligibleBrands : [];
    if (data.config?.eligibleCategories !== undefined) ruleConfigData.eligibleCategories = Array.isArray(data.config.eligibleCategories) ? data.config.eligibleCategories : [];
    
    // Combo Price variant config fields
    if (data.config?.comboType !== undefined) ruleConfigData.comboType = data.config.comboType;
    if (data.config?.requiredFrameSubCategory !== undefined) ruleConfigData.requiredFrameSubCategory = data.config.requiredFrameSubCategory;
    if (data.config?.requiredFrameCategory !== undefined) ruleConfigData.requiredFrameCategory = data.config.requiredFrameCategory;
    if (data.config?.requiredLensBrandLine !== undefined) ruleConfigData.requiredLensBrandLine = data.config.requiredLensBrandLine;
    if (data.config?.requiredVisionType !== undefined) ruleConfigData.requiredVisionType = data.config.requiredVisionType;
    if (data.config?.brandLineComboPrice !== undefined) ruleConfigData.brandLineComboPrice = typeof data.config.brandLineComboPrice === 'string' ? parseFloat(data.config.brandLineComboPrice) : data.config.brandLineComboPrice;
    if (data.config?.frameCategoryComboPrice !== undefined) ruleConfigData.frameCategoryComboPrice = typeof data.config.frameCategoryComboPrice === 'string' ? parseFloat(data.config.frameCategoryComboPrice) : data.config.frameCategoryComboPrice;
    if (data.config?.visionTypeComboPrice !== undefined) ruleConfigData.visionTypeComboPrice = typeof data.config.visionTypeComboPrice === 'string' ? parseFloat(data.config.visionTypeComboPrice) : data.config.visionTypeComboPrice;

    // Build rule data - only include fields that exist in the model
    // Ensure arrays are always arrays (not null/undefined)
    const frameBrands = Array.isArray(data.frameBrands) && data.frameBrands.length > 0 
      ? data.frameBrands 
      : (data.frameBrand ? [data.frameBrand] : []);
    const frameSubCategories = Array.isArray(data.frameSubCategories) && data.frameSubCategories.length > 0
      ? data.frameSubCategories
      : (data.frameSubCategory ? [data.frameSubCategory] : []);
    const lensBrandLines = Array.isArray(data.lensBrandLines) ? data.lensBrandLines : [];

    const ruleData: any = {
      code: data.code,
      offerType: data.offerType,
      frameBrands,
      frameSubCategories,
      lensBrandLines,
      config: ruleConfigData,
      upsellEnabled: data.upsellEnabled ?? true,
      priority: typeof data.priority === 'string' ? parseInt(data.priority, 10) : (data.priority ?? 100),
      isActive: data.isActive ?? true,
      organizationId: data.organizationId,
    };

    // Optional fields
    if (data.minFrameMRP !== undefined) ruleData.minFrameMRP = typeof data.minFrameMRP === 'string' ? parseFloat(data.minFrameMRP) : data.minFrameMRP;
    if (data.maxFrameMRP !== undefined) ruleData.maxFrameMRP = typeof data.maxFrameMRP === 'string' ? parseFloat(data.maxFrameMRP) : data.maxFrameMRP;
    if (data.upsellThreshold !== undefined) ruleData.upsellThreshold = typeof data.upsellThreshold === 'string' ? parseFloat(data.upsellThreshold) : data.upsellThreshold;
    if (data.upsellRewardText !== undefined) ruleData.upsellRewardText = data.upsellRewardText;

    // Use user's organizationId if not provided or invalid
    if (!ruleData.organizationId || !/^[0-9a-fA-F]{24}$/.test(ruleData.organizationId)) {
      ruleData.organizationId = user.organizationId;
    }

    const rule = await prisma.offerRule.create({
      data: ruleData,
    });

    // Transform rule to include discount fields from config for frontend compatibility
    const ruleConfig = rule.config as any || {};
    // Serialize BigInt and Date fields first
    const serializedRule = serializePrismaModels([rule], { bigIntFields: ['priority'] })[0];
    
    const transformedRule = {
      ...serializedRule,
      // Extract discount fields from config for frontend
      discountType: ruleConfig.discountType || null,
      discountValue: ruleConfig.discountValue || 0,
      comboPrice: ruleConfig.comboPrice || null,
      freeProductId: ruleConfig.freeProductId || null,
      isSecondPairRule: ruleConfig.isSecondPairRule || false,
      secondPairPercent: ruleConfig.secondPairPercent || null,
      lensItCodes: ruleConfig.lensItCodes || [],
      // Legacy field mappings
      frameBrand: rule.frameBrands && rule.frameBrands.length > 0 ? rule.frameBrands[0] : null,
      frameSubCategory: rule.frameSubCategories && rule.frameSubCategories.length > 0 ? rule.frameSubCategories[0] : null,
      // Keep config for backward compatibility
      config: ruleConfig,
    };

    return Response.json(
      {
        success: true,
        data: transformedRule,
      },
      { status: 201 }
    );
  } catch (error) {
    return handleApiError(error);
  }
}

