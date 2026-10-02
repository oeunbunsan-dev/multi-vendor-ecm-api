import { prisma } from "@/database/prisma";
import { NotFoundException, ForbiddenException } from "@/common/exceptions";
import { VendorStatus } from "@prisma/client";

export class VendorsService {
  public async getVendorProfile(userId: string) {
    const vendor = await prisma.vendor.findUnique({
      where: { userId },
      include: {
        stores: true,
        user: {
          select: {
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
      },
    });
    if (!vendor) throw new NotFoundException("Vendor profile not found");
    return vendor;
  }

  public async getVendorDashboard(vendorId: string) {
    // Stores owned by vendor
    const stores = await prisma.store.findMany({
      where: { vendorId },
      select: { id: true, name: true },
    });
    const storeIds = stores.map((s) => s.id);

    // 1. Order items for this vendor's stores
    const orderItems = await prisma.orderItem.findMany({
      where: { storeId: { in: storeIds } },
      include: {
        order: { select: { status: true, createdAt: true } },
      },
    });

    const totalOrdersCount = new Set(orderItems.map((item) => item.orderId)).size;
    const totalRevenue = orderItems.reduce((acc, item) => acc + Number(item.total), 0);

    // 2. Total active products
    const totalProducts = await prisma.product.count({
      where: { storeId: { in: storeIds } },
    });

    // 3. Top selling products
    const topProducts = await prisma.product.findMany({
      where: { storeId: { in: storeIds } },
      orderBy: { salesCount: "desc" },
      take: 5,
      select: {
        id: true,
        name: true,
        slug: true,
        basePrice: true,
        salesCount: true,
        images: { take: 1, select: { url: true } },
      },
    });

    // 4. Low stock count
    const lowStockInventories = await prisma.inventory.findMany({
      where: {
        product: { storeId: { in: storeIds } },
        quantity: { lte: 5 },
      },
      include: {
        product: { select: { id: true, name: true, sku: true } },
      },
      take: 10,
    });

    return {
      overview: {
        totalRevenue: Number(totalRevenue.toFixed(2)),
        totalOrders: totalOrdersCount,
        totalProducts,
        lowStockAlertsCount: lowStockInventories.length,
      },
      stores,
      topProducts,
      lowStockInventories: lowStockInventories.map((inv) => ({
        id: inv.id,
        productId: inv.productId,
        productName: inv.product.name,
        sku: inv.sku,
        quantity: inv.quantity,
        reorderThreshold: inv.reorderThreshold,
      })),
    };
  }

  public async getVendorOrders(vendorId: string, page = 1, limit = 10) {
    const stores = await prisma.store.findMany({
      where: { vendorId },
      select: { id: true },
    });
    const storeIds = stores.map((s) => s.id);

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      prisma.orderItem.findMany({
        where: { storeId: { in: storeIds } },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          order: {
            select: {
              id: true,
              orderNumber: true,
              status: true,
              createdAt: true,
              shippingAddress: true,
              customer: {
                select: {
                  firstName: true,
                  lastName: true,
                  email: true,
                },
              },
            },
          },
          store: { select: { id: true, name: true } },
        },
      }),
      prisma.orderItem.count({
        where: { storeId: { in: storeIds } },
      }),
    ]);

    return {
      items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  // Admin approval workflow
  public async updateVendorStatus(
    vendorId: string,
    status: VendorStatus,
    rejectedReason?: string,
    commissionRate?: number
  ) {
    const vendor = await prisma.vendor.findUnique({ where: { id: vendorId } });
    if (!vendor) throw new NotFoundException("Vendor not found");

    return prisma.vendor.update({
      where: { id: vendorId },
      data: {
        status,
        rejectedReason: status === "REJECTED" ? rejectedReason : null,
        approvedAt: status === "APPROVED" ? new Date() : vendor.approvedAt,
        ...(commissionRate !== undefined && { commissionRate }),
      },
    });
  }
}

export const vendorsService = new VendorsService();
