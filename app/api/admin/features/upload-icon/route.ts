import { NextRequest } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { authenticate, authorize } from '@/middleware/auth.middleware';
import { UserRole } from '@/lib/constants';
import { handleApiError } from '@/lib/errors';

/**
 * POST /api/admin/features/upload-icon
 * Upload feature icon image
 */
export async function POST(request: NextRequest) {
  try {
    const user = await authenticate(request);
    authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN)(user);

    const formData = await request.formData();
    const iconFile = formData.get('icon') as File;
    const featureCode = formData.get('featureCode') as string;

    if (!iconFile) {
      return Response.json(
        {
          success: false,
          error: {
            code: 'MISSING_FILE',
            message: 'Icon file is required',
          },
        },
        { status: 400 }
      );
    }

    if (!featureCode) {
      return Response.json(
        {
          success: false,
          error: {
            code: 'MISSING_FEATURE_CODE',
            message: 'Feature code is required',
          },
        },
        { status: 400 }
      );
    }

    // Validate file type
    if (!iconFile.type.startsWith('image/')) {
      return Response.json(
        {
          success: false,
          error: {
            code: 'INVALID_FILE_TYPE',
            message: 'File must be an image',
          },
        },
        { status: 400 }
      );
    }

    // Validate file size (max 2MB)
    if (iconFile.size > 2 * 1024 * 1024) {
      return Response.json(
        {
          success: false,
          error: {
            code: 'FILE_TOO_LARGE',
            message: 'File size must be less than 2MB',
          },
        },
        { status: 400 }
      );
    }

    // Create feature-icons directory if it doesn't exist
    const iconsDir = join(process.cwd(), 'public', 'feature-icons');
    await mkdir(iconsDir, { recursive: true });

    // Generate filename: feature-code-timestamp.extension
    const fileExtension = iconFile.name.split('.').pop() || 'png';
    const timestamp = Date.now();
    const fileName = `${featureCode.toLowerCase()}-${timestamp}.${fileExtension}`;
    const filePath = join(iconsDir, fileName);

    // Convert file to buffer and save
    const bytes = await iconFile.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // Return the public URL
    const iconUrl = `/feature-icons/${fileName}`;

    return Response.json({
      success: true,
      data: {
        iconUrl,
        fileName,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

