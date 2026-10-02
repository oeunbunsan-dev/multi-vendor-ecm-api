import { Elysia } from "elysia";
import { analyticsService } from "./analytics.service";
import { authPlugin } from "@/common/plugins/auth.plugin";
import { successResponse } from "@/common/utils/response";
import { RbacGuard } from "@/common/plugins/rbac.plugin";
import { UnauthorizedException } from "@/common/exceptions";

export const analyticsRoutes = new Elysia({ prefix: "/analytics" })
  .use(authPlugin)
  .get(
    "/admin",
    async ({ user }) => {
      RbacGuard.ensureAdmin(user);
      const data = await analyticsService.getAdminAnalytics();
      return successResponse(data);
    },
    {
      detail: {
        tags: ["Analytics"],
        summary: "Platform Admin Analytics",
        security: [{ bearerAuth: [] }],
      },
    }
  )
  .get(
    "/vendor",
    async ({ user }) => {
      RbacGuard.ensureVendor(user);
      if (!user?.vendorId) throw new UnauthorizedException("Vendor profile required");
      const data = await analyticsService.getVendorAnalytics(user.vendorId);
      return successResponse(data);
    },
    {
      detail: {
        tags: ["Analytics"],
        summary: "Vendor Sales Analytics",
        security: [{ bearerAuth: [] }],
      },
    }
  );
