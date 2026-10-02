import { prisma } from "@/database/prisma";
import { NotFoundException, BadRequestException } from "@/common/exceptions";
import { PaymentMethod, PaymentStatus } from "@prisma/client";
import { config } from "@/config";

export class PaymentsService {
  public async initiatePayment(orderId: string, method: PaymentMethod) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { payment: true, customer: true },
    });

    if (!order) throw new NotFoundException("Order not found");

    if (order.payment && order.payment.status === "COMPLETED") {
      throw new BadRequestException("Order has already been paid");
    }

    const amount = Number(order.totalAmount);
    let checkoutData: Record<string, unknown> = {};

    switch (method) {
      case "COD":
        checkoutData = {
          message: "Payment will be collected in cash upon delivery",
          instructions: "Please prepare exact change for the courier",
        };
        break;

      case "ABA_PAYWAY":
        // Mock ABA Payway QR code & deeplink generation
        const qrString = `aba_payway://pay?tran_id=${order.orderNumber}&amount=${amount}&merchant_id=${config.payments.abaPaywayMerchantId}`;
        checkoutData = {
          gateway: "ABA_PAYWAY",
          qrString,
          qrImage: `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(qrString)}`,
          deeplink: qrString,
          amount,
          currency: "USD",
          transactionId: `ABA-${order.orderNumber}`,
        };
        break;

      case "STRIPE":
        // Mock Stripe client_secret and PaymentIntent
        checkoutData = {
          gateway: "STRIPE",
          clientSecret: `pi_mock_${order.orderNumber}_secret_${Math.random().toString(36).substring(7)}`,
          publishableKey: "pk_test_mock_stripe_key",
          amount: Math.round(amount * 100), // in cents
          currency: "usd",
        };
        break;

      case "PAYPAL":
        // Mock PayPal order creation
        checkoutData = {
          gateway: "PAYPAL",
          orderId: `PAYPAL-${order.orderNumber}`,
          approvalUrl: `https://www.sandbox.paypal.com/checkoutnow?token=EC-${order.orderNumber}`,
          amount,
          currency: "USD",
        };
        break;

      default:
        throw new BadRequestException(`Unsupported payment method: ${method}`);
    }

    // Upsert payment record
    const payment = await prisma.payment.upsert({
      where: { orderId },
      update: {
        method,
        status: "PENDING",
        amount,
        paymentGatewayData: checkoutData as any,
      },
      create: {
        orderId,
        method,
        status: "PENDING",
        amount,
        currency: "USD",
        paymentGatewayData: checkoutData as any,
      },
    });

    return {
      orderId: order.id,
      orderNumber: order.orderNumber,
      method,
      amount,
      paymentId: payment.id,
      checkoutData,
    };
  }

  public async handleWebhook(
    gateway: string,
    payload: Record<string, unknown>,
    _signature?: string
  ) {
    let orderNumber: string | undefined;
    let transactionId: string | undefined;
    let isSuccess = false;
    let failureReason: string | undefined;

    const normalizedGateway = gateway.toUpperCase();

    if (normalizedGateway === "STRIPE") {
      // Parse Stripe webhook event
      const eventType = payload.type as string;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const dataObj = (payload.data as any)?.object;

      if (eventType === "payment_intent.succeeded") {
        transactionId = dataObj?.id;
        orderNumber = dataObj?.metadata?.orderNumber;
        isSuccess = true;
      } else if (eventType === "payment_intent.payment_failed") {
        transactionId = dataObj?.id;
        orderNumber = dataObj?.metadata?.orderNumber;
        failureReason = dataObj?.last_payment_error?.message || "Payment failed";
      }
    } else if (normalizedGateway === "ABA_PAYWAY" || normalizedGateway === "ABA") {
      // Parse ABA Payway response
      transactionId = (payload.tran_id || payload.transactionId) as string;
      const status = payload.status;
      if (status === 0 || status === "0" || status === "SUCCESS") {
        isSuccess = true;
      } else {
        failureReason = (payload.description || "Transaction failed") as string;
      }
      orderNumber = (payload.orderNumber || payload.tran_id) as string;
    } else if (normalizedGateway === "PAYPAL") {
      const eventType = payload.event_type as string;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const resource = payload.resource as any;
      transactionId = resource?.id;
      orderNumber = resource?.custom_id || resource?.invoice_number;

      if (eventType === "CHECKOUT.ORDER.APPROVED" || eventType === "PAYMENT.CAPTURE.COMPLETED") {
        isSuccess = true;
      } else {
        failureReason = "Payment was not captured or failed";
      }
    }

    if (!orderNumber && transactionId) {
      orderNumber = transactionId.replace(/^(ABA-|PAYPAL-)/, "");
    }

    if (!orderNumber) {
      return { received: true, processed: false, reason: "No order identifier found in webhook payload" };
    }

    const order = await prisma.order.findFirst({
      where: {
        OR: [{ orderNumber }, { id: orderNumber }],
      },
      include: { payment: true },
    });

    if (!order) {
      return { received: true, processed: false, reason: "Order not found" };
    }

    const status: PaymentStatus = isSuccess ? "COMPLETED" : "FAILED";

    await prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { orderId: order.id },
        data: {
          status,
          transactionId: transactionId || order.payment?.transactionId,
          paidAt: isSuccess ? new Date() : null,
          failureReason: isSuccess ? null : failureReason,
          paymentGatewayData: payload as any,
        },
      });

      if (isSuccess) {
        await tx.order.update({
          where: { id: order.id },
          data: { status: "CONFIRMED" },
        });

        await tx.notification.create({
          data: {
            userId: order.customerId,
            title: "Payment Received",
            message: `Your payment of $${order.totalAmount} for order #${order.orderNumber} was confirmed.`,
            type: "PAYMENT_RECEIVED",
            metadata: { orderId: order.id, transactionId },
          },
        });
      }
    });

    return { received: true, processed: true, status };
  }

  public async getPaymentHistory(userId: string) {
    return prisma.payment.findMany({
      where: {
        order: { customerId: userId },
      },
      orderBy: { createdAt: "desc" },
      include: {
        order: {
          select: {
            orderNumber: true,
            status: true,
            createdAt: true,
          },
        },
      },
    });
  }
}

export const paymentsService = new PaymentsService();
