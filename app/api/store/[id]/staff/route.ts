import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleApiError } from '@/lib/errors';

/**
 * GET /api/store/[id]/staff
 * Get list of active staff for a store
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Validate store exists
    const store = await prisma.store.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!store) {
      return Response.json(
        {
          success: false,
          error: {
            code: 'RESOURCE_NOT_FOUND',
            message: 'Store not found',
          },
        },
        { status: 404 }
      );
    }

    // Query staff - storeId and status are JSON fields in schema
    // Since JSON fields can't be queried directly with equality in Prisma/MongoDB,
    // we'll fetch all staff and filter in JavaScript
    let allStaff;
    try {
      allStaff = await prisma.staff.findMany({
        select: {
          id: true,
          status: true,
          storeId: true,
        },
      });
    } catch (queryError: any) {
      console.error('[store/[id]/staff] Query error:', queryError);
      console.error('[store/[id]/staff] Error details:', {
        message: queryError?.message,
        code: queryError?.code,
        meta: queryError?.meta,
      });
      throw queryError;
    }

    // Filter staff by storeId and status in JavaScript
    // Handle JSON fields - they might be strings, objects, or other types
    const staff = (allStaff || []).filter((s: any) => {
      // Extract storeId - handle different JSON formats
      let staffStoreId: string | null = null;
      if (typeof s.storeId === 'string') {
        staffStoreId = s.storeId;
      } else if (s.storeId && typeof s.storeId === 'object') {
        staffStoreId = s.storeId.value || s.storeId.id || s.storeId.toString();
      } else if (s.storeId !== null && s.storeId !== undefined) {
        staffStoreId = String(s.storeId);
      }

      // Extract status - handle different JSON formats
      let staffStatus: string | null = null;
      if (typeof s.status === 'string') {
        staffStatus = s.status;
      } else if (s.status && typeof s.status === 'object') {
        staffStatus = s.status.value || s.status.status || s.status.toString();
      } else if (s.status !== null && s.status !== undefined) {
        staffStatus = String(s.status);
      }

      // Check if staff belongs to this store and is active
      const matchesStore = staffStoreId === id;
      const isActive = staffStatus === 'ACTIVE' || staffStatus === 'Active' || staffStatus?.toUpperCase() === 'ACTIVE';

      return matchesStore && isActive;
    });

    return Response.json({
      success: true,
      data: staff || [],
    });
  } catch (error: any) {
    console.error('[store/[id]/staff] Error:', error);
    console.error('[store/[id]/staff] Error type:', typeof error);
    console.error('[store/[id]/staff] Error message:', error?.message);
    console.error('[store/[id]/staff] Error stack:', error?.stack);
    return handleApiError(error);
  }
}

