import { Elysia, t } from "elysia";
import { storesService } from "./stores.service";
import { authPlugin } from "@/common/plugins/auth.plugin";
import { successResponse } from "@/common/utils/response";
import { UnauthorizedException, ForbiddenException } from "@/common/exceptions";

export const storesRoutes = new Elysia({ prefix: "/stores" })
  .use(authPlugin)
  .get(
    "/:slug",
    async ({ params }) => {
      const store = await storesService.getStoreBySlug(params.slug);
      return successResponse(store);
    },
    {
      detail: {
        tags: ["Stores"],
        summary: "Get Public Store Profile",
        description: "Returns public store details, banner, and logo by slug.",
      },
      params: t.Object({ slug: t.String() }),
    }
  )
  .get(
    "/my-stores",
    async ({ user }) => {
      if (!user) throw new UnauthorizedException("Authentication required");
      if (user.role !== "VENDOR" && user.role !== "ADMIN") {
        throw new ForbiddenException("Vendor access required");
      }
      if (!user.vendorId) throw new ForbiddenException("No vendor account found");

      const stores = await storesService.getStoresByVendor(user.vendorId);
      return successResponse(stores);
    },
    {
      detail: {
        tags: ["Stores"],
        summary: "Get Vendor Stores",
        security: [{ bearerAuth: [] }],
        description: "Lists all stores owned by the authenticated vendor.",
      },
    }
  )
  .post(
    "/",
    async ({ user, body }) => {
      if (!user) throw new UnauthorizedException("Authentication required");
      if (user.role !== "VENDOR" && user.role !== "ADMIN") {
        throw new ForbiddenException("Vendor access required");
      }
      if (!user.vendorId) throw new ForbiddenException("No vendor account found");

      const store = await storesService.createStore(user.vendorId, body as any);
      return successResponse(store, "Store created successfully");
    },
    {
      detail: {
        tags: ["Stores"],
        summary: "Create New Store",
        security: [{ bearerAuth: [] }],
        description: "Enables vendor to create an additional store.",
      },
      body: t.Object({
        name: t.String({ minLength: 2 }),
        description: t.Optional(t.String()),
        logo: t.Optional(t.String()),
        banner: t.Optional(t.String()),
        address: t.Optional(t.String()),
        phone: t.Optional(t.String()),
        email: t.Optional(t.String()),
        seoTitle: t.Optional(t.String()),
        seoDescription: t.Optional(t.String()),
        seoKeywords: t.Optional(t.String()),
      }),
    }
  )
  .put(
    "/:id",
    async ({ user, params, body }) => {
      if (!user) throw new UnauthorizedException("Authentication required");
      if (user.role !== "VENDOR" && user.role !== "ADMIN") {
        throw new ForbiddenException("Vendor access required");
      }
      if (!user.vendorId) throw new ForbiddenException("No vendor account found");

      const store = await storesService.updateStore(params.id, user.vendorId, body as any);
      return successResponse(store, "Store updated successfully");
    },
    {
      detail: {
        tags: ["Stores"],
        summary: "Update Store",
        security: [{ bearerAuth: [] }],
      },
      params: t.Object({ id: t.String() }),
      body: t.Object({
        name: t.Optional(t.String()),
        description: t.Optional(t.String()),
        logo: t.Optional(t.String()),
        banner: t.Optional(t.String()),
        status: t.Optional(t.Union([t.Literal("ACTIVE"), t.Literal("INACTIVE"), t.Literal("SUSPENDED")])),
        address: t.Optional(t.String()),
        phone: t.Optional(t.String()),
        email: t.Optional(t.String()),
        seoTitle: t.Optional(t.String()),
        seoDescription: t.Optional(t.String()),
        seoKeywords: t.Optional(t.String()),
      }),
    }
  );
