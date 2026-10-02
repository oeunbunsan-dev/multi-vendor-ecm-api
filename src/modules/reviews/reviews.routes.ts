import { Elysia, t } from "elysia";
import { reviewsService } from "./reviews.service";
import { authPlugin } from "@/common/plugins/auth.plugin";
import { successResponse } from "@/common/utils/response";
import { UnauthorizedException } from "@/common/exceptions";
import { RbacGuard } from "@/common/plugins/rbac.plugin";

export const reviewsRoutes = new Elysia({ prefix: "/reviews" })
  .use(authPlugin)
  .get(
    "/product/:productId",
    async ({ params, query }) => {
      const page = query.page ? parseInt(query.page) : 1;
      const limit = query.limit ? parseInt(query.limit) : 10;
      const result = await reviewsService.getProductReviews(params.productId, page, limit);
      return successResponse(result.items, undefined, result.meta);
    },
    {
      detail: {
        tags: ["Reviews"],
        summary: "Get Product Reviews",
      },
      params: t.Object({ productId: t.String() }),
      query: t.Object({
        page: t.Optional(t.String()),
        limit: t.Optional(t.String()),
      }),
    }
  )
  .post(
    "/",
    async ({ user, body }) => {
      if (!user) throw new UnauthorizedException("Authentication required to leave a review");
      const review = await reviewsService.createReview(user.id, body as any);
      return successResponse(review, "Review posted successfully");
    },
    {
      detail: {
        tags: ["Reviews"],
        summary: "Submit Product Review",
        security: [{ bearerAuth: [] }],
        description: "Submits review, verifies purchase history, and automatically recalculates product rating averages.",
      },
      body: t.Object({
        productId: t.String(),
        orderItemId: t.Optional(t.String()),
        rating: t.Number({ minimum: 1, maximum: 5 }),
        title: t.Optional(t.String()),
        comment: t.String({ minLength: 3 }),
      }),
    }
  )
  .post(
    "/:id/reply",
    async ({ user, params, body }) => {
      RbacGuard.ensureVendor(user);
      const updated = await reviewsService.respondToReview(params.id, user?.vendorId, body.response);
      return successResponse(updated, "Vendor reply submitted");
    },
    {
      detail: {
        tags: ["Reviews"],
        summary: "Vendor Reply to Review",
        security: [{ bearerAuth: [] }],
      },
      params: t.Object({ id: t.String() }),
      body: t.Object({
        response: t.String({ minLength: 1 }),
      }),
    }
  );
