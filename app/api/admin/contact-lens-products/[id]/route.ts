import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticate, authorize } from '@/middleware/auth.middleware';
import { handleApiError, ValidationError } from '@/lib/errors';
import { UserRole } from '@/lib/constants';
import { z } from 'zod';

const updateContactLensProductSchema = z.object({
  skuCode: z.string().min(1).optional(),
  brand: z.string().min(1).optional(),
  line: z.string().min(1).optional(),
  modality: z.enum(['DAILY', 'BIWEEKLY', 'MONTHLY', 'YEARLY']).optional(),
  lensType: z.enum(['SPHERICAL', 'TORIC', 'MULTIFOCAL', 'COSMETIC']).optional(),
  material: z.string().optional(),
  waterContent: z.string().optional(),
  designNotes: z.string().optional(),
  packSize: z.number().positive().optional(),
  mrp: z.number().positive().optional(),
  offerPrice: z.number().min(0).optional(),
  sphMin: z.number().optional(),
  sphMax: z.number().optional(),
  cylMin: z.number().optional(),
  cylMax: z.number().optional(),
  axisSteps: z.array(z.number()).optional(),
  addMin: z.number().optional(),
  addMax: z.number().optional(),
  isColorLens: z.boolean().optional(),
  colorOptions: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
});

/**
 * PUT /api/admin/contact-lens-products/[id]
 * Update a contact lens product
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
    const validated = updateContactLensProductSchema.parse(body);

    // Check if product exists
    const existing = await prisma.contactLensProduct.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new ValidationError('Contact lens product not found');
    }

    // Check SKU uniqueness if SKU is being updated
    if (validated.skuCode && validated.skuCode !== existing.skuCode) {
      const skuExists = await prisma.contactLensProduct.findUnique({
        where: { skuCode: validated.skuCode },
      });
      if (skuExists) {
        throw new ValidationError('Contact lens SKU code already exists');
      }
    }

    // Convert arrays to JSON strings for storage
    const updateData: any = { ...validated };
    if (validated.axisSteps !== undefined) {
      updateData.axisSteps = validated.axisSteps ? JSON.stringify(validated.axisSteps) : null;
    }
    if (validated.colorOptions !== undefined) {
      updateData.colorOptions = validated.colorOptions ? JSON.stringify(validated.colorOptions) : null;
    }

    const updated = await prisma.contactLensProduct.update({
      where: { id },
      data: updateData,
    });

    return Response.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * DELETE /api/admin/contact-lens-products/[id]
 * Delete a contact lens product
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await authenticate(request);
    authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN)(user);

    const { id } = await params;

    await prisma.contactLensProduct.delete({
      where: { id },
    });

    return Response.json({
      success: true,
      message: 'Contact lens product deleted successfully',
    });
  } catch (error) {
    return handleApiError(error);
  }
}

