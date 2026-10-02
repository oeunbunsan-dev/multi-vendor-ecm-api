import { Elysia, t } from "elysia";
import { adminService } from "./admin.service";
import { authPlugin } from "@/common/plugins/auth.plugin";
import { successResponse } from "@/common/utils/response";
import { RbacGuard } from "@/common/plugins/rbac.plugin";

export const adminRoutes = new Elysia({ prefix: "/admin" })
  .use(authPlugin)
  .get(
    "/dashboard",
    async ({ user }) => {
      RbacGuard.ensureAdmin(user);
      const data = await adminService.getDashboardStats();
      return successResponse(data);
    },
    {
      detail: {
        tags: ["Admin"],
        summary: "Get Admin Platform Dashboard",
        security: [{ bearerAuth: [] }],
        description: "Returns total orders, revenue, customer count, vendor count, and recent orders.",
      },
    }
  )
  .get(
    "/vendors",
    async ({ user, query }) => {
      RbacGuard.ensureAdmin(user);
      const result = await adminService.getVendors({
        status: query.status as any,
        search: query.search,
        page: query.page ? parseInt(query.page) : 1,
        limit: query.limit ? parseInt(query.limit) : 10,
      });
      return successResponse(result.items, undefined, result.meta);
    },
    {
      detail: {
        tags: ["Admin"],
        summary: "List Vendors with Filters (Admin)",
        security: [{ bearerAuth: [] }],
      },
      query: t.Object({
        status: t.Optional(t.String()),
        search: t.Optional(t.String()),
        page: t.Optional(t.String()),
        limit: t.Optional(t.String()),
      }),
    }
  )
  .patch(
    "/vendors/:id/status",
    async ({ user, params, body }) => {
      RbacGuard.ensureAdmin(user);
      const updated = await adminService.updateVendorStatus(
        params.id,
        body.status as any,
        body.rejectedReason,
        body.commissionRate
      );
      return successResponse(updated, `Vendor status updated to ${body.status}`);
    },
    {
      detail: {
        tags: ["Admin"],
        summary: "Approve/Reject/Suspend Vendor Application",
        security: [{ bearerAuth: [] }],
      },
      params: t.Object({ id: t.String() }),
      body: t.Object({
        status: t.Union([
          t.Literal("PENDING"),
          t.Literal("APPROVED"),
          t.Literal("REJECTED"),
          t.Literal("SUSPENDED"),
        ]),
        rejectedReason: t.Optional(t.String()),
        commissionRate: t.Optional(t.Number()),
      }),
    }
  )
  .get(
    "/orders",
    async ({ user, query }) => {
      RbacGuard.ensureAdmin(user);
      const result = await adminService.getOrders({
        status: query.status as any,
        search: query.search,
        page: query.page ? parseInt(query.page) : 1,
        limit: query.limit ? parseInt(query.limit) : 10,
      });
      return successResponse(result.items, undefined, result.meta);
    },
    {
      detail: {
        tags: ["Admin"],
        summary: "List Platform Orders (Admin)",
        security: [{ bearerAuth: [] }],
      },
      query: t.Object({
        status: t.Optional(t.String()),
        search: t.Optional(t.String()),
        page: t.Optional(t.String()),
        limit: t.Optional(t.String()),
      }),
    }
  )
  .get(
    "/users",
    async ({ user, query }) => {
      RbacGuard.ensureAdmin(user);
      const result = await adminService.getUsers({
        role: query.role as any,
        status: query.status as any,
        search: query.search,
        page: query.page ? parseInt(query.page) : 1,
        limit: query.limit ? parseInt(query.limit) : 10,
      });
      return successResponse(result.items, undefined, result.meta);
    },
    {
      detail: {
        tags: ["Admin"],
        summary: "List Users (Admin)",
        security: [{ bearerAuth: [] }],
      },
      query: t.Object({
        role: t.Optional(t.String()),
        status: t.Optional(t.String()),
        search: t.Optional(t.String()),
        page: t.Optional(t.String()),
        limit: t.Optional(t.String()),
      }),
    }
  );
