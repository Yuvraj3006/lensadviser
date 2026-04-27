import { NextRequest } from 'next/server';
import { handleApiError } from '@/lib/errors';
import { prisma } from '@/lib/prisma';
import { TintOption, VisionType } from '@prisma/client';

const VISION_TYPE_VALUES: VisionType[] = [
  'SINGLE_VISION',
  'PROGRESSIVE',
  'BIFOCAL',
  'ANTI_FATIGUE',
  'MYOPIA_CONTROL',
];

/**
 * GET /api/products/lenses
 * List all lens products
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get('category') || 'EYEGLASSES';
    /** BOGO 2nd pair: EYEGLASS = clear lenses, SUNGLASS / POWER_SUNGLASS = tinted / sun-appropriate SKUs */
    /** When set, narrows list for BOGO 2nd pair. Omit param = return all active lenses (backwards compatible). */
    const secondPairKind = searchParams.get('secondPairKind')?.toUpperCase() || null;
    /** Match 1st-pair / recommendation vision (e.g. SINGLE_VISION) — do not show progressive if user has SV */
    const visionTypeParam = searchParams.get('visionType')?.toUpperCase().trim() || null;
    let organizationId = searchParams.get('organizationId');

    // Try to get from auth if not in query
    if (!organizationId) {
      try {
        const { authenticate } = await import('@/middleware/auth.middleware');
        const user = await authenticate(request);
        organizationId = user.organizationId;
      } catch {
        // Not authenticated, organizationId not required for public lens listing
      }
    }

    const tintFilter =
      secondPairKind === 'EYEGLASS'
        ? { tintOption: TintOption.CLEAR }
        : secondPairKind === 'SUNGLASS' || secondPairKind === 'POWER_SUNGLASS'
          ? {
              tintOption: { in: [TintOption.TINT, TintOption.PHOTOCHROMIC, TintOption.TRANSITION] },
            }
          : undefined;

    const visionFilter =
      visionTypeParam && (VISION_TYPE_VALUES as string[]).includes(visionTypeParam)
        ? { visionType: visionTypeParam as VisionType }
        : {};

    const where = {
      isActive: true,
      ...visionFilter,
      ...(tintFilter || {}),
    };

    const products = await prisma.lensProduct.findMany({
      where,
      orderBy: [{ brandLine: 'asc' }, { lensIndex: 'asc' }, { name: 'asc' }],
    });

    return Response.json({
      success: true,
      data: products.map((p) => ({
        id: p.id,
        itCode: p.itCode,
        name: p.name,
        brandLine: p.brandLine,
        index: p.lensIndex,
        price: p.baseOfferPrice,
        yopoEligible: p.yopoEligible,
        visionType: p.visionType,
        tintOption: p.tintOption,
        category: p.category,
        deliveryDays: p.deliveryDays,
      })),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

