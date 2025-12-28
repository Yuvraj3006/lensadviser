import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticate, authorize } from '@/middleware/auth.middleware';
import { handleApiError } from '@/lib/errors';
import { UserRole } from '@/lib/constants';
import * as XLSX from 'xlsx';
import { z } from 'zod';

// Expected Excel columns schema
const featureRowSchema = z.object({
  code: z.string().regex(/^F\d{2,}$/, 'Feature code must be F followed by 2+ digits'),
  name: z.string().min(1, 'Feature name is required'),
  description: z.string().optional().nullable(),
  category: z.enum(['DURABILITY', 'COATING', 'PROTECTION', 'LIFESTYLE', 'VISION']),
  displayOrder: z.number().int().min(1).optional().nullable(),
  iconUrl: z.string().optional().nullable(),
});

type FeatureRow = z.infer<typeof featureRowSchema>;

/**
 * POST /api/admin/features/upload-excel
 * Upload Excel file and create features in bulk
 */
export async function POST(request: NextRequest) {
  try {
    const user = await authenticate(request);
    authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN)(user);

    const formData = await request.formData();
    const excelFile = formData.get('file') as File;

    if (!excelFile) {
      return Response.json(
        {
          success: false,
          error: {
            code: 'MISSING_FILE',
            message: 'Excel file is required',
          },
        },
        { status: 400 }
      );
    }

    // Validate file type
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'text/csv', // .csv
    ];
    
    if (!validTypes.includes(excelFile.type) && !excelFile.name.match(/\.(xlsx|xls|csv)$/i)) {
      return Response.json(
        {
          success: false,
          error: {
            code: 'INVALID_FILE_TYPE',
            message: 'File must be an Excel file (.xlsx, .xls) or CSV (.csv)',
          },
        },
        { status: 400 }
      );
    }

    // Validate file size (max 5MB)
    if (excelFile.size > 5 * 1024 * 1024) {
      return Response.json(
        {
          success: false,
          error: {
            code: 'FILE_TOO_LARGE',
            message: 'File size must be less than 5MB',
          },
        },
        { status: 400 }
      );
    }

    // Read file buffer
    const bytes = await excelFile.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Parse Excel file
    let workbook: XLSX.WorkBook;
    try {
      workbook = XLSX.read(buffer, { type: 'buffer' });
    } catch (error: any) {
      return Response.json(
        {
          success: false,
          error: {
            code: 'PARSE_ERROR',
            message: 'Failed to parse Excel file. Please ensure it is a valid Excel file.',
            details: error?.message,
          },
        },
        { status: 400 }
      );
    }

    // Get first sheet
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      return Response.json(
        {
          success: false,
          error: {
            code: 'EMPTY_FILE',
            message: 'Excel file is empty or has no sheets',
          },
        },
        { status: 400 }
      );
    }

    const worksheet = workbook.Sheets[sheetName];
    
    // Convert to JSON (header row expected)
    const rawData = XLSX.utils.sheet_to_json(worksheet, {
      header: 1, // Use first row as headers
      defval: null, // Default value for empty cells
    }) as any[];

    if (rawData.length < 2) {
      return Response.json(
        {
          success: false,
          error: {
            code: 'INSUFFICIENT_DATA',
            message: 'Excel file must have at least a header row and one data row',
          },
        },
        { status: 400 }
      );
    }

    // Extract headers (first row)
    const headers = rawData[0] as string[];
    
    // Normalize headers (trim, lowercase, remove spaces)
    const normalizedHeaders = headers.map(h => 
      String(h || '').trim().toLowerCase().replace(/\s+/g, '')
    );

    // Find column indices
    const codeIndex = normalizedHeaders.findIndex(h => 
      h === 'code' || h === 'featurecode' || h === 'fcode'
    );
    const nameIndex = normalizedHeaders.findIndex(h => 
      h === 'name' || h === 'featurename' || h === 'fname'
    );
    const descriptionIndex = normalizedHeaders.findIndex(h => 
      h === 'description' || h === 'desc'
    );
    const categoryIndex = normalizedHeaders.findIndex(h => 
      h === 'category' || h === 'cat'
    );
    const displayOrderIndex = normalizedHeaders.findIndex(h => 
      h === 'displayorder' || h === 'order' || h === 'display_order'
    );
    const iconUrlIndex = normalizedHeaders.findIndex(h => 
      h === 'iconurl' || h === 'icon' || h === 'icon_url'
    );

    // Validate required columns
    if (codeIndex === -1 || nameIndex === -1 || categoryIndex === -1) {
      return Response.json(
        {
          success: false,
          error: {
            code: 'MISSING_COLUMNS',
            message: 'Excel file must have columns: code, name, category',
            foundColumns: headers.filter(h => h),
          },
        },
        { status: 400 }
      );
    }

    // Parse data rows (skip header row)
    const features: FeatureRow[] = [];
    const errors: Array<{ row: number; error: string }> = [];

    for (let i = 1; i < rawData.length; i++) {
      const row = rawData[i] as any[];
      
      // Skip empty rows
      if (!row || row.every(cell => !cell || String(cell).trim() === '')) {
        continue;
      }

      try {
        const featureData: any = {
          code: String(row[codeIndex] || '').trim().toUpperCase(),
          name: String(row[nameIndex] || '').trim(),
          description: row[descriptionIndex] ? String(row[descriptionIndex]).trim() : null,
          category: String(row[categoryIndex] || '').trim().toUpperCase(),
          displayOrder: row[displayOrderIndex] 
            ? (typeof row[displayOrderIndex] === 'number' 
                ? row[displayOrderIndex] 
                : parseInt(String(row[displayOrderIndex])) || null)
            : null,
          iconUrl: row[iconUrlIndex] ? String(row[iconUrlIndex]).trim() : null,
        };

        // Validate row data
        const validated = featureRowSchema.parse(featureData);
        features.push(validated);
      } catch (error: any) {
        if (error instanceof z.ZodError) {
          errors.push({
            row: i + 1, // 1-indexed for user
            error: error.issues.map(e => `${e.path.join('.')}: ${e.message}`).join(', '),
          });
        } else {
          errors.push({
            row: i + 1,
            error: error?.message || 'Unknown error',
          });
        }
      }
    }

    if (features.length === 0) {
      return Response.json(
        {
          success: false,
          error: {
            code: 'NO_VALID_DATA',
            message: 'No valid feature data found in Excel file',
            errors,
          },
        },
        { status: 400 }
      );
    }

    // Get max displayOrder if needed
    const maxOrderResult = await prisma.feature.findFirst({
      orderBy: { displayOrder: 'desc' },
      select: { displayOrder: true },
    });
    let currentMaxOrder = maxOrderResult?.displayOrder || 0;

    // Process features (create or update)
    const results = {
      created: 0,
      updated: 0,
      skipped: 0,
      errors: [] as Array<{ code: string; error: string }>,
    };

    for (const feature of features) {
      try {
        // Check if feature exists
        const existing = await prisma.feature.findUnique({
          where: { code: feature.code },
        });

        // Set displayOrder if not provided
        let displayOrder = feature.displayOrder;
        if (!displayOrder) {
          currentMaxOrder += 1;
          displayOrder = currentMaxOrder;
        }

        if (existing) {
          // Update existing feature
          await prisma.feature.update({
            where: { id: existing.id },
            data: {
              name: feature.name,
              description: feature.description,
              category: feature.category,
              displayOrder,
              iconUrl: feature.iconUrl,
              isActive: true,
              updatedAt: new Date(),
            },
          });
          results.updated += 1;
        } else {
          // Create new feature
          await prisma.feature.create({
            data: {
              code: feature.code,
              name: feature.name,
              description: feature.description,
              category: feature.category,
              displayOrder,
              iconUrl: feature.iconUrl,
              isActive: true,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          });
          results.created += 1;
        }
      } catch (error: any) {
        results.errors.push({
          code: feature.code,
          error: error?.message || 'Unknown error',
        });
        results.skipped += 1;
      }
    }

    return Response.json({
      success: true,
      data: {
        total: features.length,
        created: results.created,
        updated: results.updated,
        skipped: results.skipped,
        errors: results.errors,
        validationErrors: errors,
      },
    });
  } catch (error: any) {
    console.error('[POST /api/admin/features/upload-excel] Error:', {
      message: error?.message,
      stack: error?.stack,
    });
    return handleApiError(error);
  }
}

