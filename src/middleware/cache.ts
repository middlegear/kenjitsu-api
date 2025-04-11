import { redis } from '../config/redis.js'; // Redis is optional
import 'dotenv';

const DEFAULT_CACHE_EXPIRY_HOURS = 1;

/**
 * Sets a value in the cache (Redis and/or in-memory).
 */
async function redisSetCache<T>(key: string, value: T, ttlInHours: number = DEFAULT_CACHE_EXPIRY_HOURS): Promise<void> {
  const stringValue = JSON.stringify(value);

  if (redis) {
    await redis.set(key, stringValue, 'EX', ttlInHours * 3600);
    console.log(`Data stored in Redis (Key: ${key})`);
  }
}

/**
 * Retrieves a value from the cache (Redis and/or in-memory).
 */
async function redisGetCache<T>(key: string): Promise<T | null> {
  if (redis) {
    const data = await redis.get(key);
    if (data) {
      try {
        const value = JSON.parse(data) as T;
        console.log(`Cache hit (Redis) - Key: ${key}`);

        return value;
      } catch (error) {
        console.error('Error parsing JSON from Redis:', error);
        return null;
      }
    }
  }
  if (redis) {
    console.log(`Cache miss - Key: ${key}`);
  }
  return null;
}

/**
 * Purges a specific key or the entire cache (Redis and/or in-memory).
 */
async function purgeCache(key?: string): Promise<void> {
  if (redis) {
    if (key) {
      await redis.del(key);
      console.log(`Redis cache cleared for key: ${key}`);
    } else {
      await redis.flushall();
      console.log('Entire Redis cache has been purged');
    }
  }
}

export { redisGetCache, redisSetCache, purgeCache };
