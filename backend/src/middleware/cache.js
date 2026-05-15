import redis from '../config/redis.js';

/**
 * Redis Caching Middleware
 * @param {number} ttlSeconds - Time to live in seconds
 * @param {boolean} isPrivate - If true, include user ID in cache key
 */
export const cacheMiddleware = (ttlSeconds = 300, isPrivate = false) => {
  return async (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    const userId = req.user ? req.user._id : 'public';
    const key = `cache:${isPrivate ? userId : 'global'}:${req.originalUrl}`;

    try {
      const cachedData = await redis.get(key);
      if (cachedData) {
        return res.json(JSON.parse(cachedData));
      }

      // Intercept the response to store it in cache
      const originalJson = res.json;
      res.json = function(data) {
        // Only cache successful responses
        if (res.statusCode >= 200 && res.statusCode < 300) {
          redis.setex(key, ttlSeconds, JSON.stringify(data)).catch(err => {
            console.error('Redis cache set error:', err);
          });
        }
        return originalJson.call(this, data);
      };

      next();
    } catch (err) {
      console.error('Redis cache error:', err);
      next(); // Fail gracefully — proceed without cache if Redis is down
    }
  };
};

/**
 * Utility to clear cache by pattern
 * @param {string} pattern - Pattern to match keys (e.g., "cache:user123:*")
 */
export const clearCache = async (pattern) => {
  try {
    const stream = redis.scanStream({
      match: pattern,
      count: 100
    });

    stream.on('data', async (keys) => {
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    });

    stream.on('error', (err) => {
      console.error('Redis scanStream error:', err);
    });
  } catch (err) {
    console.error('Redis clearCache error:', err);
  }
};
