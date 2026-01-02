import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticate, authorize } from '@/middleware/auth.middleware';
import { handleApiError } from '@/lib/errors';
import { UserRole } from '@/lib/constants';
import * as XLSX from 'xlsx';
import { z } from 'zod';

// Expected Excel columns schema
const benefitRowSchema = z.object({
  code: z.string().regex(/^B\d{2,}$/, 'Benefit code must be B followed by 2+ digits'),
  name: z.string().min(1, 'Benefit name is required'),
  description: z.string().optional().nullable(),
  pointWeight: z.number().min(0).max(10).optional().nullable(),
  maxScore: z.number().min(0).max(10).optional().nullable(),
});

type BenefitRow = z.infer<typeof benefitRowSchema>;

/**
 * POST /api/admin/benefits/upload-excel
 * Upload Excel file and create benefits in bulk
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
      h === 'code' || h === 'benefitcode' || h === 'bcode'
    );
    const nameIndex = normalizedHeaders.findIndex(h => 
      h === 'name' || h === 'benefitname' || h === 'bname'
    );
    const descriptionIndex = normalizedHeaders.findIndex(h => 
      h === 'description' || h === 'desc'
    );
    const pointWeightIndex = normalizedHeaders.findIndex(h => 
      h === 'pointweight' || h === 'weight' || h === 'point_weight'
    );
    const maxScoreIndex = normalizedHeaders.findIndex(h => 
      h === 'maxscore' || h === 'max' || h === 'max_score'
    );

    // Validate required columns
    if (codeIndex === -1 || nameIndex === -1) {
      return Response.json(
        {
          success: false,
          error: {
            code: 'MISSING_COLUMNS',
            message: 'Excel file must have columns: code, name',
            foundColumns: headers.filter(h => h),
          },
        },
        { status: 400 }
      );
    }

    // Parse data rows (skip header row)
    const benefits: BenefitRow[] = [];
    const errors: Array<{ row: number; error: string }> = [];

    for (let i = 1; i < rawData.length; i++) {
      const row = rawData[i] as any[];
      
      // Skip empty rows
      if (!row || row.every(cell => !cell || String(cell).trim() === '')) {
        continue;
      }

      try {
        const benefitData: any = {
          code: String(row[codeIndex] || '').trim().toUpperCase(),
          name: String(row[nameIndex] || '').trim(),
          description: row[descriptionIndex] ? String(row[descriptionIndex]).trim() : null,
          pointWeight: row[pointWeightIndex] !== undefined && row[pointWeightIndex] !== null
            ? (typeof row[pointWeightIndex] === 'number' 
                ? row[pointWeightIndex] 
                : parseFloat(String(row[pointWeightIndex])) || null)
            : null,
          maxScore: row[maxScoreIndex] !== undefined && row[maxScoreIndex] !== null
            ? (typeof row[maxScoreIndex] === 'number' 
                ? row[maxScoreIndex] 
                : parseFloat(String(row[maxScoreIndex])) || null)
            : null,
        };

        // Validate row data
        const validated = benefitRowSchema.parse(benefitData);
        benefits.push(validated);
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

    if (benefits.length === 0) {
      return Response.json(
        {
          success: false,
          error: {
            code: 'NO_VALID_DATA',
            message: 'No valid benefit data found in Excel file',
            errors,
          },
        },
        { status: 400 }
      );
    }

    // Process benefits (create or update)
    const results = {
      created: 0,
      updated: 0,
      skipped: 0,
      errors: [] as Array<{ code: string; error: string }>,
    };

    for (const benefit of benefits) {
      try {
        // Check if benefit exists for this organization
        const existing = await prisma.benefit.findFirst({
          where: {
            organizationId: user.organizationId,
            code: benefit.code,
          },
        });

        if (existing) {
          // Update existing benefit
          await prisma.benefit.update({
            where: { id: existing.id },
            data: {
              name: benefit.name,
              description: benefit.description,
              pointWeight: benefit.pointWeight ?? 1.0,
              maxScore: benefit.maxScore ?? 3.0,
              isActive: true,
              updatedAt: new Date(),
            },
          });
          results.updated += 1;
        } else {
          // Create new benefit
          await prisma.benefit.create({
            data: {
              organizationId: user.organizationId,
              code: benefit.code,
              name: benefit.name,
              description: benefit.description,
              pointWeight: benefit.pointWeight ?? 1.0,
              maxScore: benefit.maxScore ?? 3.0,
              isActive: true,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          });
          results.created += 1;
        }
      } catch (error: any) {
        results.errors.push({
          code: benefit.code,
          error: error?.message || 'Unknown error',
        });
        results.skipped += 1;
      }
    }

    return Response.json({
      success: true,
      data: {
        total: benefits.length,
        created: results.created,
        updated: results.updated,
        skipped: results.skipped,
        errors: results.errors,
        validationErrors: errors,
      },
    });
  } catch (error: any) {
    console.error('[POST /api/admin/benefits/upload-excel] Error:', {
      message: error?.message,
      stack: error?.stack,
    });
    return handleApiError(error);
  }
}


