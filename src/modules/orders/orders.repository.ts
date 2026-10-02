import { prisma } from "@/database/prisma";
import { Order, OrderStatus, Prisma } from "@prisma/client";

export class OrdersRepository {
  public async findById(id: string): Promise<Order | null> {
    return prisma.order.findUnique({
      where: { id },
      include: {
        customer: {
          select: { id: true, firstName: true, lastName: true, email: true, phone: true },
        },
        store: { select: { id: true, name: true, slug: true } },
        items: {
          include: {
            product: { select: { id: true, name: true, slug: true } },
            variant: { select: { id: true, title: true } },
          },
        },
        payment: true,
        shipments: true,
        coupon: true,
      },
    });
  }

  public async findByOrderNumber(orderNumber: string): Promise<Order | null> {
    return prisma.order.findUnique({
      where: { orderNumber },
      include: {
        items: true,
        payment: true,
        shipments: true,
      },
    });
  }

  public async findByCustomerId(customerId: string, skip = 0, take = 10) {
    const [items, total] = await Promise.all([
      prisma.order.findMany({
        where: { customerId },
        skip,
        take,
        orderBy: { createdAt: "desc" },
        include: {
          items: true,
          payment: true,
          shipments: true,
        },
      }),
      prisma.order.count({ where: { customerId } }),
    ]);

    return { items, total };
  }

  public async findAll(params: {
    status?: OrderStatus;
    storeId?: string;
    skip?: number;
    take?: number;
  }) {
    const where: Prisma.OrderWhereInput = {
      ...(params.status && { status: params.status }),
      ...(params.storeId && { storeId: params.storeId }),
    };

    const [items, total] = await Promise.all([
      prisma.order.findMany({
        where,
        skip: params.skip,
        take: params.take,
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

    return { items, total };
  }
}

export const ordersRepository = new OrdersRepository();
