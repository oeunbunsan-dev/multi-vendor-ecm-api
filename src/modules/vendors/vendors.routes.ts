import { Elysia, t } from "elysia";
import { vendorsService } from "./vendors.service";
import { authPlugin } from "@/common/plugins/auth.plugin";
import { successResponse } from "@/common/utils/response";
import { UnauthorizedException, ForbiddenException } from "@/common/exceptions";

export const vendorsRoutes = new Elysia({ prefix: "/vendor" })
  .use(authPlugin)
  .get(
    "/profile",
    async ({ user }) => {
      if (!user) throw new UnauthorizedException("Authentication required");
      const profile = await vendorsService.getVendorProfile(user.id);
      return successResponse(profile);
    },
    {
      detail: {
        tags: ["Vendors"],
        summary: "Get Vendor Business Profile",
        security: [{ bearerAuth: [] }],
      },
    }
  )
  .get(
    "/dashboard",
    async ({ user }) => {
      if (!user) throw new UnauthorizedException("Authentication required");
      if (user.role !== "VENDOR" && user.role !== "ADMIN") {
        throw new ForbiddenException("Vendor access required");
      }
      if (!user.vendorId) throw new ForbiddenException("No vendor account found");

      const dashboard = await vendorsService.getVendorDashboard(user.vendorId);
      return successResponse(dashboard);
    },
    {
      detail: {
        tags: ["Vendors"],
        summary: "Get Vendor Dashboard Overview",
        security: [{ bearerAuth: [] }],
        description: "Returns revenue, total orders, active products, and low stock inventory alerts.",
      },
    }
  )
  .get(
    "/orders",
    async ({ user, query }) => {
      if (!user) throw new UnauthorizedException("Authentication required");
      if (user.role !== "VENDOR" && user.role !== "ADMIN") {
        throw new ForbiddenException("Vendor access required");
      }
      if (!user.vendorId) throw new ForbiddenException("No vendor account found");

      const page = query.page ? parseInt(query.page) : 1;
      const limit = query.limit ? parseInt(query.limit) : 10;
      const result = await vendorsService.getVendorOrders(user.vendorId, page, limit);
      return successResponse(result.items, undefined, result.meta);
    },
    {
      detail: {
        tags: ["Vendors"],
        summary: "Get Vendor Store Orders",
        security: [{ bearerAuth: [] }],
      },
      query: t.Object({
        page: t.Optional(t.String()),
        limit: t.Optional(t.String()),
      }),
    }
  );
