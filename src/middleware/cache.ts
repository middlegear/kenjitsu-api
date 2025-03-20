import { redis } from '../config/redis.js'; // Redis is optional
import snappy from 'snappy';
import 'dotenv';

const COMPRESSION_THRESHOLD = 1024; // Compress if data is larger than 1KB
const MEMORY_CACHE_ENABLED = process.env.MEMORY_CACHE_ENABLED === 'true'; // Enable in-memory caching
const DEFAULT_CACHE_EXPIRY_HOURS = 1;

const MEMORY_CACHE_TTL_MS = 30 * 60 * 1000; // Default: 30 minutes
const MEMORY_CACHE_TTL =
  process.env.MEMORY_CACHE_TTL_MINUTES && !isNaN(Number(process.env.MEMORY_CACHE_TTL_MINUTES))
    ? Number(process.env.MEMORY_CACHE_TTL_MINUTES) * 60 * 1000
    : MEMORY_CACHE_TTL_MS;

const memoryCache = new Map<string, { value: any; timestamp: number }>();

if (MEMORY_CACHE_ENABLED) {
  console.log('🚀 Memory Caching Enabled: Doesnt work on serverless environment');
  console.log(`Memory caching TTL is ${(MEMORY_CACHE_TTL / 60000).toFixed(1)} minutes`);
} else {
  console.log('❌ Memory Caching Disabled');
}

/**
 *
 * Compresses data using Snappy if it exceeds the threshold.
 */
async function compressData(data: string): Promise<Buffer | string> {
  if (!data) throw new Error('Data cannot be empty');
  if (data.length > COMPRESSION_THRESHOLD) {
    const compressed = await snappy.compress(Buffer.from(data));
    console.log('Data compressed successfully');
    return compressed;
  }
  return data;
}

/**
 * Decompresses data using Snappy if it is compressed.
 */
async function decompressData(data: Buffer | string): Promise<string> {
  if (!data) throw new Error('Data cannot be empty');
  try {
    if (data instanceof Buffer) {
      const decompressed = await snappy.uncompress(data, { asBuffer: false });
      console.log('Data decompressed successfully');
      return decompressed.toString();
    }
    return data as string;
  } catch (error) {
    console.error('Decompression failed:', error);
    throw new Error('Invalid or corrupted compressed data');
  }
}

/**
 * Cleans up expired entries from the memory cache.
 */
function cleanUpMemoryCache() {
  const now = Date.now();
  for (const [key, entry] of memoryCache.entries()) {
    if (now - entry.timestamp > MEMORY_CACHE_TTL) {
      memoryCache.delete(key);
      console.log(`Memory cache expired and deleted (Key: ${key})`);
    }
  }
}
setInterval(cleanUpMemoryCache, MEMORY_CACHE_TTL);

/**
 * Sets a value in the cache (Redis and/or in-memory).
 */
async function redisSetCache<T>(key: string, value: T, ttlInHours: number = DEFAULT_CACHE_EXPIRY_HOURS): Promise<void> {
  const stringValue = JSON.stringify(value);

  if (redis) {
    const dataToStore = await compressData(stringValue);
    await redis.set(key, dataToStore, 'EX', ttlInHours * 3600);
    console.log(`Data stored in Redis (Key: ${key})`);
  }

  if (MEMORY_CACHE_ENABLED) {
    memoryCache.set(key, { value, timestamp: Date.now() });
    console.log(`Data stored in memory cache (Key: ${key})`);
  }
}

/**
 * Retrieves a value from the cache (Redis and/or in-memory).
 */
async function redisGetCache<T>(key: string): Promise<T | null> {
  if (MEMORY_CACHE_ENABLED && memoryCache.has(key)) {
    const cacheEntry = memoryCache.get(key)!;
    if (Date.now() - cacheEntry.timestamp <= MEMORY_CACHE_TTL_MS) {
      console.log(`Cache hit (Memory) - Key: ${key}`);
      return cacheEntry.value as T;
    } else {
      memoryCache.delete(key);
    }
  }

  if (redis) {
    const data = await redis.getBuffer(key);
    if (data) {
      const decompressedData = await decompressData(data);
      const value = JSON.parse(decompressedData) as T;
      console.log(`Cache hit (Redis) - Key: ${key}`);
      if (MEMORY_CACHE_ENABLED) {
        memoryCache.set(key, { value, timestamp: Date.now() });
      }

      return value;
    }
  }
  if (redis || MEMORY_CACHE_ENABLED) {
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

  if (MEMORY_CACHE_ENABLED) {
    if (key) {
      memoryCache.delete(key);
      console.log(`Memory cache cleared for key: ${key}`);
    } else {
      memoryCache.clear();
      console.log('Entire memory cache has been purged');
    }
  }
}

export { redisGetCache, redisSetCache, purgeCache };
