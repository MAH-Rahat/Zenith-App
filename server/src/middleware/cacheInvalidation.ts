import { Request, Response, NextFunction } from 'express';
import { CacheService } from '../services/cacheService';

// Extend Express Request type to include user property
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    githubUsername?: string;
  };
}

/**
 * Middleware to invalidate cache on data updates
 * This should be applied to routes that modify data
 */
export function invalidateCacheOnUpdate(cacheType: 'gemini' | 'github' | 'exchange' | 'all') {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Store the original json method
    const originalJson = res.json.bind(res);

    // Override the json method to invalidate cache after successful response
    res.json = function (body: any) {
      // Only invalidate cache if the response was successful (2xx status)
      if (res.statusCode >= 200 && res.statusCode < 300) {
        // Invalidate cache asynchronously (don't wait for it)
        invalidateCache(cacheType, req).catch(error => {
          console.error('Cache invalidation error:', error);
        });
      }

      // Call the original json method
      return originalJson(body);
    };

    next();
  };
}

/**
 * Helper function to invalidate specific cache types
 */
async function invalidateCache(cacheType: string, req: Request): Promise<void> {
  switch (cacheType) {
    case 'gemini':
      await CacheService.invalidateGeminiCache();
      console.log('🔄 Gemini cache invalidated');
      break;

    case 'github':
      // Extract username from request if available
      const username = req.body?.username || req.params?.username;
      await CacheService.invalidateGitHubCache(username);
      console.log(`🔄 GitHub cache invalidated${username ? ` for user: ${username}` : ''}`);
      break;

    case 'exchange':
      await CacheService.invalidateExchangeRateCache();
      console.log('🔄 Exchange rate cache invalidated');
      break;

    case 'all':
      await CacheService.invalidateGeminiCache();
      await CacheService.invalidateGitHubCache();
      await CacheService.invalidateExchangeRateCache();
      console.log('🔄 All API caches invalidated');
      break;

    default:
      console.warn(`Unknown cache type: ${cacheType}`);
  }
}

/**
 * Middleware to invalidate user-specific cache on profile updates
 */
export function invalidateUserCache() {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const originalJson = res.json.bind(res);

    res.json = function (body: any) {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const userId = req.user?.id || req.params?.userId;
        
        if (userId) {
          // Invalidate user-specific caches
          Promise.all([
            CacheService.deletePattern(`*:user:${userId}:*`),
            CacheService.invalidateGitHubCache(req.user?.githubUsername),
          ]).catch(error => {
            console.error('User cache invalidation error:', error);
          });
        }
      }

      return originalJson(body);
    };

    next();
  };
}
