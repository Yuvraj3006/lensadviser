export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 500,
    public details?: unknown
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class AuthError extends AppError {
  constructor(message: string = 'Authentication failed') {
    super('AUTH_UNAUTHORIZED', message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Insufficient permissions') {
    super('PERMISSION_DENIED', message, 403);
  }
}

export class ValidationError extends AppError {
  constructor(message: string = 'Validation failed', details?: unknown) {
    super('VALIDATION_ERROR', message, 400, details);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super('RESOURCE_NOT_FOUND', `${resource} not found`, 404);
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Resource already exists') {
    super('RESOURCE_CONFLICT', message, 409);
  }
}

export class BusinessRuleError extends AppError {
  constructor(message: string) {
    super('BUSINESS_RULE_VIOLATION', message, 422);
  }
}

export function handleApiError(error: unknown) {
  console.error('API Error:', error);
  console.error('Error type:', error?.constructor?.name);
  console.error('Error as string:', String(error));
  
  if (error instanceof Error) {
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('Error name:', error.name);
  }
  
  // Log full error object if it's an object
  if (error && typeof error === 'object') {
    console.error('Error object keys:', Object.keys(error));
    try {
      console.error('Error object JSON:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
    } catch (e) {
      console.error('Could not stringify error object');
    }
  }

  if (error instanceof AppError) {
    return Response.json(
      {
        success: false,
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
        },
      },
      { status: error.statusCode }
    );
  }

  // Prisma errors
  if (error && typeof error === 'object' && 'code' in error) {
    const prismaError = error as { code: string; meta?: { target?: string[] }; message?: string };
    
    // Validation errors (P2009, P2011, P2012, P2013, P2014, P2015, P2016, P2017, P2018, P2019, P2020, P2021, P2022, P2023, P2024, P2032, P2033, P2034)
    if (prismaError.code === 'P2009' || prismaError.code === 'P2011' || prismaError.code === 'P2012' || 
        prismaError.code === 'P2013' || prismaError.code === 'P2014' || prismaError.code === 'P2015' ||
        prismaError.code === 'P2016' || prismaError.code === 'P2017' || prismaError.code === 'P2018' ||
        prismaError.code === 'P2019' || prismaError.code === 'P2020' || prismaError.code === 'P2021' ||
        prismaError.code === 'P2022' || prismaError.code === 'P2023' || prismaError.code === 'P2024' ||
        prismaError.code === 'P2032' || prismaError.code === 'P2033' || prismaError.code === 'P2034') {
      return Response.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: prismaError.message || 'Validation error occurred',
            details: prismaError.meta,
          },
        },
        { status: 400 }
      );
    }
    
    // Connection errors (P2010 = Raw query failed, usually connection issues)
    if (prismaError.code === 'P2010' || (prismaError.message && (
      prismaError.message.includes('Server selection timeout') ||
      prismaError.message.includes('No available servers') ||
      prismaError.message.includes('I/O error')
    ))) {
      return Response.json(
        {
          success: false,
          error: {
            code: 'DATABASE_CONNECTION_ERROR',
            message: 'Database connection timeout. Please check MongoDB Atlas cluster status and IP whitelist.',
            details: 'The database server is not reachable. This is usually due to: 1) Cluster is paused, 2) IP not whitelisted, 3) Network issues.',
          },
        },
        { status: 503 }
      );
    }

    if (prismaError.code === 'P2002') {
      return Response.json(
        {
          success: false,
          error: {
            code: 'RESOURCE_CONFLICT',
            message: 'A record with this value already exists',
            details: prismaError.meta,
          },
        },
        { status: 409 }
      );
    }

    if (prismaError.code === 'P2025') {
      return Response.json(
        {
          success: false,
          error: {
            code: 'RESOURCE_NOT_FOUND',
            message: 'Record not found',
          },
        },
        { status: 404 }
      );
    }
  }

  // Generic error - include more details in development
  const isDevelopment = process.env.NODE_ENV === 'development';
  return Response.json(
    {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
        ...(isDevelopment && {
          details: error instanceof Error ? {
            message: error.message,
            name: error.name,
            stack: error.stack,
          } : String(error),
        }),
      },
    },
    { status: 500 }
  );
}

