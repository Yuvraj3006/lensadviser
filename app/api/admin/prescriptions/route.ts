import { NextRequest } from 'next/server';
import { handleApiError, AuthError, ValidationError } from '@/lib/errors';
import { verifyToken, extractTokenFromHeader } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const prescriptionSchema = z.object({
  customerName: z.string().optional(),
  customerPhone: z.string().optional(),
  customerEmail: z.string().email().optional().or(z.literal('')),
  odSphere: z.number().optional().nullable(),
  odCylinder: z.number().optional().nullable(),
  odAxis: z.number().int().min(0).max(180).optional().nullable(),
  odAdd: z.number().optional().nullable(),
  osSphere: z.number().optional().nullable(),
  osCylinder: z.number().optional().nullable(),
  osAxis: z.number().int().min(0).max(180).optional().nullable(),
  osAdd: z.number().optional().nullable(),
  pdDistance: z.number().positive().optional().nullable(),
  pdNear: z.number().positive().optional().nullable(),
  pdSingle: z.number().positive().optional().nullable(),
  prescriptionType: z.string().optional(),
  doctorName: z.string().optional(),
  doctorLicense: z.string().optional(),
  prescriptionDate: z.string().optional(),
  expiryDate: z.string().optional(),
  notes: z.string().optional(),
  sessionId: z.string().optional(),
});

// GET /api/admin/prescriptions
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      throw new AuthError('No token provided');
    }

    const payload = verifyToken(token);
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    });

    if (!user || !user.isActive) {
      throw new AuthError('User not found or inactive');
    }

    // Get all prescriptions for the organization
    const prescriptions = await prisma.prescription.findMany({
      where: {
        // Can add organization filter if needed
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return Response.json({
      success: true,
      data: prescriptions,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

// POST /api/admin/prescriptions
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      throw new AuthError('No token provided');
    }

    const payload = verifyToken(token);
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    });

    if (!user || !user.isActive) {
      throw new AuthError('User not found or inactive');
    }

    const body = await request.json();
    const validationResult = prescriptionSchema.safeParse(body);

    if (!validationResult.success) {
      throw new ValidationError('Invalid prescription data', validationResult.error.issues);
    }

    const data = validationResult.data;

    // Store all prescription data in rxData JSON field
    const rxData = {
      customerName: data.customerName || null,
      customerEmail: data.customerEmail || null,
      odSphere: data.odSphere ?? null,
      odCylinder: data.odCylinder ?? null,
      odAxis: data.odAxis ?? null,
      odAdd: data.odAdd ?? null,
      osSphere: data.osSphere ?? null,
      osCylinder: data.osCylinder ?? null,
      osAxis: data.osAxis ?? null,
      osAdd: data.osAdd ?? null,
      pdDistance: data.pdDistance ?? null,
      pdNear: data.pdNear ?? null,
      pdSingle: data.pdSingle ?? null,
      prescriptionType: data.prescriptionType || null,
      doctorName: data.doctorName || null,
      doctorLicense: data.doctorLicense || null,
      prescriptionDate: data.prescriptionDate || null,
      expiryDate: data.expiryDate || null,
      notes: data.notes || null,
    };

    const prescription = await prisma.prescription.create({
      data: {
        sessionId: data.sessionId || null,
        customerPhone: data.customerPhone || null,
        rxData: rxData,
      },
    });

    return Response.json({
      success: true,
      data: prescription,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

