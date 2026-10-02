import { Elysia } from "elysia";
import { jwt } from "@elysiajs/jwt";
import { config } from "@/config";
import { prisma } from "@/database/prisma";
import { UnauthorizedException, ForbiddenException } from "../exceptions";
import { UserRole } from "../constants/roles";

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  vendorId?: string;
  storeIds?: string[];
}

export const authPlugin = new Elysia({ name: "auth-plugin" })
  .use(
    jwt({
      name: "jwtAccess",
      secret: config.jwt.accessSecret,
      exp: config.jwt.accessExpiresIn,
    })
  )
  .use(
    jwt({
      name: "jwtRefresh",
      secret: config.jwt.refreshSecret,
      exp: config.jwt.refreshExpiresIn,
    })
  )
  .derive({ as: "scoped" }, async ({ headers, jwtAccess }) => {
    const authHeader = headers["authorization"];
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return { user: null as AuthUser | null };
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
      return { user: null as AuthUser | null };
    }

    try {
      const payload = await jwtAccess.verify(token);
      if (!payload || typeof payload !== "object" || !payload.id) {
        return { user: null as AuthUser | null };
      }

      // Check user in database
      const dbUser = await prisma.user.findUnique({
        where: { id: payload.id as string },
        select: {
          id: true,
          email: true,
          role: true,
          status: true,
          vendor: {
            select: {
              id: true,
              status: true,
              stores: {
                select: { id: true },
              },
            },
          },
        },
      });

      if (!dbUser || dbUser.status !== "ACTIVE") {
        return { user: null as AuthUser | null };
      }

      const user: AuthUser = {
        id: dbUser.id,
        email: dbUser.email,
        role: dbUser.role as UserRole,
        vendorId: dbUser.vendor?.id,
        storeIds: dbUser.vendor?.stores.map((s) => s.id) || [],
      };

      return { user: user as AuthUser | null };
    } catch {
      return { user: null as AuthUser | null };
    }
  });

export function checkAuth(user: AuthUser | null): asserts user is AuthUser {
  if (!user) {
    throw new UnauthorizedException("Authentication token is required or has expired");
  }
}

export function checkRoles(user: AuthUser | null, allowedRoles: UserRole[]): asserts user is AuthUser {
  checkAuth(user);
  if (!allowedRoles.includes(user.role)) {
    throw new ForbiddenException(`Forbidden: Requires one of [${allowedRoles.join(", ")}] roles`);
  }
}
