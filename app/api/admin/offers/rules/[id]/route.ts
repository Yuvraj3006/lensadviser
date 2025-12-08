import { NextRequest } from 'next/server';
import { handleApiError, ValidationError, NotFoundError } from '@/lib/errors';
import { prisma } from '@/lib/prisma';
import { authenticate, authorize } from '@/middleware/auth.middleware';
import { UserRole } from '@prisma/client';
import { z } from 'zod';

// Partial schema for updates - very lenient to accept any data from frontend
// We'll validate and transform manually in the handler
const updateOfferRuleSchema = z.any(); // Accept anything, validate manually

/**
 * GET /api/admin/offers/rules/[id]
 * Get a single offer rule
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await authenticate(request);
    authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN)(user);

    const { id } = await params;

    const rule = await prisma.offerRule.findFirst({
      where: {
        id,
        organizationId: user.organizationId,
      },
    });

    if (!rule) {
      return Response.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Offer rule not found',
          },
        },
        { status: 404 }
      );
    }

    // Transform rule to include discount fields from config for frontend compatibility
    const config = rule.config as any || {};
    const transformedRule = {
      ...rule,
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

    return Response.json({
      success: true,
      data: transformedRule,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PUT /api/admin/offers/rules/[id]
 * Update an offer rule
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await authenticate(request);
    authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN)(user);

    const { id } = await params;
    const body = await request.json();

    console.log('[PUT /api/admin/offers/rules] Request body:', JSON.stringify(body, null, 2));

    // Accept any data - validate critical fields manually
    if (body.offerType && !['YOPO', 'COMBO_PRICE', 'FREE_LENS', 'PERCENT_OFF', 'FLAT_OFF'].includes(body.offerType)) {
      console.error('[PUT /api/admin/offers/rules] Invalid offerType:', body.offerType);
      return Response.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: `Invalid offerType: ${body.offerType}. Must be one of: YOPO, COMBO_PRICE, FREE_LENS, PERCENT_OFF, FLAT_OFF`,
          },
        },
        { status: 400 }
      );
    }

    const data = body;

    // Verify rule exists and belongs to organization first
    const existingRule = await prisma.offerRule.findFirst({
      where: {
        id,
        organizationId: user.organizationId,
      },
    });

    if (!existingRule) {
      return Response.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Offer rule not found',
          },
        },
        { status: 404 }
      );
    }

    // Build update data - transform frontend fields to Prisma model format
    const updateData: any = {};
    
    // Helper to convert to number
    const toNumber = (val: any): number | null => {
      if (val === null || val === undefined) return null;
      if (typeof val === 'number') return val;
      if (typeof val === 'string') {
        const parsed = parseFloat(val);
        return isNaN(parsed) ? null : parsed;
      }
      return null;
    };

    // Helper to convert to int
    const toInt = (val: any): number | null => {
      if (val === null || val === undefined) return null;
      if (typeof val === 'number') return Math.floor(val);
      if (typeof val === 'string') {
        const parsed = parseInt(val, 10);
        return isNaN(parsed) ? null : parsed;
      }
      return null;
    };

    // Helper to ensure array
    const toArray = (val: any): string[] => {
      if (!val) return [];
      if (Array.isArray(val)) return val.filter(v => v !== null && v !== undefined);
      return [val].filter(v => v !== null && v !== undefined);
    };
    
    // Direct mappings with type conversion
    if (data.code !== undefined && data.code !== null && data.code !== '') updateData.code = String(data.code);
    if (data.offerType !== undefined && data.offerType !== null) updateData.offerType = data.offerType;
    
    const minMRP = toNumber(data.minFrameMRP);
    if (minMRP !== null) updateData.minFrameMRP = minMRP;
    else if (data.minFrameMRP === null) updateData.minFrameMRP = null;
    
    const maxMRP = toNumber(data.maxFrameMRP);
    if (maxMRP !== null) updateData.maxFrameMRP = maxMRP;
    else if (data.maxFrameMRP === null) updateData.maxFrameMRP = null;
    
    if (data.upsellEnabled !== undefined) updateData.upsellEnabled = Boolean(data.upsellEnabled);
    
    const threshold = toNumber(data.upsellThreshold);
    if (threshold !== null) updateData.upsellThreshold = threshold;
    else if (data.upsellThreshold === null) updateData.upsellThreshold = null;
    
    if (data.upsellRewardText !== undefined) {
      updateData.upsellRewardText = data.upsellRewardText === null || data.upsellRewardText === '' ? null : String(data.upsellRewardText);
    }
    
    const priority = toInt(data.priority);
    if (priority !== null) updateData.priority = priority;
    
    if (data.isActive !== undefined) updateData.isActive = Boolean(data.isActive);
    
    // Transform array fields - ensure they're arrays
    if (data.frameBrands !== undefined) {
      updateData.frameBrands = toArray(data.frameBrands);
    } else if (data.frameBrand !== undefined) {
      updateData.frameBrands = toArray(data.frameBrand);
    }
    
    if (data.frameSubCategories !== undefined) {
      updateData.frameSubCategories = toArray(data.frameSubCategories);
    } else if (data.frameSubCategory !== undefined) {
      updateData.frameSubCategories = toArray(data.frameSubCategory);
    }
    
    if (data.lensBrandLines !== undefined) {
      updateData.lensBrandLines = toArray(data.lensBrandLines);
    }
    
    // Handle config field - merge legacy fields into config JSON
    if (data.config !== undefined && data.config !== null) {
      updateData.config = data.config;
    } else {
      // Build config from legacy fields if provided
      const config: any = {};
      if (data.discountType !== undefined && data.discountType !== null) config.discountType = String(data.discountType);
      
      const discountValue = toNumber(data.discountValue);
      if (discountValue !== null) config.discountValue = discountValue;
      
      const comboPrice = toNumber(data.comboPrice);
      if (comboPrice !== null) config.comboPrice = comboPrice;
      else if (data.comboPrice === null) config.comboPrice = null;
      
      if (data.freeProductId !== undefined && data.freeProductId !== null) config.freeProductId = String(data.freeProductId);
      if (data.isSecondPairRule !== undefined) config.isSecondPairRule = Boolean(data.isSecondPairRule);
      
      const secondPairPercent = toNumber(data.secondPairPercent);
      if (secondPairPercent !== null) config.secondPairPercent = secondPairPercent;
      else if (data.secondPairPercent === null) config.secondPairPercent = null;
      
      if (data.lensItCodes !== undefined) config.lensItCodes = toArray(data.lensItCodes);
      
      // Only set config if we have at least one field
      if (Object.keys(config).length > 0) {
        // Merge with existing config
        updateData.config = existingRule.config 
          ? { ...(existingRule.config as object), ...config }
          : config;
      }
    }

    // Remove undefined values and ensure we have something to update
    const cleanedData = Object.fromEntries(
      Object.entries(updateData).filter(([_, v]) => v !== undefined)
    );

    if (Object.keys(cleanedData).length === 0) {
      return Response.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'No valid fields to update',
          },
        },
        { status: 400 }
      );
    }

    console.log('[PUT /api/admin/offers/rules] Update data:', JSON.stringify(cleanedData, null, 2));

    const rule = await prisma.offerRule.update({
      where: { id },
      data: cleanedData,
    });

    // Transform rule to include discount fields from config for frontend compatibility
    const config = rule.config as any || {};
    const transformedRule = {
      ...rule,
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

    return Response.json({
      success: true,
      data: transformedRule,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * DELETE /api/admin/offers/rules/[id]
 * Delete an offer rule
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await authenticate(request);
    authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN)(user);

    const { id } = await params;

    // Verify rule exists and belongs to organization
    const existingRule = await prisma.offerRule.findFirst({
      where: {
        id,
        organizationId: user.organizationId,
      },
    });

    if (!existingRule) {
      return Response.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Offer rule not found',
          },
        },
        { status: 404 }
      );
    }

    await prisma.offerRule.delete({
      where: { id },
    });

    return Response.json({
      success: true,
      message: 'Offer rule deleted successfully',
    });
  } catch (error) {
    return handleApiError(error);
  }
}

