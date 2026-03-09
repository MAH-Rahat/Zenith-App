import * as SecureStore from 'expo-secure-store';

const ACCESS_TOKEN_KEY = 'zenith_access_token';
const REFRESH_TOKEN_KEY = 'zenith_refresh_token';

/**
 * Store access token in secure storage using expo-secure-store
 */
export async function storeAccessToken(token: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, token);
  } catch (error) {
    console.error('Failed to store access token:', error);
    throw new Error('Failed to store access token');
  }
}

/**
 * Store refresh token in secure storage using expo-secure-store
 */
export async function storeRefreshToken(token: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token);
  } catch (error) {
    console.error('Failed to store refresh token:', error);
    throw new Error('Failed to store refresh token');
  }
}

/**
 * Store both access and refresh tokens
 */
export async function storeTokens(accessToken: string, refreshToken: string): Promise<void> {
  await Promise.all([
    storeAccessToken(accessToken),
    storeRefreshToken(refreshToken),
  ]);
}

/**
 * Get access token from secure storage
 */
export async function getAccessToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
  } catch (error) {
    console.error('Failed to get access token:', error);
    return null;
  }
}

/**
 * Get refresh token from secure storage
 */
export async function getRefreshToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
  } catch (error) {
    console.error('Failed to get refresh token:', error);
    return null;
  }
}

/**
 * Clear access token from secure storage
 */
export async function clearAccessToken(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
  } catch (error) {
    console.error('Failed to clear access token:', error);
  }
}

/**
 * Clear refresh token from secure storage
 */
export async function clearRefreshToken(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
  } catch (error) {
    console.error('Failed to clear refresh token:', error);
  }
}

/**
 * Clear both tokens on logout
 */
export async function clearTokens(): Promise<void> {
  await Promise.all([
    clearAccessToken(),
    clearRefreshToken(),
  ]);
}
