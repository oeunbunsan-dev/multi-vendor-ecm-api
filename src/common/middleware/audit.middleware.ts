import { prisma } from "@/database/prisma";
import { Prisma } from "@prisma/client";

export interface LogAuditParams {
  userId?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  oldValue?: unknown;
  newValue?: unknown;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export async function recordAuditLog(params: LogAuditParams): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: params.userId || null,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId || null,
        oldValue: params.oldValue ? (params.oldValue as Prisma.InputJsonValue) : Prisma.JsonNull,
        newValue: params.newValue ? (params.newValue as Prisma.InputJsonValue) : Prisma.JsonNull,
        ipAddress: params.ipAddress || null,
        userAgent: params.userAgent || null,
      },
    });
  } catch (err) {
    console.error("Failed to record audit log:", (err as Error).message);
  }
}
