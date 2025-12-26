import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyPassword, generateToken } from '@/lib/auth';
import { handleApiError, AuthError } from '@/lib/errors';
import { LoginSchema } from '@/lib/auth-validation';
import { z } from 'zod';

export async function POST(request: NextRequest) {
  // SECURITY: Rate limiting is handled by Next.js middleware (middleware.ts)
  // The middleware applies RATE_LIMITS.LOGIN (5 attempts per 15 minutes) to /api/auth/login
  
  try {
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      return Response.json(
        {
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'Invalid JSON in request body',
          },
        },
        { status: 400 }
      );
    }
    const { email, password } = LoginSchema.parse(body);
    const normalizedEmail = email.toLowerCase().trim();
    
    console.log(`Login attempt for email: ${normalizedEmail}`);

    // Find user
    const user = await prisma.user.findFirst({
      where: {
        email: normalizedEmail,
        isActive: true,
      },
    });
    
    // Debug: Check if any users exist at all
    if (!user) {
      const totalUsers = await prisma.user.count();
      const activeUsers = await prisma.user.count({ where: { isActive: true } });
      console.log(`User lookup failed. Total users: ${totalUsers}, Active users: ${activeUsers}`);
      console.error(`Login failed: User not found or inactive - ${email}`);
      return Response.json(
        {
          success: false,
          error: {
            code: 'AUTH_UNAUTHORIZED',
            message: 'Invalid email or password',
          },
        },
        { status: 401 }
      );
    }

    // Verify password
    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      console.error(`Login failed: Invalid password for user - ${email}`);
      return Response.json(
        {
          success: false,
          error: {
            code: 'AUTH_UNAUTHORIZED',
            message: 'Invalid email or password',
          },
        },
        { status: 401 }
      );
    }

    // Fetch store name separately if needed
    let storeName: string | null = null;
    if (user.storeId) {
      try {
        const store = await prisma.store.findUnique({
          where: { id: user.storeId },
          select: { name: true },
        });
        storeName = store?.name || null;
      } catch (storeError) {
        console.warn(`Failed to fetch store for user ${user.id}:`, storeError);
        // Continue without store name
      }
    }

    // Update last login
    try {
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });
    } catch (updateError) {
      console.warn(`Failed to update lastLoginAt for user ${user.id}:`, updateError);
      // Continue even if update fails
    }

    // Generate token
    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role as any, // user.role is String in DB, but we use UserRole enum in code
      organizationId: user.organizationId,
      storeId: user.storeId,
    });

    // Return user data and token with cookie
    const response = Response.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          organizationId: user.organizationId, // Include organizationId
          storeId: user.storeId,
          storeName: storeName,
        },
      },
    });

    // Set token in cookie for direct browser access support
    // Cookie expires in 7 days (same as JWT expiry)
    response.headers.set(
      'Set-Cookie',
      `lenstrack_token=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${7 * 24 * 60 * 60}${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`
    );

    return response;
  } catch (error) {
    console.error('Login API Error:', error);
    if (error instanceof Error) {
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    if (error instanceof z.ZodError) {
      return Response.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input',
            details: error.issues,
          },
        },
        { status: 400 }
      );
    }
    return handleApiError(error);
  }
}

