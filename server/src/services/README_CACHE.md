# Redis Caching Layer

This document describes the Redis caching implementation for the Zenith Backend API.

## Overview

The Redis caching layer provides fast response times for external API calls and session management. It implements automatic cache invalidation on data updates.

## Cache Configuration

### TTL (Time To Live) Settings

- **Gemini API**: 1 hour (3600 seconds)
- **GitHub API**: 6 hours (21600 seconds)
- **Exchange Rate API**: 6 hours (21600 seconds)
- **Sessions**: 7 days (604800 seconds)

### Cache Key Prefixes

- `gemini:` - Gemini API responses
- `github:` - GitHub API responses
- `exchange:` - Exchange rate data
- `session:` - User session data

## Usage Examples

### 1. Caching Gemini API Responses

```typescript
import { GeminiApiService } from './services/externalApiService';

// Automatically checks cache first, then calls API if needed
const response = await GeminiApiService.generateText({
  prompt: 'Your prompt here',
  maxTokens: 1000,
});
```

### 2. Caching GitHub API Responses

```typescript
import { GitHubApiService } from './services/externalApiService';

// Get user profile with caching
const profile = await GitHubApiService.getUserProfile('username');

// Get user repos with caching
const repos = await GitHubApiService.getUserRepos('username');
```

### 3. Caching Exchange Rates

```typescript
import { ExchangeRateApiService } from './services/externalApiService';

// Get BDT to USD exchange rate
const rate = await ExchangeRateApiService.getBDTRate('USD');
```

### 4. Session Management

```typescript
import { SessionService } from './services/externalApiService';

// Create session
await SessionService.createSession('session-id', {
  userId: 'user-123',
  email: 'user@example.com',
  lastActivity: new Date().toISOString(),
});

// Get session
const session = await SessionService.getSession('session-id');

// Delete session (logout)
await SessionService.deleteSession('session-id');
```

## Cache Invalidation

### Automatic Invalidation Middleware

Use the `invalidateCacheOnUpdate` middleware on routes that modify data:

```typescript
import { invalidateCacheOnUpdate } from './middleware';

// Invalidate Gemini cache on update
router.post('/agent/update', invalidateCacheOnUpdate('gemini'), handler);

// Invalidate GitHub cache on update
router.post('/github/sync', invalidateCacheOnUpdate('github'), handler);

// Invalidate all caches
router.post('/admin/refresh', invalidateCacheOnUpdate('all'), handler);
```

### Manual Invalidation

```typescript
import { CacheService } from './services/cacheService';

// Invalidate specific cache types
await CacheService.invalidateGeminiCache();
await CacheService.invalidateGitHubCache('username');
await CacheService.invalidateExchangeRateCache();

// Delete specific key
await CacheService.delete('gemini:abc123');

// Delete pattern
await CacheService.deletePattern('github:*');
```

## Direct Cache Operations

For custom caching needs, use the `CacheService` directly:

```typescript
import { CacheService, CACHE_TTL } from './services/cacheService';

// Set value with custom TTL
await CacheService.set('my-key', { data: 'value' }, 3600);

// Get value
const data = await CacheService.get<MyType>('my-key');

// Check if key exists
const exists = await CacheService.exists('my-key');

// Get remaining TTL
const ttl = await CacheService.ttl('my-key');

// Delete key
await CacheService.delete('my-key');
```

## Error Handling

The caching layer is designed to fail gracefully. If Redis is unavailable:

- Cache operations will log errors but not throw exceptions
- The application will continue to function without caching
- External API calls will be made directly without caching

## Connection Management

Redis connection is managed automatically:

- **Startup**: Redis connects when the server starts
- **Retry Logic**: Automatic reconnection with exponential backoff (max 5 retries)
- **Graceful Shutdown**: Redis disconnects cleanly on server shutdown

## Environment Variables

Configure Redis in `.env`:

```env
REDIS_URL=redis://localhost:6379
```

For production with authentication:

```env
REDIS_URL=redis://username:password@host:port
```

## Monitoring

Redis connection events are logged:

- ✅ Connected successfully
- 🔄 Reconnecting
- ⚠️ Connection closed
- ❌ Connection error

## Best Practices

1. **Always use cache for external APIs** - Reduces API costs and improves response times
2. **Invalidate cache on updates** - Use middleware for automatic invalidation
3. **Use appropriate TTLs** - Balance freshness vs. performance
4. **Monitor cache hit rates** - Track cache effectiveness
5. **Handle cache failures gracefully** - Don't let cache issues break the app

## Testing

The caching layer can be tested with:

```bash
npm test
```

To test with a real Redis instance, ensure Redis is running:

```bash
# Start Redis (if using Docker)
docker run -d -p 6379:6379 redis:latest

# Run tests
npm test
```
