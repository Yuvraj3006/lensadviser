import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticate, authorize } from '@/middleware/auth.middleware';
import { handleApiError, ValidationError } from '@/lib/errors';
import { UserRole } from '@/lib/constants';
import { serializePrismaModels } from '@/lib/serialization';
import { z } from 'zod';

const createAddOnPricingSchema = z.object({
  sphMin: z.number().nullable().optional(),
  sphMax: z.number().nullable().optional(),
  cylMin: z.number().nullable().optional(),
  cylMax: z.number().nullable().optional(),
  addMin: z.number().nullable().optional(),
  addMax: z.number().nullable().optional(),
  extraCharge: z.number().int().min(0),
});

/**
 * GET /api/admin/lenses/[id]/power-addon-pricing
 * List all RX add-on pricing bands for a lens
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let lensId: string | undefined;
  try {
    const user = await authenticate(request);
    authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN)(user);

    const resolvedParams = await params;
    lensId = resolvedParams.id;

    // Verify lens exists
    const lens = await prisma.lensProduct.findUnique({
      where: { id: lensId },
    });

    if (!lens) {
      throw new ValidationError('Lens not found');
    }

    // Use type assertion to access the model (TypeScript might not recognize it)
    // The model exists in Prisma client, access it directly
    const prismaClient = prisma as any;
    
    let addOnPricing;
    try {
      // Directly access the model - it exists in the generated Prisma client
      addOnPricing = await prismaClient.lensPowerAddOnPricing.findMany({
        where: { lensId },
        orderBy: { extraCharge: 'desc' },
      });
    } catch (prismaError: any) {
      console.error('[GET /api/admin/lenses/[id]/power-addon-pricing] Prisma query error:', {
        code: prismaError?.code,
        message: prismaError?.message,
        meta: prismaError?.meta,
      });
      throw prismaError;
    }

    // Serialize Date fields for JSON response
    const serializedData = serializePrismaModels(addOnPricing || []);

    return Response.json({
      success: true,
      data: serializedData,
    });
  } catch (error: any) {
    // Log detailed error information
    console.error('[GET /api/admin/lenses/[id]/power-addon-pricing] Error details:', {
      error,
      errorType: error?.constructor?.name,
      message: error?.message || String(error),
      stack: error?.stack,
      code: error?.code,
      meta: error?.meta,
      lensId,
      prismaClientKeys: Object.keys(prisma as any).filter(k => !k.startsWith('_') && !k.startsWith('$')).slice(0, 20),
      hasModel: !!(prisma as any).lensPowerAddOnPricing,
    });
    
    // If it's a Prisma error about missing model, provide specific message
    if (error?.message?.includes('lensPowerAddOnPricing') || error?.code === 'P2001') {
      return Response.json({
        success: false,
        error: {
          code: 'MODEL_NOT_FOUND',
          message: 'Power add-on pricing model not found in Prisma client. Please restart the server.',
          details: {
            availableModels: Object.keys(prisma as any).filter(k => !k.startsWith('_') && !k.startsWith('$') && typeof (prisma as any)[k] === 'object').slice(0, 10),
          },
        },
      }, { status: 500 });
    }
    
    return handleApiError(error);
  }
}

/**
 * POST /api/admin/lenses/[id]/power-addon-pricing
 * Create a new RX add-on pricing band
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await authenticate(request);
    authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN)(user);

    const { id: lensId } = await params;
    const body = await request.json();
    const validated = createAddOnPricingSchema.parse(body);

    // Verify lens exists
    const lens = await prisma.lensProduct.findUnique({
      where: { id: lensId },
    });

    if (!lens) {
      throw new ValidationError('Lens not found');
    }

    // Validate ranges
    if (validated.sphMin !== null && validated.sphMin !== undefined && validated.sphMax !== null && validated.sphMax !== undefined) {
      if (validated.sphMin >= validated.sphMax) {
        throw new ValidationError('SPH Min must be less than SPH Max');
      }
    }

    if (validated.cylMin !== null && validated.cylMin !== undefined && validated.cylMax !== null && validated.cylMax !== undefined) {
      if (Math.abs(validated.cylMin) >= Math.abs(validated.cylMax)) {
        throw new ValidationError('CYL Min must be less than CYL Max (in absolute terms)');
      }
    }

    if (validated.addMin !== null && validated.addMin !== undefined && validated.addMax !== null && validated.addMax !== undefined) {
      if (validated.addMin >= validated.addMax) {
        throw new ValidationError('ADD Min must be less than ADD Max');
      }
    }

    // At least one range must be specified
    if (
      validated.sphMin === null && validated.sphMax === null &&
      validated.cylMin === null && validated.cylMax === null &&
      validated.addMin === null && validated.addMax === null
    ) {
      throw new ValidationError('At least one range (SPH, CYL, or ADD) must be specified');
    }

    // Use type assertion to access the model (TypeScript might not recognize it)
    const addOnPricing = await (prisma as any).lensPowerAddOnPricing.create({
      data: {
        lensId,
        sphMin: validated.sphMin ?? null,
        sphMax: validated.sphMax ?? null,
        cylMin: validated.cylMin ?? null,
        cylMax: validated.cylMax ?? null,
        addMin: validated.addMin ?? null,
        addMax: validated.addMax ?? null,
        extraCharge: validated.extraCharge,
      },
    });

    // Serialize Date fields for JSON response
    const serializedData = serializePrismaModels([addOnPricing])[0];

    return Response.json({
      success: true,
      data: serializedData,
    });
  } catch (error) {
    console.error('[POST /api/admin/lenses/[id]/power-addon-pricing] Error details:', {
      error,
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return handleApiError(error);
  }
}
