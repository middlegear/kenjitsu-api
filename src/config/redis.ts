import 'dotenv';
import { Redis } from 'ioredis';

const port = Number(process.env.REDIS_PORT);
const host = process.env.REDIS_HOST;
const password = process.env.REDIS_PASSWORD;

const isRedisEnabled = host && password;

export const redis = isRedisEnabled
  ? new Redis({
      host: host,
      port: port,
      password: password,
      tls: {},
    })
  : null;

export async function checkRedis() {
  if (!redis) {
    console.log('❌ Redis is disabled (missing environment variables).');
    return;
  }

  try {
    const pong = await redis.ping();
    console.log('✅ Redis Connection Successful:', pong);
  } catch (err) {
    console.error('❌ Redis Connection Failed:', err);
  }
}
