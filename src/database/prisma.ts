import { PrismaClient } from "@prisma/client";
import { config } from "@/config";

declare global {
  // eslint-disable-next-line no-var
  var __prismaClient: PrismaClient | undefined;
}

export function createPrismaClient(): PrismaClient {
  const isDev = config.nodeEnv === "development";
  return new PrismaClient({
    log: isDev ? ["warn", "error"] : ["error"],
    datasources: {
      db: {
        url: config.databaseUrl,
      },
    },
  });
}

export const prisma = global.__prismaClient ?? createPrismaClient();

if (config.nodeEnv !== "production") {
  global.__prismaClient = prisma;
}

export default prisma;
