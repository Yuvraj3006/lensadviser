import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyPassword, generateToken } from '@/lib/auth';
import { handleApiError, AuthError } from '@/lib/errors';
import { LoginSchema } from '@/lib/auth-validation';
import { z } from 'zod';

export async function POST(request: NextRequest) {
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
      include: {
        store: {
          select: {
            id: true,
            name: true,
          },
        },
        organization: {
          select: {
            id: true,
          },
        },
      },
    });
    
    // Debug: Check if any users exist at all
    if (!user) {
      const totalUsers = await prisma.user.count();
      const activeUsers = await prisma.user.count({ where: { isActive: true } });
      console.log(`User lookup failed. Total users: ${totalUsers}, Active users: ${activeUsers}`);
    }

    if (!user) {
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

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Generate token
    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId,
      storeId: user.storeId,
    });

    // Return user data and token
    return Response.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          storeId: user.storeId,
          storeName: user.store?.name || null,
        },
      },
    });
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

