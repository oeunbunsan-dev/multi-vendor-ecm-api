import Redis from "ioredis";
import { config } from "@/config";

declare global {
  // eslint-disable-next-line no-var
  var __redisClient: Redis | undefined;
}

export function createRedisClient(): Redis {
  const redis = new Redis(config.redisUrl, {
    password: config.redisPassword || undefined,
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
      if (times > 5) {
        console.warn("⚠️ Redis retry limit reached, running in degraded cache mode.");
        return null;
      }
      return Math.min(times * 100, 2000);
    },
    lazyConnect: true,
  });

  redis.on("connect", () => {
    if (config.nodeEnv !== "test") {
      console.log("⚡ Redis client connected successfully");
    }
  });

  redis.on("error", (err) => {
    console.error("❌ Redis connection error:", err.message);
  });

  return redis;
}

export const redis = global.__redisClient ?? createRedisClient();

if (config.nodeEnv !== "production") {
  global.__redisClient = redis;
}

// Connect immediately
redis.connect().catch((err) => {
  console.warn("⚠️ Redis initial connection warning:", err.message);
});

export default redis;
