import { Elysia, t } from "elysia";
import { wishlistService } from "./wishlist.service";
import { authPlugin } from "@/common/plugins/auth.plugin";
import { successResponse } from "@/common/utils/response";
import { UnauthorizedException } from "@/common/exceptions";

export const wishlistRoutes = new Elysia({ prefix: "/wishlist" })
  .use(authPlugin)
  .get(
    "/",
    async ({ user }) => {
      if (!user) throw new UnauthorizedException("Authentication required");
      const list = await wishlistService.getWishlist(user.id);
      return successResponse(list);
    },
    {
      detail: {
        tags: ["Wishlist"],
        summary: "Get Customer Wishlist",
        security: [{ bearerAuth: [] }],
      },
    }
  )
  .post(
    "/",
    async ({ user, body }) => {
      if (!user) throw new UnauthorizedException("Authentication required");
      const item = await wishlistService.addToWishlist(user.id, body.productId);
      return successResponse(item, "Added to wishlist");
    },
    {
      detail: {
        tags: ["Wishlist"],
        summary: "Add Product to Wishlist",
        security: [{ bearerAuth: [] }],
      },
      body: t.Object({
        productId: t.String(),
      }),
    }
  )
  .delete(
    "/:productId",
    async ({ user, params }) => {
      if (!user) throw new UnauthorizedException("Authentication required");
      const result = await wishlistService.removeFromWishlist(user.id, params.productId);
      return successResponse(result);
    },
    {
      detail: {
        tags: ["Wishlist"],
        summary: "Remove Product from Wishlist",
        security: [{ bearerAuth: [] }],
      },
      params: t.Object({ productId: t.String() }),
    }
  )
  .post(
    "/move-to-cart",
    async ({ user, body }) => {
      if (!user) throw new UnauthorizedException("Authentication required");
      const result = await wishlistService.moveToCart(user.id, body.productId, body.variantId);
      return successResponse(result);
    },
    {
      detail: {
        tags: ["Wishlist"],
        summary: "Move Wishlist Item to Cart",
        security: [{ bearerAuth: [] }],
      },
      body: t.Object({
        productId: t.String(),
        variantId: t.Optional(t.String()),
      }),
    }
  );
