import { Elysia } from "elysia";
import { config } from "@/config";
import { redis } from "@/database/redis";
import { errorResponse } from "../utils/response";

const inMemoryHits = new Map<string, { count: number; resetTime: number }>();

export const rateLimitMiddleware = new Elysia({ name: "rate-limit-middleware" })
  .onBeforeHandle(async ({ request, set }) => {
    // Skip rate limiting in test environment
    if (config.nodeEnv === "test") return;

    // Get IP address
    const forwarded = request.headers.get("x-forwarded-for");
    const ip = forwarded ? forwarded.split(",")[0].trim() : "127.0.0.1";
    const key = `rate_limit:${ip}`;
    const limit = config.rateLimit.max;
    const windowSeconds = Math.ceil(config.rateLimit.windowMs / 1000);

    let current = 0;
    try {
      if (redis.status === "ready") {
        current = await redis.incr(key);
        if (current === 1) {
          await redis.expire(key, windowSeconds);
        }
      } else {
        const now = Date.now();
        const record = inMemoryHits.get(key);
        if (!record || record.resetTime < now) {
          inMemoryHits.set(key, { count: 1, resetTime: now + config.rateLimit.windowMs });
          current = 1;
        } else {
          record.count++;
          current = record.count;
        }
      }
    } catch {
      return; // Fail open if rate limiter fails
    }

    set.headers["X-RateLimit-Limit"] = limit.toString();
    set.headers["X-RateLimit-Remaining"] = Math.max(0, limit - current).toString();

    if (current > limit) {
      set.status = 429;
      set.headers["Retry-After"] = windowSeconds.toString();
      return errorResponse("Too many requests, please try again later", "RATE_LIMIT_EXCEEDED");
    }
  });
