import { Elysia, t } from "elysia";
import { cartsService } from "./carts.service";
import { authPlugin } from "@/common/plugins/auth.plugin";
import { successResponse } from "@/common/utils/response";

export const cartsRoutes = new Elysia({ prefix: "/cart" })
  .use(authPlugin)
  .get(
    "/",
    async ({ user, headers }) => {
      const sessionId = headers["x-session-id"] || undefined;
      const cart = await cartsService.getOrCreateCart(user?.id, sessionId);
      return successResponse(cart);
    },
    {
      detail: {
        tags: ["Cart"],
        summary: "Get Cart",
        description: "Returns active cart for authenticated user or guest session via X-Session-Id header.",
      },
    }
  )
  .post(
    "/",
    async ({ user, headers, body }) => {
      const sessionId = headers["x-session-id"] || undefined;
      const cart = await cartsService.addItem({
        userId: user?.id,
        sessionId,
        productId: body.productId,
        variantId: body.variantId,
        quantity: body.quantity,
      });
      return successResponse(cart, "Item added to cart");
    },
    {
      detail: {
        tags: ["Cart"],
        summary: "Add Item to Cart",
        description: "Adds product or variant to cart with stock validation.",
      },
      body: t.Object({
        productId: t.String(),
        variantId: t.Optional(t.String()),
        quantity: t.Number({ minimum: 1 }),
      }),
    }
  )
  .put(
    "/items/:id",
    async ({ user, headers, params, body }) => {
      const sessionId = headers["x-session-id"] || undefined;
      const cart = await cartsService.updateItemQuantity(params.id, body.quantity, user?.id, sessionId);
      return successResponse(cart, "Cart item updated");
    },
    {
      detail: {
        tags: ["Cart"],
        summary: "Update Cart Item Quantity",
      },
      params: t.Object({ id: t.String() }),
      body: t.Object({
        quantity: t.Number({ minimum: 0 }),
      }),
    }
  )
  .delete(
    "/items/:id",
    async ({ user, headers, params }) => {
      const sessionId = headers["x-session-id"] || undefined;
      const cart = await cartsService.removeItem(params.id, user?.id, sessionId);
      return successResponse(cart, "Item removed from cart");
    },
    {
      detail: {
        tags: ["Cart"],
        summary: "Remove Item from Cart",
      },
      params: t.Object({ id: t.String() }),
    }
  )
  .post(
    "/merge",
    async ({ user, body }) => {
      if (!user) throw new Error("Authentication required to merge guest cart");
      const cart = await cartsService.mergeGuestCart(user.id, body.sessionId);
      return successResponse(cart, "Guest cart merged successfully");
    },
    {
      detail: {
        tags: ["Cart"],
        summary: "Merge Guest Cart to User Account",
        security: [{ bearerAuth: [] }],
      },
      body: t.Object({
        sessionId: t.String(),
      }),
    }
  );
