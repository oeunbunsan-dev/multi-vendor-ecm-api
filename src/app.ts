import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { config } from "./config";
import { prisma } from "./database/prisma";
import { redis } from "./database/redis";
import { swaggerPlugin } from "./common/plugins/swagger.plugin";
import {
  errorMiddleware,
  loggerMiddleware,
  securityMiddleware,
  rateLimitMiddleware,
} from "./common/middleware";

// Feature Modules
import { authRoutes } from "./modules/auth";
import { usersRoutes } from "./modules/users";
import { vendorsRoutes } from "./modules/vendors";
import { storesRoutes } from "./modules/stores";
import { categoriesRoutes } from "./modules/categories";
import { brandsRoutes } from "./modules/brands";
import { productsRoutes, vendorProductsRoutes } from "./modules/products";
import { inventoryRoutes } from "./modules/inventory";
import { cartsRoutes } from "./modules/carts";
import { wishlistRoutes } from "./modules/wishlist";
import { ordersRoutes } from "./modules/orders";
import { paymentsRoutes } from "./modules/payments";
import { shippingRoutes } from "./modules/shipping";
import { couponsRoutes } from "./modules/coupons";
import { reviewsRoutes } from "./modules/reviews";
import { notificationsRoutes } from "./modules/notifications";
import { analyticsRoutes } from "./modules/analytics";
import { uploadsRoutes } from "./modules/uploads";
import { adminRoutes } from "./modules/admin";

import { join } from "path";

export function createApp() {
  const app = new Elysia()
    // Global Plugins
    .use(cors())
    .use(swaggerPlugin)

    // Security & Infrastructure Middleware
    .use(securityMiddleware)
    .use(errorMiddleware)
    .use(loggerMiddleware)
    .use(rateLimitMiddleware)

    // Base & Health Check
    .get("/", () => ({
      success: true,
      name: config.appName,
      version: "1.0.0",
      documentation: "/swagger",
      health: "/health",
    }))
    .get("/health", async () => {
      let dbStatus = "healthy";
      let redisStatus = "healthy";

      try {
        await prisma.$queryRaw`SELECT 1`;
      } catch (e) {
        dbStatus = `unhealthy: ${(e as Error).message}`;
      }

      try {
        if (redis.status === "ready") {
          await redis.ping();
        } else {
          redisStatus = "degraded/disconnected";
        }
      } catch (e) {
        redisStatus = `unhealthy: ${(e as Error).message}`;
      }

      return {
        status: dbStatus === "healthy" ? "healthy" : "degraded",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        services: {
          database: dbStatus,
          redis: redisStatus,
        },
      };
    })

    // Static Uploads file serving with Bun native zero-copy file streamer
    .get("/uploads/*", async ({ params, set }) => {
      const fileName = (params as any)["*"];
      const filePath = join(process.cwd(), config.uploads.dir, fileName);
      const file = Bun.file(filePath);

      if (await file.exists()) {
        return file;
      }
      set.status = 404;
      return { success: false, message: "File not found" };
    })

    // API Routes Group
    .group(config.apiPrefix, (api) =>
      api
        .use(authRoutes)
        .use(usersRoutes)
        .use(storesRoutes)
        .use(categoriesRoutes)
        .use(brandsRoutes)
        .use(productsRoutes)
        .use(vendorProductsRoutes)
        .use(vendorsRoutes)
        .use(inventoryRoutes)
        .use(cartsRoutes)
        .use(wishlistRoutes)
        .use(ordersRoutes)
        .use(paymentsRoutes)
        .use(shippingRoutes)
        .use(couponsRoutes)
        .use(reviewsRoutes)
        .use(notificationsRoutes)
        .use(analyticsRoutes)
        .use(uploadsRoutes)
        .use(adminRoutes)
    );

  return app;
}

export const app = createApp();
