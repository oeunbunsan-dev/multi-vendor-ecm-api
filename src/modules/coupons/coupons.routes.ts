import { Elysia, t } from "elysia";
import { couponsService } from "./coupons.service";
import { authPlugin } from "@/common/plugins/auth.plugin";
import { successResponse } from "@/common/utils/response";
import { RbacGuard } from "@/common/plugins/rbac.plugin";

export const couponsRoutes = new Elysia({ prefix: "/coupons" })
  .use(authPlugin)
  .get(
    "/",
    async ({ query }) => {
      const coupons = await couponsService.getCoupons(query.storeId);
      return successResponse(coupons);
    },
    {
      detail: {
        tags: ["Coupons"],
        summary: "Get Available Coupons",
      },
      query: t.Object({
        storeId: t.Optional(t.String()),
      }),
    }
  )
  .post(
    "/apply",
    async ({ user, body }) => {
      const result = await couponsService.validateAndApplyCoupon(
        body.code,
        body.cartTotal,
        user?.id,
        body.storeId
      );
      return successResponse(result, "Coupon applied successfully");
    },
    {
      detail: {
        tags: ["Coupons"],
        summary: "Validate & Apply Coupon",
        description: "Checks coupon code validity against cart total and calculates discount amount.",
      },
      body: t.Object({
        code: t.String(),
        cartTotal: t.Number({ minimum: 0 }),
        storeId: t.Optional(t.String()),
      }),
    }
  )
  .post(
    "/",
    async ({ user, body }) => {
      RbacGuard.ensureVendor(user);
      const coupon = await couponsService.createCoupon({
        ...body,
        storeId: user?.role === "VENDOR" ? user.storeIds?.[0] : body.storeId,
        startsAt: body.startsAt ? new Date(body.startsAt) : undefined,
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
      } as any);
      return successResponse(coupon, "Coupon created successfully");
    },
    {
      detail: {
        tags: ["Coupons"],
        summary: "Create Coupon (Vendor/Admin)",
        security: [{ bearerAuth: [] }],
      },
      body: t.Object({
        code: t.String({ minLength: 3 }),
        description: t.Optional(t.String()),
        type: t.Union([t.Literal("PERCENTAGE"), t.Literal("FIXED_AMOUNT"), t.Literal("FREE_SHIPPING")]),
        value: t.Number({ minimum: 0 }),
        minOrderAmount: t.Optional(t.Number()),
        maxDiscountAmount: t.Optional(t.Number()),
        usageLimit: t.Optional(t.Number()),
        userLimit: t.Optional(t.Number()),
        startsAt: t.Optional(t.String()),
        expiresAt: t.Optional(t.String()),
        storeId: t.Optional(t.String()),
      }),
    }
  );
