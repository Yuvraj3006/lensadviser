import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticate, authorize } from '@/middleware/auth.middleware';
import { handleApiError } from '@/lib/errors';
import { UserRole } from '@prisma/client';
import { z } from 'zod';

const createBrandSchema = z.object({
  brandName: z.string().min(1, 'Brand name is required'),
});

// GET /api/admin/frame-brands - List all frame brands with sub-brands
export async function GET(request: NextRequest) {
  try {
    const user = await authenticate(request);

    const brands = await prisma.frameBrand.findMany({
      where: {
        organizationId: user.organizationId,
      },
      include: {
        subBrands: {
          where: {
            isActive: true,
          },
          orderBy: {
            subBrandName: 'asc',
          },
        },
      },
      orderBy: {
        brandName: 'asc',
      },
    });

    return Response.json({
      success: true,
      data: brands,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

// POST /api/admin/frame-brands - Create new frame brand
export async function POST(request: NextRequest) {
  try {
    console.log('POST /api/admin/frame-brands - Starting request');
    const user = await authenticate(request);
    console.log('POST /api/admin/frame-brands - User authenticated:', { userId: user.userId, organizationId: user.organizationId, role: user.role });
    
    try {
      authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN)(user);
      console.log('POST /api/admin/frame-brands - User authorized');
    } catch (authError) {
      console.error('POST /api/admin/frame-brands - Authorization failed:', authError);
      return handleApiError(authError);
    }

    const body = await request.json();
    console.log('POST /api/admin/frame-brands - Request body:', body);
    
    const validatedData = createBrandSchema.parse(body);
    console.log('POST /api/admin/frame-brands - Data validated:', validatedData);

    // Trim and normalize brand name
    const brandName = validatedData.brandName.trim();

    if (!brandName) {
      return Response.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Brand name cannot be empty',
          },
        },
        { status: 400 }
      );
    }

    console.log('POST /api/admin/frame-brands - Checking for existing brand:', { brandName, organizationId: user.organizationId });
    console.log('POST /api/admin/frame-brands - Prisma client check:', { 
      hasFrameBrand: !!prisma.frameBrand,
      frameBrandType: typeof prisma.frameBrand,
      hasFindFirst: !!prisma.frameBrand?.findFirst
    });
    
    if (!prisma.frameBrand) {
      console.error('ERROR: prisma.frameBrand is undefined! Prisma client may not be regenerated.');
      throw new Error('Prisma client error: FrameBrand model not found. Please restart the server.');
    }
    
    // Check if brand already exists
    const existingBrand = await prisma.frameBrand.findFirst({
      where: {
        organizationId: user.organizationId,
        brandName: brandName,
      },
    });

    if (existingBrand) {
      console.log('POST /api/admin/frame-brands - Brand already exists');
      return Response.json(
        {
          success: false,
          error: {
            code: 'RESOURCE_CONFLICT',
            message: `Brand "${brandName}" already exists`,
          },
        },
        { status: 409 }
      );
    }

    console.log('POST /api/admin/frame-brands - Creating brand:', { brandName, organizationId: user.organizationId });
    
    // Create brand
    const brand = await prisma.frameBrand.create({
      data: {
        brandName: brandName,
        organizationId: user.organizationId,
      },
    });

    console.log('POST /api/admin/frame-brands - Brand created successfully:', brand.id);
    
    return Response.json({
      success: true,
      data: brand,
    });
  } catch (error) {
    console.error('POST /api/admin/frame-brands - Error caught:', error);
    console.error('Error type:', error?.constructor?.name);
    console.error('Error message:', error instanceof Error ? error.message : 'Unknown error');
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack');
    
    if (error instanceof z.ZodError) {
      console.error('Zod validation error:', error.issues);
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
    
    // Log Prisma errors specifically
    if (error && typeof error === 'object' && 'code' in error) {
      const prismaError = error as { code: string; meta?: unknown; message?: string };
      console.error('Prisma error code:', prismaError.code);
      console.error('Prisma error message:', prismaError.message);
      console.error('Prisma error meta:', prismaError.meta);
    }
    
    return handleApiError(error);
  }
}

