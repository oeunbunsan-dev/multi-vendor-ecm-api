import { Elysia, t } from "elysia";
import { shippingService } from "./shipping.service";
import { authPlugin } from "@/common/plugins/auth.plugin";
import { successResponse } from "@/common/utils/response";
import { RbacGuard } from "@/common/plugins/rbac.plugin";

export const shippingRoutes = new Elysia({ prefix: "/shipping" })
  .use(authPlugin)
  .get(
    "/methods",
    async ({ query }) => {
      const subtotal = query.subtotal ? parseFloat(query.subtotal) : 0;
      const methods = shippingService.getAvailableMethods(subtotal);
      return successResponse(methods);
    },
    {
      detail: {
        tags: ["Shipping"],
        summary: "Get Available Shipping Methods & Calculate Fees",
      },
      query: t.Object({
        subtotal: t.Optional(t.String()),
      }),
    }
  )
  .get(
    "/track/:trackingNumber",
    async ({ params }) => {
      const shipment = await shippingService.getShipmentByTrackingNumber(params.trackingNumber);
      return successResponse(shipment);
    },
    {
      detail: {
        tags: ["Shipping"],
        summary: "Track Shipment by Tracking Number",
      },
      params: t.Object({ trackingNumber: t.String() }),
    }
  )
  .patch(
    "/shipments/:id/status",
    async ({ user, params, body }) => {
      RbacGuard.ensureVendor(user);
      const updated = await shippingService.updateShipmentStatus(
        params.id,
        body.status as any,
        body.carrier,
        body.trackingNumber
      );
      return successResponse(updated, "Shipment status updated");
    },
    {
      detail: {
        tags: ["Shipping"],
        summary: "Update Shipment Status (Vendor/Admin)",
        security: [{ bearerAuth: [] }],
      },
      params: t.Object({ id: t.String() }),
      body: t.Object({
        status: t.Union([
          t.Literal("PENDING"),
          t.Literal("PICKED_UP"),
          t.Literal("IN_TRANSIT"),
          t.Literal("OUT_FOR_DELIVERY"),
          t.Literal("DELIVERED"),
          t.Literal("FAILED"),
          t.Literal("RETURNED"),
        ]),
        carrier: t.Optional(t.String()),
        trackingNumber: t.Optional(t.String()),
      }),
    }
  );
