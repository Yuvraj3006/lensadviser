/**
 * Secure API Client
 * Handles authenticated API requests using httpOnly cookies
 */

import { getTokenForAPI } from './auth-helper';

/**
 * Make an authenticated API request
 * Automatically includes token from httpOnly cookie
 */
export async function authenticatedFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = await getTokenForAPI();
  
  const headers = new Headers(options.headers);
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  
  return fetch(url, {
    ...options,
    headers,
    credentials: 'include', // Include httpOnly cookies
  });
}

/**
 * Make a GET request with authentication
 */
export async function apiGet(url: string, options: RequestInit = {}): Promise<Response> {
  return authenticatedFetch(url, {
    ...options,
    method: 'GET',
  });
}

/**
 * Make a POST request with authentication
 */
export async function apiPost(url: string, data: any, options: RequestInit = {}): Promise<Response> {
  return authenticatedFetch(url, {
    ...options,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    body: JSON.stringify(data),
  });
}

/**
 * Make a PUT request with authentication
 */
export async function apiPut(url: string, data: any, options: RequestInit = {}): Promise<Response> {
  return authenticatedFetch(url, {
    ...options,
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    body: JSON.stringify(data),
  });
}

/**
 * Make a DELETE request with authentication
 */
export async function apiDelete(url: string, options: RequestInit = {}): Promise<Response> {
  return authenticatedFetch(url, {
    ...options,
    method: 'DELETE',
  });
}

