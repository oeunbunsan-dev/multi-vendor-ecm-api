import { prisma } from "@/database/prisma";
import { ordersRepository, OrdersRepository } from "./orders.repository";
import { couponsService } from "../coupons/coupons.service";
import { NotFoundException, BadRequestException, ForbiddenException } from "@/common/exceptions";
import { generateOrderNumber } from "@/common/utils/slug";
import { parsePagination, buildPaginationMeta } from "@/common/utils/pagination";
import { OrderStatus, PaymentMethod } from "@prisma/client";

export interface CreateOrderDTO {
  customerId: string;
  items: Array<{
    productId: string;
    variantId?: string;
    quantity: number;
  }>;
  shippingAddress: {
    firstName: string;
    lastName: string;
    phone: string;
    street: string;
    city: string;
    state?: string;
    postalCode: string;
    country: string;
  };
  billingAddress?: {
    firstName: string;
    lastName: string;
    phone: string;
    street: string;
    city: string;
    state?: string;
    postalCode: string;
    country: string;
  };
  paymentMethod: PaymentMethod;
  couponCode?: string;
  notes?: string;
  cartIdToClear?: string;
}

export class OrdersService {
  constructor(private readonly repo: OrdersRepository = ordersRepository) {}

  public async createOrder(dto: CreateOrderDTO) {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException("Order must have at least one item");
    }

    // Execute order creation inside a serializable/isolated transaction
    const order = await prisma.$transaction(async (tx) => {
      let subtotal = 0;
      const orderItemsData: Array<{
        storeId: string;
        productId: string;
        variantId?: string;
        sku: string;
        productName: string;
        variantTitle?: string;
        unitPrice: number;
        quantity: number;
        subtotal: number;
        discount: number;
        total: number;
        inventoryId: string;
      }> = [];

      let primaryStoreId: string | null = null;

      // 1. Verify stock and calculate item prices
      for (const item of dto.items) {
        const product = await tx.product.findUnique({
          where: { id: item.productId },
          include: { variants: true, store: true },
        });

        if (!product || !product.isActive || product.status !== "PUBLISHED") {
          throw new BadRequestException(`Product '${product?.name || item.productId}' is not available for purchase`);
        }

        if (!primaryStoreId) {
          primaryStoreId = product.storeId;
        }

        let unitPrice = Number(product.basePrice);
        let sku = product.sku;
        let variantTitle: string | undefined = undefined;

        if (item.variantId) {
          const variant = product.variants.find((v) => v.id === item.variantId);
          if (!variant) throw new NotFoundException(`Variant not found for product '${product.name}'`);
          unitPrice = Number(variant.price);
          sku = variant.sku;
          variantTitle = variant.title;
        }

        // Lock & check inventory
        const inventory = await tx.inventory.findFirst({
          where: {
            productId: item.productId,
            variantId: item.variantId || null,
          },
        });

        if (!inventory || inventory.quantity < item.quantity) {
          throw new BadRequestException(
            `Insufficient stock for '${product.name}' (SKU: ${sku}). Only ${inventory?.quantity || 0} remaining.`
          );
        }

        const itemSubtotal = unitPrice * item.quantity;
        subtotal += itemSubtotal;

        orderItemsData.push({
          storeId: product.storeId,
          productId: product.id,
          variantId: item.variantId,
          sku,
          productName: product.name,
          variantTitle,
          unitPrice,
          quantity: item.quantity,
          subtotal: itemSubtotal,
          discount: 0,
          total: itemSubtotal,
          inventoryId: inventory.id,
        });
      }

      // 2. Validate coupon if provided
      let discountTotal = 0;
      let couponId: string | null = null;
      let freeShipping = false;

      if (dto.couponCode) {
        const couponResult = await couponsService.validateAndApplyCoupon(
          dto.couponCode,
          subtotal,
          dto.customerId,
          primaryStoreId || undefined
        );
        discountTotal = couponResult.discountAmount;
        couponId = couponResult.couponId;
        freeShipping = couponResult.isFreeShipping;

        // Increment coupon usage count
        await tx.coupon.update({
          where: { id: couponResult.couponId },
          data: { usageCount: { increment: 1 } },
        });
      }

      // 3. Calculate shipping & tax
      let shippingTotal = subtotal >= 50 || freeShipping ? 0 : 3.5;
      const taxTotal = Number((subtotal * 0.05).toFixed(2)); // 5% standard tax
      const totalAmount = Number((subtotal - discountTotal + shippingTotal + taxTotal).toFixed(2));

      const orderNumber = generateOrderNumber();

      // 4. Create Order
      const newOrder = await tx.order.create({
        data: {
          orderNumber,
          customerId: dto.customerId,
          storeId: primaryStoreId,
          status: "PENDING",
          subtotal,
          discountTotal,
          shippingTotal,
          taxTotal,
          totalAmount,
          shippingAddress: dto.shippingAddress,
          billingAddress: dto.billingAddress || dto.shippingAddress,
          notes: dto.notes,
          couponId,
          items: {
            create: orderItemsData.map((d) => ({
              storeId: d.storeId,
              productId: d.productId,
              variantId: d.variantId,
              sku: d.sku,
              productName: d.productName,
              variantTitle: d.variantTitle,
              unitPrice: d.unitPrice,
              quantity: d.quantity,
              subtotal: d.subtotal,
              discount: d.discount,
              total: d.total,
            })),
          },
        },
      });

      // 5. Decrement inventory and record stock movements
      for (const item of orderItemsData) {
        await tx.inventory.update({
          where: { id: item.inventoryId },
          data: { quantity: { decrement: item.quantity } },
        });

        await tx.inventoryHistory.create({
          data: {
            inventoryId: item.inventoryId,
            type: "OUT",
            quantity: item.quantity,
            reason: `Order placed #${orderNumber}`,
            referenceId: newOrder.id,
            createdByUserId: dto.customerId,
          },
        });

        // Increment product sales count
        await tx.product.update({
          where: { id: item.productId },
          data: { salesCount: { increment: item.quantity } },
        });
      }

      // 6. Create initial Payment record
      await tx.payment.create({
        data: {
          orderId: newOrder.id,
          method: dto.paymentMethod,
          status: "PENDING",
          amount: totalAmount,
          currency: "USD",
        },
      });

      // 7. Create initial Shipment record
      await tx.shipment.create({
        data: {
          orderId: newOrder.id,
          storeId: primaryStoreId,
          carrier: "Standard Ground Delivery",
          trackingNumber: `TRK-${generateOrderNumber().replace("ORD-", "")}`,
          status: "PENDING",
          shippingFee: shippingTotal,
        },
      });

      // 8. Clear Cart if ordered from cart
      if (dto.cartIdToClear) {
        await tx.cartItem.deleteMany({
          where: { cartId: dto.cartIdToClear },
        });
      }

      // 9. Send Notification to customer
      await tx.notification.create({
        data: {
          userId: dto.customerId,
          title: "Order Placed Successfully",
          message: `Your order #${orderNumber} for $${totalAmount} has been received.`,
          type: "ORDER_PLACED",
          metadata: { orderId: newOrder.id, orderNumber },
        },
      });

      return newOrder;
    });

    return this.repo.findById(order.id);
  }

  public async getCustomerOrders(customerId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const { items, total } = await this.repo.findByCustomerId(customerId, skip, limit);
    const meta = buildPaginationMeta(total, page, limit);
    return { items, meta };
  }

  public async getOrderById(orderId: string, userId?: string, userRole?: string) {
    const order = await this.repo.findById(orderId);
    if (!order) throw new NotFoundException("Order not found");

    if (userRole !== "ADMIN" && userId && order.customerId !== userId) {
      throw new ForbiddenException("You do not have permission to view this order");
    }

    return order;
  }

  public async cancelOrder(orderId: string, userId: string, reason?: string) {
    const order = await this.repo.findById(orderId);
    if (!order) throw new NotFoundException("Order not found");

    if (order.customerId !== userId) {
      throw new ForbiddenException("You cannot cancel another user's order");
    }

    if (order.status !== "PENDING" && order.status !== "CONFIRMED") {
      throw new BadRequestException(`Cannot cancel order in '${order.status}' status`);
    }

    // Restore inventory in transaction
    await prisma.$transaction(async (tx) => {
      // Find order items
      const items = await tx.orderItem.findMany({ where: { orderId } });

      for (const item of items) {
        const inventory = await tx.inventory.findFirst({
          where: {
            productId: item.productId,
            variantId: item.variantId || null,
          },
        });

        if (inventory) {
          await tx.inventory.update({
            where: { id: inventory.id },
            data: { quantity: { increment: item.quantity } },
          });

          await tx.inventoryHistory.create({
            data: {
              inventoryId: inventory.id,
              type: "RETURN",
              quantity: item.quantity,
              reason: `Order cancelled #${order.orderNumber}. Reason: ${reason || "Customer request"}`,
              referenceId: order.id,
              createdByUserId: userId,
            },
          });
        }
      }

      await tx.order.update({
        where: { id: orderId },
        data: { status: "CANCELLED" },
      });

      await tx.payment.updateMany({
        where: { orderId },
        data: { status: "FAILED", failureReason: "Order cancelled by customer" },
      });
    });

    return { message: "Order cancelled and stock restored successfully" };
  }

  public async updateOrderStatus(orderId: string, status: OrderStatus) {
    const order = await this.repo.findById(orderId);
    if (!order) throw new NotFoundException("Order not found");

    const updated = await prisma.order.update({
      where: { id: orderId },
      data: { status },
    });

    // Notify customer of status change
    await prisma.notification.create({
      data: {
        userId: order.customerId,
        title: "Order Status Updated",
        message: `Your order #${order.orderNumber} status changed to ${status}`,
        type: "ORDER_STATUS_CHANGED",
        metadata: { orderId, status },
      },
    });

    return updated;
  }

  public async getAllOrders(page = 1, limit = 10, status?: OrderStatus, storeId?: string) {
    const skip = (page - 1) * limit;
    const { items, total } = await this.repo.findAll({ status, storeId, skip, take: limit });
    const meta = buildPaginationMeta(total, page, limit);
    return { items, meta };
  }
}

export const ordersService = new OrdersService();
