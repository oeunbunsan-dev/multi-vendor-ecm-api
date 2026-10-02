import { Elysia, t } from "elysia";
import { inventoryService } from "./inventory.service";
import { authPlugin } from "@/common/plugins/auth.plugin";
import { successResponse } from "@/common/utils/response";
import { UnauthorizedException, ForbiddenException } from "@/common/exceptions";

export const inventoryRoutes = new Elysia({ prefix: "/vendor/inventory" })
  .use(authPlugin)
  .get(
    "/",
    async ({ user, query }) => {
      if (!user) throw new UnauthorizedException("Authentication required");
      if (user.role !== "VENDOR" && user.role !== "ADMIN") {
        throw new ForbiddenException("Vendor access required");
      }

      const page = query.page ? parseInt(query.page) : 1;
      const limit = query.limit ? parseInt(query.limit) : 20;

      const result = await inventoryService.getVendorInventory(user.vendorId!, page, limit);
      return successResponse(result.items, undefined, result.meta);
    },
    {
      detail: {
        tags: ["Inventory"],
        summary: "List Vendor Inventory",
        security: [{ bearerAuth: [] }],
      },
      query: t.Object({
        page: t.Optional(t.String()),
        limit: t.Optional(t.String()),
      }),
    }
  )
  .get(
    "/alerts",
    async ({ user }) => {
      if (!user) throw new UnauthorizedException("Authentication required");
      if (user.role !== "VENDOR" && user.role !== "ADMIN") {
        throw new ForbiddenException("Vendor access required");
      }

      const alerts = await inventoryService.getLowStockAlerts(user.vendorId!);
      return successResponse(alerts);
    },
    {
      detail: {
        tags: ["Inventory"],
        summary: "Get Low Stock Alerts",
        security: [{ bearerAuth: [] }],
      },
    }
  )
  .post(
    "/adjust",
    async ({ user, body }) => {
      if (!user) throw new UnauthorizedException("Authentication required");
      if (user.role !== "VENDOR" && user.role !== "ADMIN") {
        throw new ForbiddenException("Vendor access required");
      }

      const result = await inventoryService.adjustStock(user.vendorId, user.id, body as any);
      return successResponse(result, "Inventory adjusted successfully");
    },
    {
      detail: {
        tags: ["Inventory"],
        summary: "Adjust Inventory Stock",
        security: [{ bearerAuth: [] }],
        description: "Records stock movements (IN, OUT, ADJUSTMENT, RETURN, DAMAGED) and updates counts.",
      },
      body: t.Object({
        inventoryId: t.String(),
        type: t.Union([
          t.Literal("IN"),
          t.Literal("OUT"),
          t.Literal("ADJUSTMENT"),
          t.Literal("RETURN"),
          t.Literal("DAMAGED"),
        ]),
        quantity: t.Number({ minimum: 1 }),
        reason: t.Optional(t.String()),
        referenceId: t.Optional(t.String()),
      }),
    }
  )
  .get(
    "/:id/history",
    async ({ user, params }) => {
      if (!user) throw new UnauthorizedException("Authentication required");
      if (user.role !== "VENDOR" && user.role !== "ADMIN") {
        throw new ForbiddenException("Vendor access required");
      }

      const history = await inventoryService.getInventoryHistory(params.id);
      return successResponse(history);
    },
    {
      detail: {
        tags: ["Inventory"],
        summary: "Get Inventory Movement History",
        security: [{ bearerAuth: [] }],
      },
      params: t.Object({ id: t.String() }),
    }
  );
