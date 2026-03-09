import {
  getAccessToken,
  getRefreshToken,
  storeTokens,
  clearTokens,
} from './tokenStorage';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
}

let isRefreshing = false;
let refreshSubscribers: Array<(token: string) => void> = [];

/**
 * Subscribe to token refresh completion
 */
function subscribeTokenRefresh(callback: (token: string) => void): void {
  refreshSubscribers.push(callback);
}

/**
 * Notify all subscribers when token refresh completes
 */
function onTokenRefreshed(token: string): void {
  refreshSubscribers.forEach((callback) => callback(token));
  refreshSubscribers = [];
}

/**
 * Refresh access token using refresh token
 */
async function refreshAccessToken(): Promise<string | null> {
  try {
    const refreshToken = await getRefreshToken();
    
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      throw new Error('Token refresh failed');
    }

    const result: ApiResponse<RefreshResponse> = await response.json();
    
    if (!result.success || !result.data) {
      throw new Error('Invalid refresh response');
    }

    // Store new tokens
    await storeTokens(result.data.accessToken, result.data.refreshToken);
    
    return result.data.accessToken;
  } catch (error) {
    console.error('Token refresh error:', error);
    // Clear tokens on refresh failure
    await clearTokens();
    return null;
  }
}

/**
 * Make authenticated API request with automatic token refresh on 401
 */
export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  // Get access token
  let accessToken = await getAccessToken();
  
  // Add authorization header if token exists
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }
  
  // Make initial request
  let response = await fetch(url, {
    ...options,
    headers,
  });
  
  // Handle 401 - token expired
  if (response.status === 401 && accessToken) {
    if (!isRefreshing) {
      isRefreshing = true;
      
      // Attempt to refresh token
      const newToken = await refreshAccessToken();
      isRefreshing = false;
      
      if (newToken) {
        // Notify all waiting requests
        onTokenRefreshed(newToken);
        
        // Retry original request with new token
        headers['Authorization'] = `Bearer ${newToken}`;
        response = await fetch(url, {
          ...options,
          headers,
        });
      } else {
        // Refresh failed, return 401 response
        return {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Session expired. Please login again.',
          },
        };
      }
    } else {
      // Wait for ongoing refresh to complete
      const newToken = await new Promise<string>((resolve) => {
        subscribeTokenRefresh(resolve);
      });
      
      // Retry with new token
      headers['Authorization'] = `Bearer ${newToken}`;
      response = await fetch(url, {
        ...options,
        headers,
      });
    }
  }
  
  // Parse response
  const result: ApiResponse<T> = await response.json();
  return result;
}

/**
 * Register new user
 */
export async function register(email: string, password: string): Promise<ApiResponse> {
  const response = await apiRequest('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  
  // Store tokens on successful registration
  if (response.success && response.data) {
    await storeTokens(response.data.accessToken, response.data.refreshToken);
  }
  
  return response;
}

/**
 * Login user
 */
export async function login(email: string, password: string): Promise<ApiResponse> {
  const response = await apiRequest('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  
  // Store tokens on successful login
  if (response.success && response.data) {
    await storeTokens(response.data.accessToken, response.data.refreshToken);
  }
  
  return response;
}

/**
 * Logout user
 */
export async function logout(): Promise<void> {
  try {
    const refreshToken = await getRefreshToken();
    
    if (refreshToken) {
      // Call logout endpoint to revoke refresh token
      await apiRequest('/auth/logout', {
        method: 'POST',
        body: JSON.stringify({ refreshToken }),
      });
    }
  } catch (error) {
    console.error('Logout error:', error);
  } finally {
    // Always clear tokens locally
    await clearTokens();
  }
}
