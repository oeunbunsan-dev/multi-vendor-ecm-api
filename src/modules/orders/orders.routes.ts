import { Elysia, t } from "elysia";
import { ordersService } from "./orders.service";
import { authPlugin } from "@/common/plugins/auth.plugin";
import { successResponse } from "@/common/utils/response";
import { UnauthorizedException } from "@/common/exceptions";
import { RbacGuard } from "@/common/plugins/rbac.plugin";

export const ordersRoutes = new Elysia({ prefix: "/orders" })
  .use(authPlugin)
  .post(
    "/",
    async ({ user, body }) => {
      if (!user) throw new UnauthorizedException("Authentication required to place an order");
      const order = await ordersService.createOrder({
        customerId: user.id,
        items: body.items,
        shippingAddress: body.shippingAddress,
        billingAddress: body.billingAddress,
        paymentMethod: body.paymentMethod as any,
        couponCode: body.couponCode,
        notes: body.notes,
        cartIdToClear: body.cartIdToClear,
      });
      return successResponse(order, "Order placed successfully");
    },
    {
      detail: {
        tags: ["Orders"],
        summary: "Place Customer Order",
        security: [{ bearerAuth: [] }],
        description: "Places order, reserves stock, creates payment & shipment records, and notifies customer.",
      },
      body: t.Object({
        items: t.Array(
          t.Object({
            productId: t.String(),
            variantId: t.Optional(t.String()),
            quantity: t.Number({ minimum: 1 }),
          })
        ),
        shippingAddress: t.Object({
          firstName: t.String(),
          lastName: t.String(),
          phone: t.String(),
          street: t.String(),
          city: t.String(),
          state: t.Optional(t.String()),
          postalCode: t.String(),
          country: t.String(),
        }),
        billingAddress: t.Optional(
          t.Object({
            firstName: t.String(),
            lastName: t.String(),
            phone: t.String(),
            street: t.String(),
            city: t.String(),
            state: t.Optional(t.String()),
            postalCode: t.String(),
            country: t.String(),
          })
        ),
        paymentMethod: t.Union([
          t.Literal("COD"),
          t.Literal("ABA_PAYWAY"),
          t.Literal("STRIPE"),
          t.Literal("PAYPAL"),
        ]),
        couponCode: t.Optional(t.String()),
        notes: t.Optional(t.String()),
        cartIdToClear: t.Optional(t.String()),
      }),
    }
  )
  .get(
    "/",
    async ({ user, query }) => {
      if (!user) throw new UnauthorizedException("Authentication required");
      const page = query.page ? parseInt(query.page) : 1;
      const limit = query.limit ? parseInt(query.limit) : 10;
      const result = await ordersService.getCustomerOrders(user.id, page, limit);
      return successResponse(result.items, undefined, result.meta);
    },
    {
      detail: {
        tags: ["Orders"],
        summary: "Get Customer Orders",
        security: [{ bearerAuth: [] }],
      },
      query: t.Object({
        page: t.Optional(t.String()),
        limit: t.Optional(t.String()),
      }),
    }
  )
  .get(
    "/:id",
    async ({ user, params }) => {
      if (!user) throw new UnauthorizedException("Authentication required");
      const order = await ordersService.getOrderById(params.id, user.id, user.role);
      return successResponse(order);
    },
    {
      detail: {
        tags: ["Orders"],
        summary: "Get Order Details by ID",
        security: [{ bearerAuth: [] }],
      },
      params: t.Object({ id: t.String() }),
    }
  )
  .post(
    "/:id/cancel",
    async ({ user, params, body }) => {
      if (!user) throw new UnauthorizedException("Authentication required");
      const result = await ordersService.cancelOrder(params.id, user.id, body?.reason);
      return successResponse(result);
    },
    {
      detail: {
        tags: ["Orders"],
        summary: "Cancel Customer Order",
        security: [{ bearerAuth: [] }],
        description: "Cancels order if in PENDING or CONFIRMED state and restores inventory stock.",
      },
      params: t.Object({ id: t.String() }),
      body: t.Optional(t.Object({ reason: t.Optional(t.String()) })),
    }
  )
  .patch(
    "/:id/status",
    async ({ user, params, body }) => {
      RbacGuard.ensureVendor(user);
      const updated = await ordersService.updateOrderStatus(params.id, body.status as any);
      return successResponse(updated, "Order status updated");
    },
    {
      detail: {
        tags: ["Orders"],
        summary: "Update Order Status (Vendor/Admin)",
        security: [{ bearerAuth: [] }],
      },
      params: t.Object({ id: t.String() }),
      body: t.Object({
        status: t.Union([
          t.Literal("PENDING"),
          t.Literal("CONFIRMED"),
          t.Literal("PROCESSING"),
          t.Literal("SHIPPED"),
          t.Literal("DELIVERED"),
          t.Literal("CANCELLED"),
          t.Literal("REFUNDED"),
        ]),
      }),
    }
  );
