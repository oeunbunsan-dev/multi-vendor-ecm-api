import { prisma } from "@/database/prisma";
import { NotFoundException, BadRequestException, ForbiddenException } from "@/common/exceptions";
import { StockMovementType } from "@prisma/client";

export class InventoryService {
  public async getVendorInventory(vendorId: string, page = 1, limit = 20) {
    const stores = await prisma.store.findMany({
      where: { vendorId },
      select: { id: true },
    });
    const storeIds = stores.map((s) => s.id);

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      prisma.inventory.findMany({
        where: {
          product: { storeId: { in: storeIds } },
        },
        skip,
        take: limit,
        orderBy: { updatedAt: "desc" },
        include: {
          product: { select: { id: true, name: true, slug: true, basePrice: true } },
          variant: { select: { id: true, title: true, price: true } },
        },
      }),
      prisma.inventory.count({
        where: {
          product: { storeId: { in: storeIds } },
        },
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

  public async getLowStockAlerts(vendorId: string) {
    const stores = await prisma.store.findMany({
      where: { vendorId },
      select: { id: true },
    });
    const storeIds = stores.map((s) => s.id);

    return prisma.inventory.findMany({
      where: {
        product: { storeId: { in: storeIds } },
        quantity: { lte: 5 },
      },
      include: {
        product: { select: { id: true, name: true, sku: true } },
        variant: { select: { id: true, title: true, sku: true } },
      },
      orderBy: { quantity: "asc" },
    });
  }

  public async adjustStock(
    vendorId: string | undefined,
    userId: string | undefined,
    data: {
      inventoryId: string;
      type: StockMovementType;
      quantity: number; // positive number representing quantity to change
      reason?: string;
      referenceId?: string;
    }
  ) {
    if (data.quantity <= 0) {
      throw new BadRequestException("Quantity must be greater than zero");
    }

    const inventory = await prisma.inventory.findUnique({
      where: { id: data.inventoryId },
      include: {
        product: { include: { store: true } },
      },
    });

    if (!inventory) throw new NotFoundException("Inventory record not found");

    if (vendorId && inventory.product.store.vendorId !== vendorId) {
      throw new ForbiddenException("You do not have permission to manage this inventory");
    }

    let newQuantity = inventory.quantity;

    if (data.type === "IN" || data.type === "RETURN") {
      newQuantity += data.quantity;
    } else if (data.type === "OUT" || data.type === "DAMAGED") {
      if (inventory.quantity < data.quantity) {
        throw new BadRequestException("Insufficient inventory to reduce quantity");
      }
      newQuantity -= data.quantity;
    } else if (data.type === "ADJUSTMENT") {
      newQuantity = data.quantity; // direct count overwrite for adjustment
    }

    // Execute atomic update and record history
    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.inventory.update({
        where: { id: data.inventoryId },
        data: { quantity: newQuantity },
      });

      const history = await tx.inventoryHistory.create({
        data: {
          inventoryId: data.inventoryId,
          type: data.type,
          quantity: data.quantity,
          reason: data.reason || `Manual adjustment (${data.type})`,
          referenceId: data.referenceId,
          createdByUserId: userId,
        },
      });

      return { updated, history };
    });

    return result;
  }

  public async getInventoryHistory(inventoryId: string) {
    return prisma.inventoryHistory.findMany({
      where: { inventoryId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  }
}

export const inventoryService = new InventoryService();
