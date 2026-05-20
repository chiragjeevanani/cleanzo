import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

let redis;

const handleRedisDisable = (client) => {
  if (!client) return;
  console.warn('⚠️ Redis connection failed. Disabling Redis caching and continuing in fallback mode.');
  client.status = 'disabled';
  client.get = async () => null;
  client.setex = async () => null;
  client.scanStream = () => {
    return {
      on: (event, handler) => {}
    };
  };
};

const retryStrategy = (times) => {
  if (times > 3) {
    setTimeout(() => {
      handleRedisDisable(redis);
    }, 0);
    return null; // Stop retrying
  }
  return times * 1000; // Retry after 1s, 2s, 3s
};

if (process.env.DISABLE_REDIS === 'true') {
  console.log('ℹ️  Redis is disabled via DISABLE_REDIS environment variable');
  
  // Provide a safe mock object so the application doesn't crash
  redis = {
    status: 'disabled',
    on: (event, handler) => {},
    get: async () => null,
    setex: async () => null,
    scanStream: () => {
      return {
        on: (event, handler) => {}
      };
    }
  };
} else {
  const redisConfig = {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    retryStrategy,
    maxRetriesPerRequest: 3,
    enableOfflineQueue: false,
    connectTimeout: 5000,
  };

  // If REDIS_URL is provided, use it instead (common in production envs like Render/Heroku)
  redis = process.env.REDIS_URL 
    ? new Redis(process.env.REDIS_URL, { 
        maxRetriesPerRequest: 3, 
        enableOfflineQueue: false,
        connectTimeout: 5000,
        retryStrategy
      }) 
    : new Redis(redisConfig);

  redis.on('connect', () => {
    console.log('✅ Redis connected');
  });

  redis.on('error', (err) => {
    if (redis.status !== 'disabled') {
      console.error('❌ Redis error:', err.message);
    }
  });
}

export default redis;

