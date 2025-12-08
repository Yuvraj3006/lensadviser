// UserRole enum - defined here since Prisma doesn't export unused enums
// The User model uses String for role field, not UserRole enum
export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  STORE_MANAGER = 'STORE_MANAGER',
  SALES_EXECUTIVE = 'SALES_EXECUTIVE',
}

// OrderStatus enum - defined here since Prisma doesn't export unused enums
export enum OrderStatus {
  DRAFT = 'DRAFT',
  CONFIRMED = 'CONFIRMED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

