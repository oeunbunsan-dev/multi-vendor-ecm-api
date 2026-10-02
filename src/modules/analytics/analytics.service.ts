import { prisma } from "@/database/prisma";

export class AnalyticsService {
  public async getAdminAnalytics() {
    const [totalOrders, totalRevenueData, totalCustomers, totalVendors] = await Promise.all([
      prisma.order.count(),
      prisma.order.aggregate({
        where: {
          status: { in: ["CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED"] },
        },
        _sum: { totalAmount: true },
      }),
      prisma.user.count({ where: { role: "CUSTOMER" } }),
      prisma.vendor.count(),
    ]);

    const totalRevenue = Number((totalRevenueData._sum.totalAmount || 0).toFixed(2));

    // Recent orders
    const recentOrders = await prisma.order.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: {
        customer: { select: { firstName: true, lastName: true, email: true } },
        store: { select: { name: true } },
      },
    });

    // Top categories by products count
    const topCategories = await prisma.category.findMany({
      take: 5,
      orderBy: { products: { _count: "desc" } },
      select: {
        id: true,
        name: true,
        slug: true,
        _count: { select: { products: true } },
      },
    });

    // Top stores by sales
    const topStores = await prisma.store.findMany({
      take: 5,
      select: {
        id: true,
        name: true,
        slug: true,
        logo: true,
        _count: { select: { orders: true, products: true } },
      },
    });

    return {
      overview: {
        totalOrders,
        totalRevenue,
        totalCustomers,
        totalVendors,
      },
      recentOrders,
      topCategories,
      topStores,
    };
  }

  public async getVendorAnalytics(vendorId: string) {
    const stores = await prisma.store.findMany({
      where: { vendorId },
      select: { id: true, name: true },
    });
    const storeIds = stores.map((s) => s.id);

    const orderItems = await prisma.orderItem.findMany({
      where: { storeId: { in: storeIds } },
    });

    const revenue = orderItems.reduce((acc, item) => acc + Number(item.total), 0);
    const orderIds = new Set(orderItems.map((i) => i.orderId));

    const topProducts = await prisma.product.findMany({
      where: { storeId: { in: storeIds } },
      orderBy: { salesCount: "desc" },
      take: 5,
      select: {
        id: true,
        name: true,
        sku: true,
        salesCount: true,
        basePrice: true,
      },
    });

    const lowStockCount = await prisma.inventory.count({
      where: {
        product: { storeId: { in: storeIds } },
        quantity: { lte: 5 },
      },
    });

    return {
      revenue: Number(revenue.toFixed(2)),
      ordersCount: orderIds.size,
      topProducts,
      inventoryAlerts: {
        lowStockCount,
      },
    };
  }
}

export const analyticsService = new AnalyticsService();
