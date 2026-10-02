import { redis } from "@/database/redis";

export class CacheService {
  private static memoryFallback = new Map<string, { value: string; expiry: number }>();

  public static async get<T>(key: string): Promise<T | null> {
    try {
      if (redis.status === "ready") {
        const data = await redis.get(key);
        return data ? (JSON.parse(data) as T) : null;
      }
    } catch (e) {
      console.warn(`Redis get failed for key ${key}, checking fallback:`, (e as Error).message);
    }

    const fallback = this.memoryFallback.get(key);
    if (fallback) {
      if (fallback.expiry > Date.now()) {
        return JSON.parse(fallback.value) as T;
      }
      this.memoryFallback.delete(key);
    }
    return null;
  }

  public static async set(key: string, value: unknown, ttlSeconds = 300): Promise<void> {
    const stringVal = JSON.stringify(value);
    try {
      if (redis.status === "ready") {
        await redis.set(key, stringVal, "EX", ttlSeconds);
        return;
      }
    } catch (e) {
      console.warn(`Redis set failed for key ${key}, storing in fallback:`, (e as Error).message);
    }

    this.memoryFallback.set(key, {
      value: stringVal,
      expiry: Date.now() + ttlSeconds * 1000,
    });
  }

  public static async del(key: string): Promise<void> {
    try {
      if (redis.status === "ready") {
        await redis.del(key);
      }
    } catch (e) {
      console.warn(`Redis del failed for key ${key}:`, (e as Error).message);
    }
    this.memoryFallback.delete(key);
  }

  public static async invalidatePattern(pattern: string): Promise<void> {
    try {
      if (redis.status === "ready") {
        const keys = await redis.keys(pattern);
        if (keys.length > 0) {
          await redis.del(...keys);
        }
      }
    } catch (e) {
      console.warn(`Redis invalidatePattern failed for pattern ${pattern}:`, (e as Error).message);
    }

    // Invalidate in-memory fallback
    const regex = new RegExp("^" + pattern.replace(/\*/g, ".*") + "$");
    for (const key of this.memoryFallback.keys()) {
      if (regex.test(key)) {
        this.memoryFallback.delete(key);
      }
    }
  }

  public static async getOrSet<T>(key: string, fetcher: () => Promise<T>, ttlSeconds = 300): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }
    const fresh = await fetcher();
    if (fresh !== undefined && fresh !== null) {
      await this.set(key, fresh, ttlSeconds);
    }
    return fresh;
  }
}
