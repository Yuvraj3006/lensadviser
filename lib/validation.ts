import { z } from 'zod';

// Auth Schemas
export const LoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

// Store Schemas
export const CreateStoreSchema = z.object({
  code: z.string().min(1, 'Store code is required'),
  name: z.string().min(1, 'Store name is required'),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  pincode: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  gstNumber: z.string().optional(),
});

export const UpdateStoreSchema = CreateStoreSchema.partial();

// User Schemas - Using z.enum() instead of z.nativeEnum() to avoid module load issues
export const CreateUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  role: z.enum(['SUPER_ADMIN', 'ADMIN', 'STORE_MANAGER', 'SALES_EXECUTIVE']),
  storeId: z.string().optional().nullable(), // MongoDB uses ObjectId, not UUID
  employeeId: z.string().optional(),
  phone: z.string().optional(),
});

export const UpdateUserSchema = CreateUserSchema.partial().omit({ password: true }).extend({
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .optional(),
});

// Product Schemas - Using z.enum() with explicit values to avoid module load issues
export const CreateProductSchema = z.object({
  sku: z.string().min(1, 'SKU is required'),
  name: z.string().min(1, 'Product name is required'),
  description: z.string().optional(),
  category: z.enum(['EYEGLASSES', 'SUNGLASSES', 'CONTACT_LENSES', 'ACCESSORIES']),
  brand: z.string().optional(),
  basePrice: z.number().positive('Price must be positive').optional(),
  imageUrl: z.string().url().optional().or(z.literal('')),
  // Frame-specific fields
  frameType: z.enum(['FULL_RIM', 'HALF_RIM', 'RIMLESS']).optional().nullable(),
  applicableLensIndexes: z.array(z.enum(['INDEX_156', 'INDEX_160', 'INDEX_167', 'INDEX_174'])).optional(),
  applicableOfferRuleIds: z.array(z.string()).optional(),
  // Lens-specific fields (from backend spec)
  itCode: z.string().optional(),
  brandLine: z.enum(['DIGI360_ADVANCED', 'DIGI360_ESSENTIAL', 'DRIVEXPERT', 'DURASHIELD_NATURE', 'BLUEXPERT', 'BLUEXPERT_ADVANCED', 'CITYLIFE', 'VISIONX_ULTRA', 'VISIONX_NEO', 'PUREVIEW', 'HARDX', 'RELAX_PLUS', 'MYOCONTROL_INTRO', 'MYOCONTROL_ADVANCED', 'TINT_NEXT', 'TINT_PREMIUM', 'TINT_ESSENTIAL', 'IGNITE_BLUEBAN', 'IGNITE_NATURE', 'IGNITE_DRIVE', 'IGNITE_DIGITAL', 'IGNITE_GOLD', 'IGNITE_PLATINUM', 'PROGRESSIVE_PLUS', 'STANDARD', 'PREMIUM', 'OTHER']).optional(),
  yopoEligible: z.boolean().optional(),
  subCategory: z.string().optional(),
  visionType: z.enum(['MYOPIA', 'HYPEROPIA', 'ASTIGMATISM', 'PRESBYOPIA', 'MULTIFOCAL', 'OTHER']).optional().nullable(),
  lensIndex: z.enum(['INDEX_156', 'INDEX_160', 'INDEX_167', 'INDEX_174']).optional(),
  tintOption: z.enum(['CLEAR', 'TINT', 'PHOTOCHROMIC']).optional(),
  mrp: z.number().positive('MRP must be positive'),
  offerPrice: z.number().optional(),
  addOnPrice: z.number().optional(),
  sphMin: z.number().optional(),
  sphMax: z.number().optional(),
  cylMax: z.number().optional(),
  addMin: z.number().optional(),
  addMax: z.number().optional(),
  deliveryDays: z.number().int().optional(),
  warranty: z.string().optional(),
  features: z.array(
    z.object({
      featureId: z.string().uuid(),
      strength: z.number().min(0.1).max(2.0),
    })
  ).optional(),
});

export const UpdateProductSchema = CreateProductSchema.partial();

// Feature Schemas
export const CreateFeatureSchema = z.object({
  key: z.string().min(1, 'Feature key is required'),
  name: z.string().min(1, 'Feature name is required'),
  description: z.string().optional(),
  category: z.enum(['EYEGLASSES', 'SUNGLASSES', 'CONTACT_LENSES', 'ACCESSORIES']),
});

export const UpdateFeatureSchema = CreateFeatureSchema.partial();

// Question Schemas
export const CreateQuestionSchema = z.object({
  key: z.string().optional(), // Optional - backend will auto-generate if not provided
  textEn: z.string().min(1, 'English text is required'),
  textHi: z.string().optional(),
  textHiEn: z.string().optional(),
  category: z.enum(['EYEGLASSES', 'SUNGLASSES', 'CONTACT_LENSES', 'ACCESSORIES']),
  order: z.number().int().default(0),
  displayOrder: z.number().int().optional(), // Optional display order
  code: z.string().optional(), // Optional code field
  questionCategory: z.string().optional(), // Optional category grouping
  questionType: z.string().optional(), // Optional type (SINGLE_SELECT, MULTI_SELECT, etc.)
  isRequired: z.boolean().default(true),
  allowMultiple: z.boolean().default(false),
  showIf: z.any().optional(),
  options: z.array(
    z.object({
      key: z.string().optional(), // Optional - backend will auto-generate if not provided
      textEn: z.string(),
      textHi: z.string().optional(),
      textHiEn: z.string().optional(),
      icon: z.string().optional(),
      order: z.number().int().default(0),
    })
  ),
  mappings: z.array(
    z.object({
      optionKey: z.string(),
      featureKey: z.string(),
      weight: z.number().min(-2).max(2),
    })
  ).optional(),
});

export const UpdateQuestionSchema = CreateQuestionSchema.partial();

// Session Schemas
export const CreateSessionSchema = z.object({
  category: z.enum(['EYEGLASSES', 'SUNGLASSES', 'CONTACT_LENSES', 'ACCESSORIES']),
  customerName: z.string().optional(),
  customerPhone: z.string().optional(),
  customerEmail: z.string().email().optional().or(z.literal('')),
});

export const SubmitAnswerSchema = z.object({
  questionId: z.string().uuid(),
  optionIds: z.array(z.string().uuid()).min(1, 'At least one option must be selected'),
});

export const SelectProductSchema = z.object({
  productId: z.string().uuid(),
  notes: z.string().optional(),
});

// Helper function to validate request body
export async function validateRequest<T>(
  request: Request,
  schema: z.ZodSchema<T>
): Promise<T> {
  try {
    const body = await request.json();
    return schema.parse(body);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const details: Record<string, string[]> = {};
      error.issues.forEach((err) => {
        const path = err.path.join('.');
        if (!details[path]) {
          details[path] = [];
        }
        details[path].push(err.message);
      });
      throw new Error(JSON.stringify({ code: 'VALIDATION_ERROR', details }));
    }
    throw error;
  }
}

