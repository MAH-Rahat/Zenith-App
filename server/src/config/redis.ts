import { createClient, RedisClientType } from 'redis';
import { config } from './index';

interface RedisConnectionOptions {
  maxRetries: number;
  retryDelay: number;
}

const defaultOptions: RedisConnectionOptions = {
  maxRetries: 5,
  retryDelay: 5000, // 5 seconds
};

let redisClient: RedisClientType | null = null;
let isConnected = false;
let retryCount = 0;

export async function connectRedis(options: RedisConnectionOptions = defaultOptions): Promise<RedisClientType> {
  if (isConnected && redisClient) {
    console.log('🔴 Redis: Already connected');
    return redisClient;
  }

  try {
    redisClient = createClient({
      url: config.redis.url,
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > options.maxRetries) {
            console.error('💥 Redis: Maximum reconnection attempts reached');
            return new Error('Redis reconnection failed');
          }
          const delay = Math.min(retries * 1000, options.retryDelay);
          console.log(`🔄 Redis: Reconnecting in ${delay}ms (attempt ${retries}/${options.maxRetries})`);
          return delay;
        },
      },
    });

    // Error handling
    redisClient.on('error', (error) => {
      console.error('❌ Redis connection error:', error);
      isConnected = false;
    });

    redisClient.on('connect', () => {
      console.log('🔄 Redis: Connecting...');
    });

    redisClient.on('ready', () => {
      console.log('✅ Redis connected successfully');
      isConnected = true;
      retryCount = 0;
    });

    redisClient.on('reconnecting', () => {
      console.log('🔄 Redis: Reconnecting...');
      isConnected = false;
    });

    redisClient.on('end', () => {
      console.warn('⚠️  Redis connection closed');
      isConnected = false;
    });

    // Connect to Redis
    await redisClient.connect();

    return redisClient;

  } catch (error) {
    retryCount++;
    console.error(`❌ Redis connection failed (attempt ${retryCount}/${options.maxRetries}):`, error);

    if (retryCount < options.maxRetries) {
      console.log(`🔄 Retrying in ${options.retryDelay / 1000} seconds...`);
      await new Promise(resolve => setTimeout(resolve, options.retryDelay));
      return connectRedis(options);
    } else {
      console.error('💥 Redis connection failed after maximum retries');
      throw new Error('Failed to connect to Redis after multiple attempts');
    }
  }
}

export async function disconnectRedis(): Promise<void> {
  if (!redisClient || !isConnected) {
    return;
  }

  try {
    await redisClient.quit();
    isConnected = false;
    redisClient = null;
    console.log('👋 Redis disconnected gracefully');
  } catch (error) {
    console.error('❌ Error disconnecting from Redis:', error);
    throw error;
  }
}

export function getRedisClient(): RedisClientType {
  if (!redisClient || !isConnected) {
    throw new Error('Redis client is not connected. Call connectRedis() first.');
  }
  return redisClient;
}

export function isRedisConnected(): boolean {
  return isConnected && redisClient !== null && redisClient.isOpen;
}
