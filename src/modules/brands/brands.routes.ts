import { Elysia, t } from "elysia";
import { brandsService } from "./brands.service";
import { authPlugin } from "@/common/plugins/auth.plugin";
import { successResponse } from "@/common/utils/response";
import { RbacGuard } from "@/common/plugins/rbac.plugin";

export const brandsRoutes = new Elysia({ prefix: "/brands" })
  .use(authPlugin)
  .get(
    "/",
    async () => {
      const brands = await brandsService.getBrands();
      return successResponse(brands);
    },
    {
      detail: {
        tags: ["Brands"],
        summary: "Get All Active Brands",
        description: "Returns list of active brands with product counts.",
      },
    }
  )
  .get(
    "/:slug",
    async ({ params }) => {
      const brand = await brandsService.getBrandBySlug(params.slug);
      return successResponse(brand);
    },
    {
      detail: {
        tags: ["Brands"],
        summary: "Get Brand by Slug",
      },
      params: t.Object({ slug: t.String() }),
    }
  )
  .post(
    "/",
    async ({ user, body }) => {
      RbacGuard.ensureAdmin(user);
      const brand = await brandsService.createBrand(body as any);
      return successResponse(brand, "Brand created successfully");
    },
    {
      detail: {
        tags: ["Brands"],
        summary: "Create Brand (Admin)",
        security: [{ bearerAuth: [] }],
      },
      body: t.Object({
        name: t.String({ minLength: 1 }),
        description: t.Optional(t.String()),
        logo: t.Optional(t.String()),
        website: t.Optional(t.String()),
      }),
    }
  )
  .put(
    "/:id",
    async ({ user, params, body }) => {
      RbacGuard.ensureAdmin(user);
      const brand = await brandsService.updateBrand(params.id, body as any);
      return successResponse(brand, "Brand updated successfully");
    },
    {
      detail: {
        tags: ["Brands"],
        summary: "Update Brand (Admin)",
        security: [{ bearerAuth: [] }],
      },
      params: t.Object({ id: t.String() }),
      body: t.Object({
        name: t.Optional(t.String()),
        description: t.Optional(t.String()),
        logo: t.Optional(t.String()),
        website: t.Optional(t.String()),
        isActive: t.Optional(t.Boolean()),
      }),
    }
  )
  .delete(
    "/:id",
    async ({ user, params }) => {
      RbacGuard.ensureAdmin(user);
      const result = await brandsService.deleteBrand(params.id);
      return successResponse(result);
    },
    {
      detail: {
        tags: ["Brands"],
        summary: "Delete Brand (Admin)",
        security: [{ bearerAuth: [] }],
      },
      params: t.Object({ id: t.String() }),
    }
  );
