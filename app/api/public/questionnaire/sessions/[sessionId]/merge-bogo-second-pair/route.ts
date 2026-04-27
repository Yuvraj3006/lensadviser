import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { handleApiError, ValidationError } from '@/lib/errors';

const bodySchema = z.object({
  secondPairLensId: z.string().min(1, 'secondPairLensId is required'),
});

/**
 * POST /api/public/questionnaire/sessions/{sessionId}/merge-bogo-second-pair
 * `sessionId` = BOGO 2nd-person (child) session. Merges chosen lens + 2nd person's name/Rx into parent `secondPairData`, then links child as merged.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId: childId } = await params;
    let body: z.infer<typeof bodySchema>;
    try {
      const json = await request.json();
      body = bodySchema.parse(json);
    } catch {
      throw new ValidationError('secondPairLensId (lens product id) is required');
    }

    const child = await prisma.session.findUnique({ where: { id: childId } });
    if (!child) {
      return Response.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Session not found' } },
        { status: 404 }
      );
    }
    if (!child.parentSessionId) {
      throw new ValidationError('This session is not a BOGO second-person flow');
    }
    if (child.bogoChildMergedAt) {
      throw new ValidationError('This second-person flow was already merged');
    }

    const parent = await prisma.session.findUnique({ where: { id: child.parentSessionId } });
    if (!parent) {
      return Response.json(
        { success: false, error: { code: 'PARENT_NOT_FOUND', message: 'Parent session not found' } },
        { status: 404 }
      );
    }
    if (child.storeId !== parent.storeId) {
      throw new ValidationError('Parent/child store mismatch');
    }

    const parentSp = (parent.secondPairData as Record<string, unknown> | null) || {};
    const frameMRP = Number(parentSp.frameMRP) || 0;
    const brand = typeof parentSp.brand === 'string' ? parentSp.brand : '';
    if (frameMRP <= 0 || !brand) {
      throw new ValidationError(
        'On the first customer’s offer page, enter 2nd pair frame MRP and brand first, then run the other-person flow again.'
      );
    }
    if (parentSp.bogoSecondPersonInProgress !== true) {
      throw new ValidationError(
        'Parent session is not in “second person questionnaire” state. Open BOGO, enter 2nd frame details, and start the other-person flow from there.'
      );
    }

    const product = await prisma.lensProduct.findUnique({
      where: { id: body.secondPairLensId },
    });
    if (!product) {
      throw new ValidationError('Selected lens not found');
    }

    const [store, storeProduct] = await Promise.all([
      prisma.store.findUnique({ where: { id: parent.storeId } }),
      prisma.storeProduct.findFirst({
        where: { storeId: parent.storeId, productId: body.secondPairLensId },
      }),
    ]);
    const organization = store
      ? await prisma.organization.findUnique({ where: { id: store.organizationId } })
      : null;
    const orgBaseLens = organization?.baseLensPrice ?? 0;

    /** Align with recalculate-offers + recommendations: store override → offer price → org default → MRP */
    const resolveSecondPairLensPrice = (): number => {
      const po = storeProduct?.priceOverride;
      if (typeof po === 'number' && !Number.isNaN(po) && po > 0) {
        return Math.round(po);
      }
      const offer = product.baseOfferPrice;
      if (typeof offer === 'number' && !Number.isNaN(offer) && offer > 0) {
        return Math.round(offer);
      }
      if (orgBaseLens > 0) {
        return Math.round(orgBaseLens);
      }
      const mrp = product.mrp;
      if (typeof mrp === 'number' && !Number.isNaN(mrp) && mrp > 0) {
        return Math.round(mrp);
      }
      return 0;
    };

    const notes = (child.customerEmail as { prescription?: Record<string, number | string> } | null) || null;
    const p = notes?.prescription;
    const secondPairOtherRx =
      p && (p.odSphere != null || p.osSphere != null)
        ? {
            odSphere: p.odSphere != null ? String(p.odSphere) : '0',
            osSphere: p.osSphere != null ? String(p.osSphere) : '0',
            odCylinder: p.odCylinder != null ? String(p.odCylinder) : '0',
            osCylinder: p.osCylinder != null ? String(p.osCylinder) : '0',
            odAdd: p.odAdd != null ? String(p.odAdd) : undefined,
          }
        : {
            odSphere: '0',
            osSphere: '0',
            odCylinder: '0',
            osCylinder: '0',
          };

    const lensPrice = resolveSecondPairLensPrice();

    const subBrand = typeof parentSp.subBrand === 'string' ? parentSp.subBrand : '';
    const secondPairProductKind =
      parentSp.secondPairProductKind === 'POWER_SUNGLASS' ||
      parentSp.secondPairProductKind === 'SUNGLASS' ||
      parentSp.secondPairProductKind === 'EYEGLASS'
        ? parentSp.secondPairProductKind
        : 'EYEGLASS';

    if (secondPairProductKind !== 'EYEGLASS') {
      throw new ValidationError(
        'Merging a full other-person flow is only wired for 2nd pair = Eyeglass for now. Use the on-page flow for sun / power-sun.'
      );
    }

    const merged: Record<string, unknown> = {
      ...parentSp,
      enabled: true,
      frameMRP,
      brand,
      subBrand: subBrand || null,
      secondPairProductKind,
      lensRecipient: 'other',
      bogoSecondPersonInProgress: false,
      bogoSecondPersonName: child.customerName,
      bogoSecondPersonPhone: child.customerPhone,
      bogoSecondPersonChildSessionId: childId,
      lensId: product.id,
      lensName: product.name,
      lensPrice,
      secondPairOtherRx,
    };
    const now = new Date();
    await prisma.$transaction([
      prisma.session.update({
        where: { id: parent.id },
        data: { secondPairData: merged as object },
      }),
      prisma.session.update({
        where: { id: childId },
        data: { bogoChildMergedAt: now },
      }),
    ]);

    const returnProductId = child.bogoParentFirstPairProductId;
    if (!returnProductId) {
      return Response.json({
        success: true,
        data: {
          parentSessionId: parent.id,
          offerSummaryPath: null,
        },
      });
    }

    return Response.json({
      success: true,
      data: {
        parentSessionId: parent.id,
        parentFirstPairProductId: returnProductId,
        offerSummaryPath: `/questionnaire/${parent.id}/offer-summary/${returnProductId}`,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
