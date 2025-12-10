import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticate, authorize } from '@/middleware/auth.middleware';
import { handleApiError, ValidationError } from '@/lib/errors';
import { UserRole } from '@/lib/constants';
import { z } from 'zod';

const createContactLensProductSchema = z.object({
  skuCode: z.string().min(1),
  brand: z.string().min(1),
  line: z.string().min(1),
  modality: z.enum(['DAILY', 'BIWEEKLY', 'MONTHLY', 'YEARLY']),
  lensType: z.enum(['SPHERICAL', 'TORIC', 'MULTIFOCAL', 'COSMETIC']),
  material: z.string().optional(),
  waterContent: z.string().optional(),
  designNotes: z.string().optional(),
  packSize: z.number().positive(),
  mrp: z.number().positive(),
  offerPrice: z.number().min(0),
  sphMin: z.number().optional(),
  sphMax: z.number().optional(),
  cylMin: z.number().optional(),
  cylMax: z.number().optional(),
  axisSteps: z.array(z.number()).optional(),
  addMin: z.number().optional(),
  addMax: z.number().optional(),
  isColorLens: z.boolean().default(false),
  colorOptions: z.array(z.string()).optional(),
  isActive: z.boolean().default(true),
});

/**
 * GET /api/admin/contact-lens-products
 * List contact lens products
 */
export async function GET(request: NextRequest) {
  try {
    const user = await authenticate(request);
    authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.STORE_MANAGER)(user);

    const { searchParams } = new URL(request.url);
    const brand = searchParams.get('brand');
    const modality = searchParams.get('modality');
    const lensType = searchParams.get('lensType');

    const where: any = {
      isActive: true,
    };

    if (brand) {
      where.brand = { contains: brand, mode: 'insensitive' };
    }
    if (modality) {
      where.modality = modality;
    }
    if (lensType) {
      where.lensType = lensType;
    }

    const products = await prisma.contactLensProduct.findMany({
      where,
      orderBy: [
        { brand: 'asc' },
        { line: 'asc' },
        { packSize: 'asc' },
      ],
    });

    return Response.json({
      success: true,
      data: products,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/admin/contact-lens-products
 * Create a new contact lens product
 */
export async function POST(request: NextRequest) {
  try {
    const user = await authenticate(request);
    authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN)(user);

    const body = await request.json();
    const validated = createContactLensProductSchema.parse(body);

    // Check if SKU code already exists
    const existing = await prisma.contactLensProduct.findUnique({
      where: { skuCode: validated.skuCode },
    });

    if (existing) {
      throw new ValidationError('Contact lens SKU code already exists');
    }

    // Convert arrays to JSON strings for storage
    const productData: any = {
      ...validated,
      axisSteps: validated.axisSteps ? JSON.stringify(validated.axisSteps) : null,
      colorOptions: validated.colorOptions ? JSON.stringify(validated.colorOptions) : null,
    };

    const product = await prisma.contactLensProduct.create({
      data: productData,
    });

    return Response.json({
      success: true,
      data: product,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

