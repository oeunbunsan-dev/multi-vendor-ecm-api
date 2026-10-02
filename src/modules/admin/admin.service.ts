import { prisma } from "@/database/prisma";
import { NotFoundException } from "@/common/exceptions";
import { VendorStatus, Role, UserStatus, OrderStatus } from "@prisma/client";
import { parsePagination, buildPaginationMeta } from "@/common/utils/pagination";

export class AdminService {
  public async getDashboardStats() {
    const [totalOrders, totalRevenueResult, totalCustomers, totalVendors, totalProducts] =
      await Promise.all([
        prisma.order.count(),
        prisma.order.aggregate({
          where: { status: { in: ["CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED"] } },
          _sum: { totalAmount: true },
        }),
        prisma.user.count({ where: { role: "CUSTOMER" } }),
        prisma.vendor.count({ where: { status: "APPROVED" } }),
        prisma.product.count({ where: { isActive: true } }),
      ]);

    const totalRevenue = Number((totalRevenueResult._sum.totalAmount || 0).toFixed(2));

    const pendingVendors = await prisma.vendor.count({
      where: { status: "PENDING" },
    });

    const recentOrders = await prisma.order.findMany({
      take: 8,
      orderBy: { createdAt: "desc" },
      include: {
        customer: { select: { firstName: true, lastName: true, email: true } },
        store: { select: { name: true } },
      },
    });

    return {
      metrics: {
        totalOrders,
        totalRevenue,
        totalCustomers,
        totalVendors,
        totalProducts,
        pendingVendors,
      },
      recentOrders,
    };
  }

  public async getVendors(params: {
    status?: VendorStatus;
    page?: number;
    limit?: number;
    search?: string;
  }) {
    const { page, limit, skip } = parsePagination(params);

    const where: any = {
      ...(params.status && { status: params.status }),
      ...(params.search && {
        OR: [
          { companyName: { contains: params.search, mode: "insensitive" } },
          { user: { email: { contains: params.search, mode: "insensitive" } } },
        ],
      }),
    };

    const [items, total] = await Promise.all([
      prisma.vendor.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: { id: true, email: true, firstName: true, lastName: true, phone: true, status: true },
          },
          stores: {
            select: { id: true, name: true, slug: true, status: true },
          },
        },
      }),
      prisma.vendor.count({ where }),
    ]);

    const meta = buildPaginationMeta(total, page, limit);
    return { items, meta };
  }

  public async updateVendorStatus(
    vendorId: string,
    status: VendorStatus,
    rejectedReason?: string,
    commissionRate?: number
  ) {
    const vendor = await prisma.vendor.findUnique({ where: { id: vendorId } });
    if (!vendor) throw new NotFoundException("Vendor not found");

    const updated = await prisma.vendor.update({
      where: { id: vendorId },
      data: {
        status,
        rejectedReason: status === "REJECTED" ? rejectedReason : null,
        approvedAt: status === "APPROVED" ? new Date() : vendor.approvedAt,
        ...(commissionRate !== undefined && { commissionRate }),
      },
      include: { user: true },
    });

    // Notify vendor
    await prisma.notification.create({
      data: {
        userId: vendor.userId,
        title: `Vendor Application ${status}`,
        message:
          status === "APPROVED"
            ? "Congratulations! Your vendor account has been approved. You can now configure your store and add products."
            : `Your vendor account status has been changed to ${status}. ${rejectedReason ? `Reason: ${rejectedReason}` : ""}`,
        type: "VENDOR_APPROVED",
      },
    });

    return updated;
  }

  public async getUsers(params: {
    role?: Role;
    status?: UserStatus;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const { page, limit, skip } = parsePagination(params);

    const where: any = {
      ...(params.role && { role: params.role }),
      ...(params.status && { status: params.status }),
      ...(params.search && {
        OR: [
          { email: { contains: params.search, mode: "insensitive" } },
          { firstName: { contains: params.search, mode: "insensitive" } },
          { lastName: { contains: params.search, mode: "insensitive" } },
        ],
      }),
    };

    const [items, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          role: true,
          status: true,
          emailVerified: true,
          createdAt: true,
          lastLoginAt: true,
        },
      }),
      prisma.user.count({ where }),
    ]);

    const meta = buildPaginationMeta(total, page, limit);
    return { items, meta };
  }

  public async getOrders(params: {
    status?: OrderStatus;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const { page, limit, skip } = parsePagination(params);

    const where: any = {
      ...(params.status && { status: params.status }),
      ...(params.search && {
        OR: [
          { orderNumber: { contains: params.search, mode: "insensitive" } },
          { customer: { email: { contains: params.search, mode: "insensitive" } } },
        ],
      }),
    };

    const [items, total] = await Promise.all([
      prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          customer: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
          store: { select: { id: true, name: true } },
          payment: true,
          shipments: true,
        },
      }),
      prisma.order.count({ where }),
    ]);

    const meta = buildPaginationMeta(total, page, limit);
    return { items, meta };
  }
}

export const adminService = new AdminService();
