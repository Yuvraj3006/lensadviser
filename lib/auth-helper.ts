/**
 * Authentication Helper
 * Provides secure token access for API calls
 * Uses httpOnly cookies instead of localStorage
 */

/**
 * Get authentication token for API calls
 * First tries to get from cookie via API, falls back to localStorage (for migration)
 */
export async function getTokenForAPI(): Promise<string | null> {
  // SECURITY: Try to get token from httpOnly cookie first
  try {
    const response = await fetch('/api/auth/token', {
      method: 'GET',
      credentials: 'include',
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data.success && data.data?.token) {
        return data.data.token;
      }
    }
  } catch (error) {
    console.error('[AuthHelper] Failed to get token from cookie:', error);
  }

  // Fallback: Check localStorage (for backward compatibility during migration)
  // TODO: Remove this fallback after all components are updated
  if (typeof window !== 'undefined') {
    const fallbackToken = localStorage.getItem('lenstrack_token');
    if (fallbackToken) {
      console.warn('[AuthHelper] Using localStorage token (fallback). Please update to use httpOnly cookies.');
      return fallbackToken;
    }
  }

  return null;
}

/**
 * Get authorization header for API calls
 */
export async function getAuthHeader(): Promise<{ Authorization: string } | {}> {
  const token = await getTokenForAPI();
  if (token) {
    return { Authorization: `Bearer ${token}` };
  }
  return {};
}

