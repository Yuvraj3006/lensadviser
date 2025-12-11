import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleApiError, ValidationError } from '@/lib/errors';
import { z } from 'zod';
import { appendFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';

/**
 * Deep serialize an object to remove BigInt, Date, and other non-serializable types
 */
function deepSerialize(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (typeof obj === 'bigint') {
    return Number(obj);
  }
  
  if (obj instanceof Date) {
    return obj.toISOString();
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => deepSerialize(item));
  }
  
  if (typeof obj === 'object') {
    const serialized: any = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        serialized[key] = deepSerialize(obj[key]);
      }
    }
    return serialized;
  }
  
  return obj;
}

const createOrderSchema = z.object({
  storeId: z.string(),
  salesMode: z.enum(['SELF_SERVICE', 'STAFF_ASSISTED']),
  assistedByStaffId: z.string().nullable().optional(),
  assistedByName: z.string().nullable().optional(),
  customerName: z.string().nullable().optional(),
  customerPhone: z.string().nullable().optional(),
  frameData: z.any(),
  lensData: z.any(),
  offerData: z.any(),
  orderType: z.enum(['EYEGLASSES', 'LENS_ONLY', 'POWER_SUNGLASS', 'CONTACT_LENS_ONLY']).optional(),
  finalPrice: z.number().positive(),
});

/**
 * POST /api/order/create
 * Create a new order
 */
async function logDebug(location: string, message: string, data: any, hypothesisId: string, sessionId: string, runId: string) {
  try {
    const logPath = join(process.cwd(), '.cursor', 'debug.log');
    const logDir = dirname(logPath);
    await mkdir(logDir, { recursive: true }).catch(()=>{});
    const logEntry = JSON.stringify({location,message,data,timestamp:Date.now(),sessionId,runId,hypothesisId}) + '\n';
    await appendFile(logPath, logEntry).catch(()=>{});
  } catch (e) {
    // Silently fail - logging shouldn't break the request
  }
}

export async function POST(request: NextRequest) {
  const sessionId = 'debug-session';
  const runId = 'run1';
  try {
    // #region agent log
    try {
      await logDebug('route.ts:71', 'POST handler entry', {}, 'A', sessionId, runId);
    } catch (logErr) {
      console.error('[order/create] Failed to write initial debug log:', logErr);
    }
    // #endregion
    console.error('[order/create] ========== REQUEST RECEIVED ==========');
    let body;
    try {
      body = await request.json();
      // #region agent log
      await logDebug('route.ts:66', 'JSON parsed successfully', {hasBody:!!body,bodyKeys:body?Object.keys(body):[]}, 'A', sessionId, runId);
      // #endregion
    } catch (jsonError: any) {
      // #region agent log
      await logDebug('route.ts:70', 'JSON parse failed', {error:jsonError?.message,errorName:jsonError?.name}, 'A', sessionId, runId);
      // #endregion
      console.error('[order/create] Failed to parse request JSON:', jsonError);
      throw new ValidationError('Invalid JSON in request body: ' + (jsonError?.message || 'Unknown error'));
    }
    
    // Log incoming request for debugging
    console.log('[order/create] ========== REQUEST START ==========');
    console.log('[order/create] Request body keys:', Object.keys(body || {}));
    console.log('[order/create] Request body:', JSON.stringify(body, null, 2).substring(0, 2000));
    
    // Validate request body
    if (!body) {
      throw new ValidationError('Request body is required');
    }

    let validated;
    try {
      validated = createOrderSchema.parse(body);
      // #region agent log
      await logDebug('route.ts:90', 'Zod validation passed', {storeId:validated?.storeId,salesMode:validated?.salesMode,hasFrameData:!!validated?.frameData,hasLensData:!!validated?.lensData,hasOfferData:!!validated?.offerData}, 'B', sessionId, runId);
      // #endregion
    } catch (zodError: any) {
      // #region agent log
      await logDebug('route.ts:94', 'Zod validation failed', {issues:zodError?.issues,errorMessage:zodError?.message}, 'B', sessionId, runId);
      // #endregion
      console.error('[order/create] Zod validation error:', zodError);
      console.error('[order/create] Zod error issues:', JSON.stringify(zodError.issues, null, 2));
      throw zodError;
    }
    
    console.log('[order/create] Validation passed');

    // Validate store exists
    // #region agent log
    await logDebug('route.ts:103', 'Checking store exists', {storeId:validated.storeId}, 'C', sessionId, runId);
    // #endregion
    const store = await prisma.store.findUnique({
      where: { id: validated.storeId },
    });
    // #region agent log
    await logDebug('route.ts:107', 'Store lookup result', {storeFound:!!store,storeId:validated.storeId}, 'C', sessionId, runId);
    // #endregion

    if (!store) {
      throw new ValidationError('Store not found');
    }

    // Business Rule: Staff selection is mandatory for STAFF_ASSISTED mode
    if (validated.salesMode === 'STAFF_ASSISTED') {
      if (!validated.assistedByStaffId && !validated.assistedByName) {
        throw new ValidationError('Staff selection is required for STAFF_ASSISTED mode. Please provide either assistedByStaffId or assistedByName.');
      }
    }

    // Validate staff if provided
    if (validated.assistedByStaffId) {
      try {
        const staff = await prisma.staff.findUnique({
          where: { id: validated.assistedByStaffId },
        });

        if (!staff) {
          throw new ValidationError('Staff member not found');
        }

        // Check storeId - it's a JSON field, so we need to handle it carefully
        const staffStoreId = typeof staff.storeId === 'string' 
          ? staff.storeId 
          : (staff.storeId as any)?.value || staff.storeId;
        
        if (staffStoreId !== validated.storeId) {
          throw new ValidationError('Staff member does not belong to this store');
        }
      } catch (staffError: any) {
        console.error('[order/create] Staff validation error:', staffError);
        // If it's a validation error, re-throw it
        if (staffError instanceof ValidationError) {
          throw staffError;
        }
        // Otherwise, log and continue (staff validation is not critical for order creation)
        console.warn('[order/create] Staff validation failed, but continuing with order creation');
      }
    }

    // Validate JSON fields are objects
    if (typeof validated.frameData !== 'object' || validated.frameData === null) {
      throw new ValidationError('frameData must be a valid object');
    }
    if (typeof validated.lensData !== 'object' || validated.lensData === null) {
      throw new ValidationError('lensData must be a valid object');
    }
    if (typeof validated.offerData !== 'object' || validated.offerData === null) {
      throw new ValidationError('offerData must be a valid object');
    }

    // Validate finalPrice is positive
    if (validated.finalPrice <= 0) {
      throw new ValidationError('finalPrice must be greater than 0');
    }

    // Serialize data to remove BigInt, Date, and other non-serializable types
    // Also ensure numeric fields are integers (Prisma schema expects Int for prices)
    // #region agent log
    await logDebug('route.ts:166', 'Before serialization', {frameDataType:typeof validated.frameData,lensDataType:typeof validated.lensData,offerDataType:typeof validated.offerData}, 'D', sessionId, runId);
    // #endregion
    const serializedFrameData = deepSerialize(validated.frameData);
    const serializedLensData = deepSerialize(validated.lensData);
    const serializedOfferData = deepSerialize(validated.offerData);
    // #region agent log
    await logDebug('route.ts:170', 'After serialization', {frameDataKeys:serializedFrameData?Object.keys(serializedFrameData):[],lensDataKeys:serializedLensData?Object.keys(serializedLensData):[],offerDataKeys:serializedOfferData?Object.keys(serializedOfferData):[]}, 'D', sessionId, runId);
    // #endregion
    
    // Validate and fix frameData structure
    if (!serializedFrameData || typeof serializedFrameData !== 'object') {
      throw new ValidationError('frameData must be a valid object');
    }
    
    // OrderFrameData requires: brand, mrp (Int), frameType (optional), subBrand (optional)
    if (!serializedFrameData.brand || typeof serializedFrameData.brand !== 'string') {
      throw new ValidationError('frameData.brand is required and must be a string');
    }
    if (typeof serializedFrameData.mrp !== 'number') {
      throw new ValidationError('frameData.mrp is required and must be a number');
    }
    serializedFrameData.mrp = Math.round(serializedFrameData.mrp);
    
    // Validate and fix lensData structure
    if (!serializedLensData || typeof serializedLensData !== 'object') {
      throw new ValidationError('lensData must be a valid object');
    }
    
    // OrderLensData requires: brandLine, id, index, name, price (Int)
    const requiredLensFields = ['brandLine', 'id', 'index', 'name', 'price'];
    for (const field of requiredLensFields) {
      if (!serializedLensData[field] && serializedLensData[field] !== 0) {
        console.warn(`[order/create] Missing lensData.${field}, using default`);
        if (field === 'price') {
          serializedLensData[field] = 0;
        } else {
          serializedLensData[field] = 'Unknown';
        }
      }
    }
    
    // Convert Float to Int for Prisma schema compatibility
    if (typeof serializedLensData.price === 'number') {
      serializedLensData.price = Math.round(serializedLensData.price);
    }
    if (typeof serializedLensData.basePrice === 'number') {
      serializedLensData.basePrice = Math.round(serializedLensData.basePrice);
    }
    if (typeof serializedLensData.finalLensPrice === 'number') {
      serializedLensData.finalLensPrice = Math.round(serializedLensData.finalLensPrice);
    }
    if (typeof serializedLensData.bandExtra === 'number') {
      serializedLensData.bandExtra = Math.round(serializedLensData.bandExtra);
    }
    if (typeof serializedLensData.totalRxAddOn === 'number') {
      serializedLensData.totalRxAddOn = Math.round(serializedLensData.totalRxAddOn);
    }
    
    // Validate and fix offerData structure
    if (!serializedOfferData || typeof serializedOfferData !== 'object') {
      throw new ValidationError('offerData must be a valid object');
    }
    
    // OrderOfferData requires: baseTotal, effectiveBase, finalPayable, frameMRP, lensPrice (all Int)
    const requiredOfferFields = ['baseTotal', 'effectiveBase', 'finalPayable', 'frameMRP', 'lensPrice'];
    for (const field of requiredOfferFields) {
      if (typeof serializedOfferData[field] !== 'number') {
        console.warn(`[order/create] Missing or invalid offerData.${field}, using 0`);
        serializedOfferData[field] = 0;
      } else {
        serializedOfferData[field] = Math.round(serializedOfferData[field]);
      }
    }
    
    // Ensure priceComponents is an array
    if (!Array.isArray(serializedOfferData.priceComponents)) {
      serializedOfferData.priceComponents = [];
    }
    
    // Convert priceComponents amounts to Int
    serializedOfferData.priceComponents = serializedOfferData.priceComponents.map((comp: any) => ({
      amount: typeof comp.amount === 'number' ? Math.round(comp.amount) : 0,
      label: comp.label || 'Item',
    }));
    
    // Clean up frameData to only include schema-defined fields
    const cleanFrameData: any = {
      brand: serializedFrameData.brand,
      mrp: serializedFrameData.mrp,
    };
    if (serializedFrameData.frameType) {
      cleanFrameData.frameType = serializedFrameData.frameType;
    }
    if (serializedFrameData.subBrand) {
      cleanFrameData.subBrand = serializedFrameData.subBrand;
    }
    
    // Clean up lensData to only include schema-defined fields
    const cleanLensData: any = {
      brandLine: serializedLensData.brandLine || 'Unknown',
      id: serializedLensData.id || 'Unknown',
      index: serializedLensData.index || 'Unknown',
      name: serializedLensData.name || 'Unknown',
      price: serializedLensData.price || 0,
    };
    // Add optional fields only if they exist
    if (serializedLensData.itCode) cleanLensData.itCode = serializedLensData.itCode;
    if (serializedLensData.visionType) cleanLensData.visionType = serializedLensData.visionType;
    if (typeof serializedLensData.basePrice === 'number') cleanLensData.basePrice = Math.round(serializedLensData.basePrice);
    if (typeof serializedLensData.finalLensPrice === 'number') cleanLensData.finalLensPrice = Math.round(serializedLensData.finalLensPrice);
    if (serializedLensData.powerBand) cleanLensData.powerBand = serializedLensData.powerBand;
    if (typeof serializedLensData.bandExtra === 'number') cleanLensData.bandExtra = Math.round(serializedLensData.bandExtra);
    if (serializedLensData.rxAddOnBreakdown) cleanLensData.rxAddOnBreakdown = serializedLensData.rxAddOnBreakdown;
    if (typeof serializedLensData.totalRxAddOn === 'number') cleanLensData.totalRxAddOn = Math.round(serializedLensData.totalRxAddOn);
    if (serializedLensData.tint) cleanLensData.tint = serializedLensData.tint;
    if (serializedLensData.mirror) cleanLensData.mirror = serializedLensData.mirror;
    if (typeof serializedLensData.thicknessWarning === 'boolean') cleanLensData.thicknessWarning = serializedLensData.thicknessWarning;
    if (serializedLensData.recommendedIndex) cleanLensData.recommendedIndex = serializedLensData.recommendedIndex;
    
    // Clean up offerData to only include schema-defined fields
    const cleanOfferData: any = {
      baseTotal: serializedOfferData.baseTotal || 0,
      effectiveBase: serializedOfferData.effectiveBase || 0,
      finalPayable: serializedOfferData.finalPayable || 0,
      frameMRP: serializedOfferData.frameMRP || 0,
      lensPrice: serializedOfferData.lensPrice || 0,
      priceComponents: serializedOfferData.priceComponents || [],
    };
    // Add optional Json fields only if they exist
    if (serializedOfferData.categoryDiscount) cleanOfferData.categoryDiscount = serializedOfferData.categoryDiscount;
    if (serializedOfferData.couponDiscount) cleanOfferData.couponDiscount = serializedOfferData.couponDiscount;
    if (serializedOfferData.couponError) cleanOfferData.couponError = serializedOfferData.couponError;
    if (serializedOfferData.offersApplied) cleanOfferData.offersApplied = serializedOfferData.offersApplied;
    if (serializedOfferData.secondPairDiscount) cleanOfferData.secondPairDiscount = serializedOfferData.secondPairDiscount;
    if (serializedOfferData.upsell) cleanOfferData.upsell = serializedOfferData.upsell;
    
    // Handle assistedByStaffId and assistedByName - schema expects Json type
    // For Prisma MongoDB, Json fields accept the value directly (string, number, object, etc.)
    const assistedByStaffIdJson = validated.assistedByStaffId || null;
    const assistedByNameJson = validated.assistedByName || null;

    const now = new Date();
    
    // Ensure finalPrice is a number (schema expects Float, but we'll ensure it's valid)
    const finalPrice = typeof validated.finalPrice === 'number' 
      ? validated.finalPrice 
      : parseFloat(String(validated.finalPrice)) || 0;
    
    if (finalPrice <= 0) {
      throw new ValidationError('finalPrice must be greater than 0');
    }
    
    // Prepare order data - ensure all required fields are present
    const orderData: any = {
      storeId: validated.storeId,
      salesMode: validated.salesMode,
      customerName: validated.customerName || null,
      customerPhone: validated.customerPhone || null,
      frameData: cleanFrameData,
      lensData: cleanLensData,
      offerData: cleanOfferData,
      orderType: validated.orderType || 'EYEGLASSES',
      finalPrice: finalPrice,
      status: 'DRAFT',
      createdAt: now,
      updatedAt: now,
    };
    
    // Only add JSON fields if they have values
    // For JSON fields in Prisma MongoDB, pass the value directly (Prisma handles serialization)
    if (assistedByStaffIdJson !== null && assistedByStaffIdJson !== undefined) {
      orderData.assistedByStaffId = assistedByStaffIdJson;
    }
    if (assistedByNameJson !== null && assistedByNameJson !== undefined) {
      orderData.assistedByName = assistedByNameJson;
    }
    
    // Log order data before creation (without sensitive data)
    console.log('[order/create] Creating order with data:', {
      storeId: orderData.storeId,
      salesMode: orderData.salesMode,
      orderType: orderData.orderType,
      finalPrice: orderData.finalPrice,
      status: orderData.status,
      hasAssistedByStaffId: !!orderData.assistedByStaffId,
      hasAssistedByName: !!orderData.assistedByName,
      hasFrameData: !!orderData.frameData,
      hasLensData: !!orderData.lensData,
      hasOfferData: !!orderData.offerData,
      frameDataKeys: orderData.frameData ? Object.keys(orderData.frameData) : [],
      lensDataKeys: orderData.lensData ? Object.keys(orderData.lensData) : [],
      offerDataKeys: orderData.offerData ? Object.keys(orderData.offerData) : [],
    });
    
    // Final validation before Prisma create
    console.log('[order/create] Final data validation:');
    console.log('[order/create] - frameData:', JSON.stringify(orderData.frameData, null, 2));
    console.log('[order/create] - lensData:', JSON.stringify(orderData.lensData, null, 2));
    console.log('[order/create] - offerData:', JSON.stringify(orderData.offerData, null, 2));
    
    // Validate data structure matches Prisma schema expectations
    // Declare prismaOrderData outside try block so it's available in catch
    let prismaOrderData: any = null;
    try {
      console.log('[order/create] Attempting Prisma order.create...');
      // #region agent log
      await logDebug('route.ts:344', 'Before Prisma create', {orderDataKeys:Object.keys(orderData),finalPrice:orderData.finalPrice,orderType:orderData.orderType,hasFrameData:!!orderData.frameData,hasLensData:!!orderData.lensData,hasOfferData:!!orderData.offerData,frameDataBrand:orderData.frameData?.brand,frameDataMrp:orderData.frameData?.mrp,lensDataBrandLine:orderData.lensData?.brandLine,lensDataPrice:orderData.lensData?.price,offerDataBaseTotal:orderData.offerData?.baseTotal,offerDataFinalPayable:orderData.offerData?.finalPayable}, 'E', sessionId, runId);
      // #endregion
      
      // Ensure all required fields are present and correctly typed
      // Remove undefined values to avoid Prisma issues
      prismaOrderData = {
        storeId: orderData.storeId,
        salesMode: orderData.salesMode,
        customerName: orderData.customerName ?? null,
        customerPhone: orderData.customerPhone ?? null,
        frameData: orderData.frameData,
        lensData: orderData.lensData,
        offerData: orderData.offerData,
        orderType: orderData.orderType,
        finalPrice: orderData.finalPrice,
        status: orderData.status,
        createdAt: orderData.createdAt,
        updatedAt: orderData.updatedAt,
      };
      
      // Only add optional Json fields if they have values (not null/undefined)
      if (assistedByStaffIdJson !== null && assistedByStaffIdJson !== undefined) {
        prismaOrderData.assistedByStaffId = assistedByStaffIdJson;
      }
      if (assistedByNameJson !== null && assistedByNameJson !== undefined) {
        prismaOrderData.assistedByName = assistedByNameJson;
      }
      
      // Final validation - ensure all required fields are present
      if (!prismaOrderData.storeId) {
        throw new ValidationError('storeId is required');
      }
      if (!prismaOrderData.frameData || !prismaOrderData.frameData.brand || typeof prismaOrderData.frameData.mrp !== 'number') {
        throw new ValidationError('frameData is invalid - brand and mrp are required');
      }
      if (!prismaOrderData.lensData || !prismaOrderData.lensData.brandLine || !prismaOrderData.lensData.id || !prismaOrderData.lensData.index || !prismaOrderData.lensData.name || typeof prismaOrderData.lensData.price !== 'number') {
        throw new ValidationError('lensData is invalid - brandLine, id, index, name, and price are required');
      }
      if (!prismaOrderData.offerData || typeof prismaOrderData.offerData.baseTotal !== 'number' || typeof prismaOrderData.offerData.effectiveBase !== 'number' || typeof prismaOrderData.offerData.finalPayable !== 'number' || typeof prismaOrderData.offerData.frameMRP !== 'number' || typeof prismaOrderData.offerData.lensPrice !== 'number') {
        throw new ValidationError('offerData is invalid - baseTotal, effectiveBase, finalPayable, frameMRP, and lensPrice are required');
      }
      
      // Safe logging - avoid circular references
      try {
        const safeLogData = {
          storeId: prismaOrderData.storeId,
          salesMode: prismaOrderData.salesMode,
          orderType: prismaOrderData.orderType,
          finalPrice: prismaOrderData.finalPrice,
          status: prismaOrderData.status,
          hasFrameData: !!prismaOrderData.frameData,
          hasLensData: !!prismaOrderData.lensData,
          hasOfferData: !!prismaOrderData.offerData,
          frameDataBrand: prismaOrderData.frameData?.brand,
          frameDataMrp: prismaOrderData.frameData?.mrp,
          lensDataBrandLine: prismaOrderData.lensData?.brandLine,
          lensDataPrice: prismaOrderData.lensData?.price,
          offerDataBaseTotal: prismaOrderData.offerData?.baseTotal,
          offerDataFinalPayable: prismaOrderData.offerData?.finalPayable,
        };
        console.error('[order/create] About to create order with data:', JSON.stringify(safeLogData, null, 2));
      } catch (logErr) {
        console.error('[order/create] Failed to log order data:', logErr);
      }
      
      const order = await prisma.order.create({
        data: prismaOrderData,
      });
      // #region agent log
      await logDebug('route.ts:348', 'Prisma create succeeded', {orderId:order.id}, 'E', sessionId, runId);
      // #endregion
      console.log('[order/create] ✅ Order created successfully:', order.id);
      
      // Serialize the order response to handle BigInt and Date fields
      const serializedOrder = deepSerialize(order);

      return Response.json({
        success: true,
        data: serializedOrder,
      });
    } catch (prismaError: any) {
      // #region agent log
      try {
        await logDebug('route.ts:380', 'Prisma create error caught', {errorCode:prismaError?.code,errorMessage:prismaError?.message,errorName:prismaError?.name,errorMeta:prismaError?.meta,errorStack:prismaError?.stack?.substring(0,500)}, 'E', sessionId, runId);
      } catch (logErr) {
        console.error('[order/create] Failed to write debug log:', logErr);
      }
      // #endregion
      console.error('[order/create] ❌ Prisma create error:', prismaError);
      console.error('[order/create] Prisma error code:', prismaError?.code);
      console.error('[order/create] Prisma error message:', prismaError?.message);
      console.error('[order/create] Prisma error meta:', JSON.stringify(prismaError?.meta, null, 2));
      console.error('[order/create] Prisma error name:', prismaError?.name);
      console.error('[order/create] Prisma error stack:', prismaError?.stack);
      console.error('[order/create] Prisma error cause:', prismaError?.cause);
      console.error('[order/create] Full error object:', JSON.stringify(prismaError, Object.getOwnPropertyNames(prismaError), 2));
      
      // Log the actual data that failed (safely)
      if (prismaOrderData) {
        try {
          console.error('[order/create] Failed order data structure:');
          console.error('[order/create] - storeId:', prismaOrderData.storeId);
          console.error('[order/create] - salesMode:', prismaOrderData.salesMode);
          console.error('[order/create] - orderType:', prismaOrderData.orderType);
          console.error('[order/create] - finalPrice:', prismaOrderData.finalPrice);
          console.error('[order/create] - status:', prismaOrderData.status);
          console.error('[order/create] - createdAt type:', typeof prismaOrderData.createdAt, prismaOrderData.createdAt);
          console.error('[order/create] - updatedAt type:', typeof prismaOrderData.updatedAt, prismaOrderData.updatedAt);
          console.error('[order/create] - frameData keys:', prismaOrderData.frameData ? Object.keys(prismaOrderData.frameData) : 'null');
          console.error('[order/create] - lensData keys:', prismaOrderData.lensData ? Object.keys(prismaOrderData.lensData) : 'null');
          console.error('[order/create] - offerData keys:', prismaOrderData.offerData ? Object.keys(prismaOrderData.offerData) : 'null');
          console.error('[order/create] - frameData:', JSON.stringify(prismaOrderData.frameData, null, 2));
          console.error('[order/create] - lensData:', JSON.stringify(prismaOrderData.lensData, null, 2));
          console.error('[order/create] - offerData:', JSON.stringify(prismaOrderData.offerData, null, 2));
        } catch (logErr) {
          console.error('[order/create] Failed to log error details:', logErr);
        }
      } else {
        console.error('[order/create] prismaOrderData was not created before error occurred');
        try {
          console.error('[order/create] orderData available:', typeof orderData !== 'undefined');
          if (typeof orderData !== 'undefined') {
            console.error('[order/create] orderData keys:', Object.keys(orderData || {}));
          }
        } catch (e) {
          console.error('[order/create] orderData not accessible:', e);
        }
      }
      
      // Check for specific Prisma errors
      if (prismaError?.code === 'P2019') {
        console.error('[order/create] P2019 Error - Input error. Check field types and values.');
      } else if (prismaError?.code === 'P2011') {
        console.error('[order/create] P2011 Error - Null constraint violation. Check required fields.');
      } else if (prismaError?.code === 'P2012') {
        console.error('[order/create] P2012 Error - Missing required value.');
      }
      
      throw prismaError;
    }

  } catch (error: any) {
    // #region agent log
    await logDebug('route.ts:376', 'Final error catch', {errorType:typeof error,errorName:error?.name,errorMessage:error?.message,errorCode:error?.code,isValidationError:error instanceof ValidationError,hasIssues:!!error?.issues,errorStack:error?.stack?.substring(0,500)}, 'ALL', sessionId, runId);
    // #endregion
    console.error('='.repeat(80));
    console.error('[order/create] ========== ERROR START ==========');
    console.error('[order/create] Error:', error);
    console.error('[order/create] Error type:', typeof error);
    console.error('[order/create] Error name:', error?.name);
    console.error('[order/create] Error message:', error?.message);
    console.error('[order/create] Error stack:', error?.stack);
    
    // Log Prisma-specific errors
    if (error && typeof error === 'object' && 'code' in error) {
      const prismaError = error as { code: string; meta?: unknown; message?: string };
      console.error('[order/create] Prisma error code:', prismaError.code);
      console.error('[order/create] Prisma error message:', prismaError.message);
      console.error('[order/create] Prisma error meta:', JSON.stringify(prismaError.meta, null, 2));
      
      // Log specific Prisma error details
      if (prismaError.code === 'P2002') {
        console.error('[order/create] Unique constraint violation');
      } else if (prismaError.code === 'P2003') {
        console.error('[order/create] Foreign key constraint violation');
      } else if (prismaError.code === 'P2011') {
        console.error('[order/create] Null constraint violation');
      } else if (prismaError.code === 'P2012') {
        console.error('[order/create] Missing required value');
      } else if (prismaError.code === 'P2013') {
        console.error('[order/create] Missing required argument');
      } else if (prismaError.code === 'P2014') {
        console.error('[order/create] Relation violation');
      } else if (prismaError.code === 'P2015') {
        console.error('[order/create] Related record not found');
      } else if (prismaError.code === 'P2016') {
        console.error('[order/create] Query interpretation error');
      } else if (prismaError.code === 'P2017') {
        console.error('[order/create] Records for relation not connected');
      } else if (prismaError.code === 'P2018') {
        console.error('[order/create] Required connected records not found');
      } else if (prismaError.code === 'P2019') {
        console.error('[order/create] Input error');
      } else if (prismaError.code === 'P2020') {
        console.error('[order/create] Value out of range');
      } else if (prismaError.code === 'P2021') {
        console.error('[order/create] Table does not exist');
      } else if (prismaError.code === 'P2022') {
        console.error('[order/create] Column does not exist');
      } else if (prismaError.code === 'P2025') {
        console.error('[order/create] Record not found');
      }
    }
    
    // Log validation errors
    if (error instanceof ValidationError) {
      console.error('[order/create] Validation error:', error.message);
    }
    
    // Log Zod validation errors
    if (error?.issues && Array.isArray(error.issues)) {
      console.error('[order/create] Zod validation errors:', JSON.stringify(error.issues, null, 2));
    }
    
    console.error('[order/create] ========== ERROR END ==========');
    console.error('='.repeat(80));
    
    return handleApiError(error);
  }
}

