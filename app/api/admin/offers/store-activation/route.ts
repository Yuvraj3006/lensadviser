import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticate, authorize } from '@/middleware/auth.middleware';
import { handleApiError, ValidationError } from '@/lib/errors';
import { UserRole } from '@/lib/constants';
import { z } from 'zod';

const activateOfferSchema = z.object({
  storeId: z.string().min(1, 'Store ID is required'),
  offerRuleId: z.string().min(1, 'Offer Rule ID is required'),
  isActive: z.boolean().default(true),
});

/**
 * GET /api/admin/offers/store-activation
 * Get store offer activations (filter by storeId or offerRuleId)
 */
export async function GET(request: NextRequest) {
  try {
    const user = await authenticate(request);
    authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN)(user);

    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get('storeId');
    const offerRuleId = searchParams.get('offerRuleId');
    const organizationId = user.organizationId;

    const where: any = {};

    if (storeId) {
      // Verify store belongs to organization
      const store = await prisma.store.findUnique({
        where: { id: storeId },
      });
      if (!store || store.organizationId !== organizationId) {
        throw new ValidationError('Store not found or access denied');
      }
      where.storeId = storeId;
    }

    if (offerRuleId) {
      // Verify offer rule belongs to organization
      const rule = await prisma.offerRule.findUnique({
        where: { id: offerRuleId },
      });
      if (!rule || rule.organizationId !== organizationId) {
        throw new ValidationError('Offer rule not found or access denied');
      }
      where.offerRuleId = offerRuleId;
    }

    const activations = await (prisma.storeOfferMap.findMany as any)({
      where,
      include: {
        // Note: Prisma relations may need to be defined in schema
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return Response.json({
      success: true,
      data: activations,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/admin/offers/store-activation
 * Activate or deactivate an offer rule for a store
 */
export async function POST(request: NextRequest) {
  try {
    const user = await authenticate(request);
    authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN)(user);

    const body = await request.json();
    const validationResult = activateOfferSchema.safeParse(body);

    if (!validationResult.success) {
      throw new ValidationError('Invalid input', validationResult.error.issues);
    }

    const { storeId, offerRuleId, isActive } = validationResult.data;
    const organizationId = user.organizationId;

    // Verify store belongs to organization
    const store = await prisma.store.findUnique({
      where: { id: storeId },
    });
    if (!store || store.organizationId !== organizationId) {
      throw new ValidationError('Store not found or access denied');
    }

    // Verify offer rule belongs to organization
    const rule = await prisma.offerRule.findUnique({
      where: { id: offerRuleId },
    });
    if (!rule || rule.organizationId !== organizationId) {
      throw new ValidationError('Offer rule not found or access denied');
    }

    // Upsert store offer activation
    const activation = await prisma.storeOfferMap.upsert({
      where: {
        storeId_offerRuleId: {
          storeId,
          offerRuleId,
        },
      },
      update: {
        isActive,
        deactivatedAt: isActive ? null : new Date(),
        updatedAt: new Date(),
      },
      create: {
        storeId,
        offerRuleId,
        isActive,
        activatedAt: new Date(),
        deactivatedAt: isActive ? null : new Date(),
      },
    });

    return Response.json({
      success: true,
      data: activation,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * DELETE /api/admin/offers/store-activation
 * Remove store offer activation
 */
export async function DELETE(request: NextRequest) {
  try {
    const user = await authenticate(request);
    authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN)(user);

    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get('storeId');
    const offerRuleId = searchParams.get('offerRuleId');

    if (!storeId || !offerRuleId) {
      throw new ValidationError('storeId and offerRuleId are required');
    }

    const organizationId = user.organizationId;

    // Verify store belongs to organization
    const store = await prisma.store.findUnique({
      where: { id: storeId },
    });
    if (!store || store.organizationId !== organizationId) {
      throw new ValidationError('Store not found or access denied');
    }

    // Verify offer rule belongs to organization
    const rule = await prisma.offerRule.findUnique({
      where: { id: offerRuleId },
    });
    if (!rule || rule.organizationId !== organizationId) {
      throw new ValidationError('Offer rule not found or access denied');
    }

    await prisma.storeOfferMap.delete({
      where: {
        storeId_offerRuleId: {
          storeId,
          offerRuleId,
        },
      },
    });

    return Response.json({
      success: true,
      message: 'Store offer activation removed',
    });
  } catch (error) {
    return handleApiError(error);
  }
}

