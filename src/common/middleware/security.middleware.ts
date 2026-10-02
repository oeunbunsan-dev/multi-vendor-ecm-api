import { Elysia } from "elysia";

export const securityMiddleware = new Elysia({ name: "security-middleware" })
  .onAfterResponse(({ set }) => {
    // Security headers (Helmet equivalent)
    set.headers["X-Content-Type-Options"] = "nosniff";
    set.headers["X-Frame-Options"] = "DENY";
    set.headers["X-XSS-Protection"] = "1; mode=block";
    set.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains";
    set.headers["Referrer-Policy"] = "strict-origin-when-cross-origin";
    set.headers["Content-Security-Policy"] = "default-src 'self'; frame-ancestors 'none';";
  });
