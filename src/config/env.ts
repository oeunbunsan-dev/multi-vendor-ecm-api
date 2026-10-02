export interface AppConfig {
  port: number;
  nodeEnv: string;
  apiPrefix: string;
  appName: string;
  appUrl: string;
  databaseUrl: string;
  redisUrl: string;
  redisPassword?: string;
  jwt: {
    accessSecret: string;
    refreshSecret: string;
    accessExpiresIn: string;
    refreshExpiresIn: string;
  };
  admin: {
    defaultEmail: string;
    defaultPassword: string;
  };
  rateLimit: {
    max: number;
    windowMs: number;
  };
  payments: {
    stripeSecretKey: string;
    stripeWebhookSecret: string;
    paypalClientId: string;
    paypalClientSecret: string;
    abaPaywayApiKey: string;
    abaPaywayMerchantId: string;
  };
  uploads: {
    dir: string;
    maxSizeBytes: number;
    allowedMimeTypes: string[];
  };
}

export const config: AppConfig = {
  port: parseInt(process.env.PORT || "3001", 10),
  nodeEnv: process.env.NODE_ENV || "development",
  apiPrefix: process.env.API_PREFIX || "/api",
  appName: process.env.APP_NAME || "EMC Multi-Vendor E-Commerce API",
  appUrl: process.env.APP_URL || "http://localhost:3001",
  databaseUrl:
    process.env.DATABASE_URL ||
    "postgresql://postgres:postgres@localhost:5432/emc_ecommerce?schema=public",
  redisUrl: process.env.REDIS_URL || "redis://localhost:6379",
  redisPassword: process.env.REDIS_PASSWORD || undefined,
  jwt: {
    accessSecret:
      process.env.JWT_ACCESS_SECRET || "production-grade-super-secret-jwt-key-emc",
    refreshSecret:
      process.env.JWT_REFRESH_SECRET ||
      "production-grade-super-secret-refresh-key-emc",
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || "15m",
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
  },
  admin: {
    defaultEmail: process.env.DEFAULT_ADMIN_EMAIL || "admin@emc.com",
    defaultPassword: process.env.DEFAULT_ADMIN_PASSWORD || "AdminPassword123!",
  },
  rateLimit: {
    max: parseInt(process.env.RATE_LIMIT_MAX || "100", 10),
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "60000", 10),
  },
  payments: {
    stripeSecretKey: process.env.STRIPE_SECRET_KEY || "sk_test_mock_stripe",
    stripeWebhookSecret:
      process.env.STRIPE_WEBHOOK_SECRET || "whsec_mock_stripe",
    paypalClientId: process.env.PAYPAL_CLIENT_ID || "mock_paypal_client",
    paypalClientSecret:
      process.env.PAYPAL_CLIENT_SECRET || "mock_paypal_secret",
    abaPaywayApiKey: process.env.ABA_PAYWAY_API_KEY || "mock_aba_key",
    abaPaywayMerchantId:
      process.env.ABA_PAYWAY_MERCHANT_ID || "mock_aba_merchant",
  },
  uploads: {
    dir: process.env.UPLOAD_DIR || "./uploads",
    maxSizeBytes:
      parseInt(process.env.MAX_FILE_SIZE_MB || "10", 10) * 1024 * 1024,
    allowedMimeTypes: (
      process.env.ALLOWED_MIME_TYPES ||
      "image/jpeg,image/png,image/webp,image/gif"
    ).split(","),
  },
};

export default config;
