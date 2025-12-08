import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticate, authorize } from '@/middleware/auth.middleware';
import { handleApiError, NotFoundError } from '@/lib/errors';
import { UserRole } from '@/lib/constants';
import { z } from 'zod';

// PUT /api/admin/features/[id] - Update feature
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const user = await authenticate(request);
    authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN)(user);

    // Handle both Promise and direct params (Next.js 15+ uses Promise)
    const resolvedParams = params instanceof Promise ? await params : params;
    const id = resolvedParams.id;

    if (!id) {
      return Response.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Feature ID is required',
          },
        },
        { status: 400 }
      );
    }

    const body = await request.json();
    
    // Update schema for Feature (name, description, category only - code cannot be changed)
    const updateFeatureSchema = z.object({
      name: z.string().min(1).optional(),
      description: z.string().optional().nullable(),
      category: z.enum(['DURABILITY', 'COATING', 'PROTECTION', 'LIFESTYLE', 'VISION']).optional(),
      displayOrder: z.number().int().min(1).optional(),
      isActive: z.boolean().optional(),
    });
    
    const validatedData = updateFeatureSchema.parse(body);

    // Features are global (no organizationId)
    const feature = await prisma.feature.update({
      where: {
        id,
      },
      data: validatedData,
    });

    return Response.json({
      success: true,
      data: feature,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Validation failed',
            details: error.issues,
          },
        },
        { status: 400 }
      );
    }
    return handleApiError(error);
  }
}

// DELETE /api/admin/features/[id] - Soft delete feature
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const user = await authenticate(request);
    authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN)(user);

    // Handle both Promise and direct params (Next.js 15+ uses Promise)
    const resolvedParams = params instanceof Promise ? await params : params;
    const id = resolvedParams.id;

    if (!id) {
      return Response.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Feature ID is required',
          },
        },
        { status: 400 }
      );
    }

    // Soft delete (set isActive to false)
    // Features are global (no organizationId)
    const feature = await prisma.feature.update({
      where: {
        id,
      },
      data: {
        isActive: false,
      },
    });

    return Response.json({
      success: true,
      data: feature,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

