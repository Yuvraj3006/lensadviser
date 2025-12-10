/**
 * GET /api/public/tint-colors/[id]/pricing
 * Get tint pricing for a specific tint color and lens index
 */

import { NextRequest } from 'next/server';
import { handleApiError } from '@/lib/errors';
import { tintPricingService } from '@/services/tint-pricing.service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const lensIndex = request.nextUrl.searchParams.get('lensIndex') as 'INDEX_156' | 'INDEX_160' | 'INDEX_167' | 'INDEX_174' | null;

    if (!lensIndex) {
      return Response.json({
        success: false,
        error: 'lensIndex query parameter is required',
      }, { status: 400 });
    }

    const pricing = await tintPricingService.calculateTintPrice(id, lensIndex);

    return Response.json({
      success: true,
      data: pricing,
    });
  } catch (error: any) {
    console.error('[tint-colors/pricing] Error:', error);
    return handleApiError(error);
  }
}
