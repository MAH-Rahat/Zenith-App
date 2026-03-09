import { getRedisClient } from '../config';

/**
 * Cache TTL (Time To Live) in seconds
 */
export const CACHE_TTL = {
  GEMINI_API: 3600,        // 1 hour
  GITHUB_API: 21600,       // 6 hours
  EXCHANGE_RATE_API: 21600, // 6 hours
  SESSION: 604800,         // 7 days (for session management)
} as const;

/**
 * Cache key prefixes for different data types
 */
export const CACHE_PREFIX = {
  GEMINI: 'gemini:',
  GITHUB: 'github:',
  EXCHANGE_RATE: 'exchange:',
  SESSION: 'session:',
} as const;

export class CacheService {
  /**
   * Set a value in cache with TTL
   */
  static async set(key: string, value: any, ttl: number): Promise<void> {
    try {
      const redis = getRedisClient();
      const serializedValue = JSON.stringify(value);
      await redis.setEx(key, ttl, serializedValue);
    } catch (error) {
      console.error(`Cache set error for key ${key}:`, error);
      // Don't throw - cache failures should not break the application
    }
  }

  /**
   * Get a value from cache
   */
  static async get<T>(key: string): Promise<T | null> {
    try {
      const redis = getRedisClient();
      const value = await redis.get(key);
      
      if (!value) {
        return null;
      }
      
      return JSON.parse(value) as T;
    } catch (error) {
      console.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Delete a value from cache
   */
  static async delete(key: string): Promise<void> {
    try {
      const redis = getRedisClient();
      await redis.del(key);
    } catch (error) {
      console.error(`Cache delete error for key ${key}:`, error);
    }
  }

  /**
   * Delete multiple keys matching a pattern
   */
  static async deletePattern(pattern: string): Promise<void> {
    try {
      const redis = getRedisClient();
      const keys = await redis.keys(pattern);
      
      if (keys.length > 0) {
        await redis.del(keys);
      }
    } catch (error) {
      console.error(`Cache delete pattern error for pattern ${pattern}:`, error);
    }
  }

  /**
   * Check if a key exists in cache
   */
  static async exists(key: string): Promise<boolean> {
    try {
      const redis = getRedisClient();
      const result = await redis.exists(key);
      return result === 1;
    } catch (error) {
      console.error(`Cache exists error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Get remaining TTL for a key
   */
  static async ttl(key: string): Promise<number> {
    try {
      const redis = getRedisClient();
      return await redis.ttl(key);
    } catch (error) {
      console.error(`Cache TTL error for key ${key}:`, error);
      return -1;
    }
  }

  // ===== Gemini API Caching =====

  /**
   * Cache Gemini API response (1 hour TTL)
   */
  static async cacheGeminiResponse(prompt: string, response: any): Promise<void> {
    const key = `${CACHE_PREFIX.GEMINI}${this.hashKey(prompt)}`;
    await this.set(key, response, CACHE_TTL.GEMINI_API);
  }

  /**
   * Get cached Gemini API response
   */
  static async getCachedGeminiResponse<T>(prompt: string): Promise<T | null> {
    const key = `${CACHE_PREFIX.GEMINI}${this.hashKey(prompt)}`;
    return await this.get<T>(key);
  }

  /**
   * Invalidate all Gemini cache
   */
  static async invalidateGeminiCache(): Promise<void> {
    await this.deletePattern(`${CACHE_PREFIX.GEMINI}*`);
  }

  // ===== GitHub API Caching =====

  /**
   * Cache GitHub API response (6 hours TTL)
   */
  static async cacheGitHubResponse(endpoint: string, response: any): Promise<void> {
    const key = `${CACHE_PREFIX.GITHUB}${this.hashKey(endpoint)}`;
    await this.set(key, response, CACHE_TTL.GITHUB_API);
  }

  /**
   * Get cached GitHub API response
   */
  static async getCachedGitHubResponse<T>(endpoint: string): Promise<T | null> {
    const key = `${CACHE_PREFIX.GITHUB}${this.hashKey(endpoint)}`;
    return await this.get<T>(key);
  }

  /**
   * Invalidate GitHub cache for a specific user
   */
  static async invalidateGitHubCache(username?: string): Promise<void> {
    if (username) {
      await this.deletePattern(`${CACHE_PREFIX.GITHUB}*${username}*`);
    } else {
      await this.deletePattern(`${CACHE_PREFIX.GITHUB}*`);
    }
  }

  // ===== Exchange Rate API Caching =====

  /**
   * Cache Exchange Rate API response (6 hours TTL)
   */
  static async cacheExchangeRate(currencyPair: string, rate: any): Promise<void> {
    const key = `${CACHE_PREFIX.EXCHANGE_RATE}${currencyPair}`;
    await this.set(key, rate, CACHE_TTL.EXCHANGE_RATE_API);
  }

  /**
   * Get cached Exchange Rate
   */
  static async getCachedExchangeRate<T>(currencyPair: string): Promise<T | null> {
    const key = `${CACHE_PREFIX.EXCHANGE_RATE}${currencyPair}`;
    return await this.get<T>(key);
  }

  /**
   * Invalidate all exchange rate cache
   */
  static async invalidateExchangeRateCache(): Promise<void> {
    await this.deletePattern(`${CACHE_PREFIX.EXCHANGE_RATE}*`);
  }

  // ===== Session Management =====

  /**
   * Store session data (7 days TTL)
   */
  static async setSession(sessionId: string, data: any): Promise<void> {
    const key = `${CACHE_PREFIX.SESSION}${sessionId}`;
    await this.set(key, data, CACHE_TTL.SESSION);
  }

  /**
   * Get session data
   */
  static async getSession<T>(sessionId: string): Promise<T | null> {
    const key = `${CACHE_PREFIX.SESSION}${sessionId}`;
    return await this.get<T>(key);
  }

  /**
   * Delete session
   */
  static async deleteSession(sessionId: string): Promise<void> {
    const key = `${CACHE_PREFIX.SESSION}${sessionId}`;
    await this.delete(key);
  }

  /**
   * Extend session TTL
   */
  static async extendSession(sessionId: string): Promise<void> {
    try {
      const redis = getRedisClient();
      const key = `${CACHE_PREFIX.SESSION}${sessionId}`;
      await redis.expire(key, CACHE_TTL.SESSION);
    } catch (error) {
      console.error(`Session extend error for ${sessionId}:`, error);
    }
  }

  // ===== Utility Methods =====

  /**
   * Create a hash from a string for cache key
   */
  private static hashKey(input: string): string {
    // Simple hash function for cache keys
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Clear all cache (use with caution)
   */
  static async clearAll(): Promise<void> {
    try {
      const redis = getRedisClient();
      await redis.flushDb();
      console.log('✅ All cache cleared');
    } catch (error) {
      console.error('Cache clear all error:', error);
    }
  }
}
