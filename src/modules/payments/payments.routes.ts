import { Elysia, t } from "elysia";
import { paymentsService } from "./payments.service";
import { authPlugin } from "@/common/plugins/auth.plugin";
import { successResponse } from "@/common/utils/response";
import { UnauthorizedException } from "@/common/exceptions";

export const paymentsRoutes = new Elysia({ prefix: "/payments" })
  .use(authPlugin)
  .post(
    "/checkout",
    async ({ user, body }) => {
      if (!user) throw new UnauthorizedException("Authentication required");
      const checkout = await paymentsService.initiatePayment(body.orderId, body.method as any);
      return successResponse(checkout, "Checkout initiated successfully");
    },
    {
      detail: {
        tags: ["Payments"],
        summary: "Initiate Order Payment / Checkout",
        security: [{ bearerAuth: [] }],
        description: "Generates ABA Payway QR code, Stripe clientSecret, or PayPal approval URL.",
      },
      body: t.Object({
        orderId: t.String(),
        method: t.Union([
          t.Literal("COD"),
          t.Literal("ABA_PAYWAY"),
          t.Literal("STRIPE"),
          t.Literal("PAYPAL"),
        ]),
      }),
    }
  )
  .post(
    "/webhook/:gateway",
    async ({ params, body, headers }) => {
      const signature = headers["stripe-signature"] || headers["x-aba-signature"] || undefined;
      const result = await paymentsService.handleWebhook(params.gateway, body as any, signature);
      return result;
    },
    {
      detail: {
        tags: ["Payments"],
        summary: "Payment Webhook Handler",
        description: "Receives payment event callbacks from Stripe, ABA Payway, or PayPal.",
      },
      params: t.Object({ gateway: t.String() }),
      body: t.Record(t.String(), t.Any()),
    }
  )
  .get(
    "/history",
    async ({ user }) => {
      if (!user) throw new UnauthorizedException("Authentication required");
      const history = await paymentsService.getPaymentHistory(user.id);
      return successResponse(history);
    },
    {
      detail: {
        tags: ["Payments"],
        summary: "Get Customer Payment History",
        security: [{ bearerAuth: [] }],
      },
    }
  );
