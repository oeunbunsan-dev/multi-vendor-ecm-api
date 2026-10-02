import { Elysia, t } from "elysia";
import { productsService } from "./products.service";
import { authPlugin } from "@/common/plugins/auth.plugin";
import { successResponse } from "@/common/utils/response";
import { UnauthorizedException, ForbiddenException } from "@/common/exceptions";

// Public Products Routes
export const productsRoutes = new Elysia({ prefix: "/products" })
  .get(
    "/",
    async ({ query }) => {
      const result = await productsService.getProducts(
        {
          search: query.search,
          categoryId: query.categoryId,
          brandId: query.brandId,
          storeId: query.storeId,
          minPrice: query.minPrice ? parseFloat(query.minPrice) : undefined,
          maxPrice: query.maxPrice ? parseFloat(query.maxPrice) : undefined,
          minRating: query.minRating ? parseFloat(query.minRating) : undefined,
          isFeatured: query.isFeatured === "true" ? true : undefined,
          status: query.status as any,
          tags: query.tags ? query.tags.split(",") : undefined,
        },
        {
          page: query.page ? parseInt(query.page) : 1,
          limit: query.limit ? parseInt(query.limit) : 10,
          sortBy: query.sortBy,
          sortOrder: query.sortOrder as any,
          cursor: query.cursor,
        }
      );
      return successResponse(result.items, undefined, result.meta);
    },
    {
      detail: {
        tags: ["Products"],
        summary: "Search & Filter Products",
        description:
          "Full text search and filters by category, price, brand, rating with sorting and pagination.",
      },
      query: t.Object({
        search: t.Optional(t.String()),
        categoryId: t.Optional(t.String()),
        brandId: t.Optional(t.String()),
        storeId: t.Optional(t.String()),
        minPrice: t.Optional(t.String()),
        maxPrice: t.Optional(t.String()),
        minRating: t.Optional(t.String()),
        isFeatured: t.Optional(t.String()),
        status: t.Optional(t.String()),
        tags: t.Optional(t.String()),
        page: t.Optional(t.String()),
        limit: t.Optional(t.String()),
        sortBy: t.Optional(t.String()),
        sortOrder: t.Optional(t.String()),
        cursor: t.Optional(t.String()),
      }),
    }
  )
  .get(
    "/featured",
    async () => {
      const items = await productsService.getFeaturedProducts();
      return successResponse(items);
    },
    {
      detail: {
        tags: ["Products"],
        summary: "Get Featured Products",
        description: "Returns cached list of featured products.",
      },
    }
  )
  .get(
    "/:slug",
    async ({ params }) => {
      const product = await productsService.getProductBySlug(params.slug);
      return successResponse(product);
    },
    {
      detail: {
        tags: ["Products"],
        summary: "Get Product by Slug",
        description: "Retrieves complete product details, variants, images, inventory, and reviews.",
      },
      params: t.Object({ slug: t.String() }),
    }
  )
  .get(
    "/:slug/related",
    async ({ params, query }) => {
      const limit = query.limit ? parseInt(query.limit) : 6;
      const related = await productsService.getRelatedProducts(params.slug, limit);
      return successResponse(related);
    },
    {
      detail: {
        tags: ["Products"],
        summary: "Get Related Products",
        description: "Returns related products based on category and brand.",
      },
      params: t.Object({ slug: t.String() }),
      query: t.Object({ limit: t.Optional(t.String()) }),
    }
  );

// Vendor Product Management Routes
export const vendorProductsRoutes = new Elysia({ prefix: "/vendor/products" })
  .use(authPlugin)
  .get(
    "/",
    async ({ user, query }) => {
      if (!user) throw new UnauthorizedException("Authentication required");
      if (user.role !== "VENDOR" && user.role !== "ADMIN") {
        throw new ForbiddenException("Vendor access required");
      }

      const result = await productsService.getProducts(
        {
          search: query.search,
          categoryId: query.categoryId,
          storeId: query.storeId,
          status: query.status as any,
        },
        {
          page: query.page ? parseInt(query.page) : 1,
          limit: query.limit ? parseInt(query.limit) : 10,
          sortBy: query.sortBy,
          sortOrder: query.sortOrder as any,
        }
      );
      return successResponse(result.items, undefined, result.meta);
    },
    {
      detail: {
        tags: ["Vendors"],
        summary: "List Vendor Products",
        security: [{ bearerAuth: [] }],
      },
      query: t.Object({
        search: t.Optional(t.String()),
        categoryId: t.Optional(t.String()),
        storeId: t.Optional(t.String()),
        status: t.Optional(t.String()),
        page: t.Optional(t.String()),
        limit: t.Optional(t.String()),
        sortBy: t.Optional(t.String()),
        sortOrder: t.Optional(t.String()),
      }),
    }
  )
  .post(
    "/",
    async ({ user, body }) => {
      if (!user) throw new UnauthorizedException("Authentication required");
      if (user.role !== "VENDOR" && user.role !== "ADMIN") {
        throw new ForbiddenException("Vendor access required");
      }

      const product = await productsService.createProduct(user.vendorId, body as any);
      return successResponse(product, "Product created successfully");
    },
    {
      detail: {
        tags: ["Vendors"],
        summary: "Create Vendor Product",
        security: [{ bearerAuth: [] }],
        description: "Creates product with optional variants, gallery images, and initial stock.",
      },
      body: t.Object({
        storeId: t.String(),
        categoryId: t.String(),
        brandId: t.Optional(t.String()),
        name: t.String({ minLength: 2 }),
        description: t.String({ minLength: 5 }),
        shortDescription: t.Optional(t.String()),
        sku: t.Optional(t.String()),
        basePrice: t.Number({ minimum: 0 }),
        comparePrice: t.Optional(t.Number({ minimum: 0 })),
        costPrice: t.Optional(t.Number({ minimum: 0 })),
        isFeatured: t.Optional(t.Boolean()),
        tags: t.Optional(t.Array(t.String())),
        status: t.Optional(
          t.Union([
            t.Literal("DRAFT"),
            t.Literal("PUBLISHED"),
            t.Literal("ARCHIVED"),
            t.Literal("OUT_OF_STOCK"),
          ])
        ),
        initialStock: t.Optional(t.Number({ minimum: 0 })),
        images: t.Optional(
          t.Array(
            t.Object({
              url: t.String(),
              altText: t.Optional(t.String()),
              isCover: t.Optional(t.Boolean()),
              sortOrder: t.Optional(t.Number()),
            })
          )
        ),
        variants: t.Optional(
          t.Array(
            t.Object({
              sku: t.Optional(t.String()),
              title: t.String(),
              price: t.Number({ minimum: 0 }),
              comparePrice: t.Optional(t.Number({ minimum: 0 })),
              attributes: t.Optional(t.Record(t.String(), t.Any())),
              barcode: t.Optional(t.String()),
              image: t.Optional(t.String()),
              initialStock: t.Optional(t.Number({ minimum: 0 })),
            })
          )
        ),
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

      const product = await productsService.updateProduct(params.id, user.vendorId, body as any);
      return successResponse(product, "Product updated successfully");
    },
    {
      detail: {
        tags: ["Vendors"],
        summary: "Update Vendor Product",
        security: [{ bearerAuth: [] }],
      },
      params: t.Object({ id: t.String() }),
      body: t.Object({
        name: t.Optional(t.String()),
        description: t.Optional(t.String()),
        shortDescription: t.Optional(t.String()),
        basePrice: t.Optional(t.Number()),
        comparePrice: t.Optional(t.Number()),
        costPrice: t.Optional(t.Number()),
        isFeatured: t.Optional(t.Boolean()),
        tags: t.Optional(t.Array(t.String())),
        status: t.Optional(
          t.Union([
            t.Literal("DRAFT"),
            t.Literal("PUBLISHED"),
            t.Literal("ARCHIVED"),
            t.Literal("OUT_OF_STOCK"),
          ])
        ),
        brandId: t.Optional(t.String()),
        categoryId: t.Optional(t.String()),
      }),
    }
  )
  .delete(
    "/:id",
    async ({ user, params }) => {
      if (!user) throw new UnauthorizedException("Authentication required");
      if (user.role !== "VENDOR" && user.role !== "ADMIN") {
        throw new ForbiddenException("Vendor access required");
      }

      const result = await productsService.deleteProduct(params.id, user.vendorId);
      return successResponse(result);
    },
    {
      detail: {
        tags: ["Vendors"],
        summary: "Delete Vendor Product",
        security: [{ bearerAuth: [] }],
      },
      params: t.Object({ id: t.String() }),
    }
  );
