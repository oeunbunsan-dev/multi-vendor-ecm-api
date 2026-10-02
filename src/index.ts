import { app } from "./app";
import { config } from "./config";
import { prisma } from "./database/prisma";
import { redis } from "./database/redis";

const server = app.listen(config.port, () => {
  console.log(`
  🚀 ${config.appName} is running!
  --------------------------------------------------
  📡 URL:            http://localhost:${config.port}
  📑 API Docs:       http://localhost:${config.port}/swagger
  🩺 Health Check:   http://localhost:${config.port}/health
  🌍 Environment:    ${config.nodeEnv}
  ⚡ Bun Runtime:     v${Bun.version}
  --------------------------------------------------
  `);
});

// Graceful shutdown handling
const handleGracefulShutdown = async (signal: string) => {
  console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);
  try {
    server.stop();
    await prisma.$disconnect();
    if (redis.status === "ready") {
      await redis.quit();
    }
    console.log("✅ Server and database connections closed gracefully.");
    process.exit(0);
  } catch (err) {
    console.error("❌ Error during graceful shutdown:", err);
    process.exit(1);
  }
};

process.on("SIGINT", () => handleGracefulShutdown("SIGINT"));
process.on("SIGTERM", () => handleGracefulShutdown("SIGTERM"));
