import { Elysia, t } from "elysia";
import { categoriesService } from "./categories.service";
import { authPlugin } from "@/common/plugins/auth.plugin";
import { successResponse } from "@/common/utils/response";
import { RbacGuard } from "@/common/plugins/rbac.plugin";

export const categoriesRoutes = new Elysia({ prefix: "/categories" })
  .use(authPlugin)
  .get(
    "/",
    async () => {
      const tree = await categoriesService.getCategoryTree();
      return successResponse(tree);
    },
    {
      detail: {
        tags: ["Categories"],
        summary: "Get Category Hierarchy Tree",
        description: "Returns nested tree of all active categories.",
      },
    }
  )
  .get(
    "/:slug",
    async ({ params }) => {
      const category = await categoriesService.getCategoryBySlug(params.slug);
      return successResponse(category);
    },
    {
      detail: {
        tags: ["Categories"],
        summary: "Get Category by Slug",
        description: "Returns category details along with children and parent.",
      },
      params: t.Object({ slug: t.String() }),
    }
  )
  .post(
    "/",
    async ({ user, body }) => {
      RbacGuard.ensureAdmin(user);
      const category = await categoriesService.createCategory(body as any);
      return successResponse(category, "Category created successfully");
    },
    {
      detail: {
        tags: ["Categories"],
        summary: "Create Category (Admin)",
        security: [{ bearerAuth: [] }],
      },
      body: t.Object({
        name: t.String({ minLength: 2 }),
        parentId: t.Optional(t.String()),
        description: t.Optional(t.String()),
        image: t.Optional(t.String()),
        seoTitle: t.Optional(t.String()),
        seoDescription: t.Optional(t.String()),
      }),
    }
  )
  .put(
    "/:id",
    async ({ user, params, body }) => {
      RbacGuard.ensureAdmin(user);
      const category = await categoriesService.updateCategory(params.id, body as any);
      return successResponse(category, "Category updated successfully");
    },
    {
      detail: {
        tags: ["Categories"],
        summary: "Update Category (Admin)",
        security: [{ bearerAuth: [] }],
      },
      params: t.Object({ id: t.String() }),
      body: t.Object({
        name: t.Optional(t.String()),
        parentId: t.Optional(t.Nullable(t.String())),
        description: t.Optional(t.String()),
        image: t.Optional(t.String()),
        isActive: t.Optional(t.Boolean()),
        seoTitle: t.Optional(t.String()),
        seoDescription: t.Optional(t.String()),
      }),
    }
  )
  .delete(
    "/:id",
    async ({ user, params }) => {
      RbacGuard.ensureAdmin(user);
      const result = await categoriesService.deleteCategory(params.id);
      return successResponse(result);
    },
    {
      detail: {
        tags: ["Categories"],
        summary: "Delete Category (Admin)",
        security: [{ bearerAuth: [] }],
      },
      params: t.Object({ id: t.String() }),
    }
  );
