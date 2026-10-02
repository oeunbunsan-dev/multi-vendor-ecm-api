import { prisma } from "@/database/prisma";
import { NotFoundException, BadRequestException } from "@/common/exceptions";
import { CouponType } from "@prisma/client";

export class CouponsService {
  public async getCoupons(storeId?: string) {
    return prisma.coupon.findMany({
      where: {
        isActive: true,
        ...(storeId ? { OR: [{ storeId }, { storeId: null }] } : {}),
      },
      orderBy: { createdAt: "desc" },
    });
  }

  public async validateAndApplyCoupon(code: string, cartTotal: number, userId?: string, storeId?: string) {
    const coupon = await prisma.coupon.findUnique({
      where: { code: code.toUpperCase() },
    });

    if (!coupon || !coupon.isActive) {
      throw new NotFoundException("Coupon is invalid or inactive");
    }

    const now = new Date();
    if (coupon.startsAt > now) {
      throw new BadRequestException("Coupon is not yet active");
    }
    if (coupon.expiresAt && coupon.expiresAt < now) {
      throw new BadRequestException("Coupon has expired");
    }

    if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
      throw new BadRequestException("Coupon usage limit has been reached");
    }

    if (coupon.minOrderAmount && cartTotal < Number(coupon.minOrderAmount)) {
      throw new BadRequestException(
        `Minimum order amount of $${coupon.minOrderAmount} required to use this coupon`
      );
    }

    if (coupon.storeId && storeId && coupon.storeId !== storeId) {
      throw new BadRequestException("Coupon is not applicable for this store");
    }

    // Check user limit if userId provided
    if (userId && coupon.userLimit) {
      const userUsageCount = await prisma.order.count({
        where: { customerId: userId, couponId: coupon.id },
      });
      if (userUsageCount >= coupon.userLimit) {
        throw new BadRequestException("You have reached the maximum usage limit for this coupon");
      }
    }

    // Calculate discount
    let discount = 0;
    if (coupon.type === "PERCENTAGE") {
      discount = (cartTotal * Number(coupon.value)) / 100;
      if (coupon.maxDiscountAmount && discount > Number(coupon.maxDiscountAmount)) {
        discount = Number(coupon.maxDiscountAmount);
      }
    } else if (coupon.type === "FIXED_AMOUNT") {
      discount = Math.min(Number(coupon.value), cartTotal);
    } else if (coupon.type === "FREE_SHIPPING") {
      discount = 0; // free shipping handled in shipping fee calculation
    }

    return {
      couponId: coupon.id,
      code: coupon.code,
      type: coupon.type,
      discountAmount: Number(discount.toFixed(2)),
      isFreeShipping: coupon.type === "FREE_SHIPPING",
    };
  }

  public async createCoupon(data: {
    storeId?: string;
    code: string;
    description?: string;
    type: CouponType;
    value: number;
    minOrderAmount?: number;
    maxDiscountAmount?: number;
    usageLimit?: number;
    userLimit?: number;
    startsAt?: Date;
    expiresAt?: Date;
  }) {
    const existing = await prisma.coupon.findUnique({
      where: { code: data.code.toUpperCase() },
    });
    if (existing) throw new BadRequestException("Coupon code already exists");

    return prisma.coupon.create({
      data: {
        storeId: data.storeId,
        code: data.code.toUpperCase(),
        description: data.description,
        type: data.type,
        value: data.value,
        minOrderAmount: data.minOrderAmount,
        maxDiscountAmount: data.maxDiscountAmount,
        usageLimit: data.usageLimit,
        userLimit: data.userLimit || 1,
        startsAt: data.startsAt || new Date(),
        expiresAt: data.expiresAt,
      },
    });
  }
}

export const couponsService = new CouponsService();
