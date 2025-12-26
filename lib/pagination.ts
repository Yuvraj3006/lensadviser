/**
 * Pagination Utilities
 * Provides type-safe pagination for API endpoints
 */

import { z } from 'zod';

/**
 * Pagination query parameters schema
 */
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
});

export type PaginationParams = z.infer<typeof paginationSchema>;

/**
 * Pagination result type
 */
export interface PaginationResult<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}

/**
 * Parse pagination parameters from URL search params
 */
export function parsePaginationParams(searchParams: URLSearchParams): PaginationParams {
  return paginationSchema.parse({
    page: searchParams.get('page') || '1',
    pageSize: searchParams.get('pageSize') || '50',
  });
}

/**
 * Calculate pagination skip value
 */
export function getPaginationSkip(page: number, pageSize: number): number {
  return (page - 1) * pageSize;
}

/**
 * Calculate total pages
 */
export function getTotalPages(total: number, pageSize: number): number {
  return Math.ceil(total / pageSize);
}

/**
 * Create pagination response
 */
export function createPaginationResponse<T>(
  data: T[],
  total: number,
  page: number,
  pageSize: number
): PaginationResult<T> {
  const totalPages = getTotalPages(total, pageSize);
  
  return {
    data,
    pagination: {
      page,
      pageSize,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrevious: page > 1,
    },
  };
}

