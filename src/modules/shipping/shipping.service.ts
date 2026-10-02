import { prisma } from "@/database/prisma";
import { NotFoundException } from "@/common/exceptions";
import { ShipmentStatus } from "@prisma/client";

export interface ShippingMethod {
  id: string;
  name: string;
  carrier: string;
  estimatedDays: string;
  baseFee: number;
}

export const SHIPPING_METHODS: ShippingMethod[] = [
  {
    id: "std",
    name: "Standard Ground Delivery",
    carrier: "National Express",
    estimatedDays: "3-5 business days",
    baseFee: 3.5,
  },
  {
    id: "exp",
    name: "Priority Express",
    carrier: "Swift Couriers",
    estimatedDays: "1-2 business days",
    baseFee: 8.0,
  },
  {
    id: "same_day",
    name: "Same Day Metro Courier",
    carrier: "City Rush",
    estimatedDays: "Same day (orders before 2 PM)",
    baseFee: 15.0,
  },
];

export class ShippingService {
  public getAvailableMethods(subtotal: number) {
    return SHIPPING_METHODS.map((method) => {
      let fee = method.baseFee;
      if (subtotal >= 50 && method.id === "std") {
        fee = 0;
      }
      return {
        ...method,
        fee,
        isFree: fee === 0,
      };
    });
  }

  public async getShipmentByTrackingNumber(trackingNumber: string) {
    const shipment = await prisma.shipment.findUnique({
      where: { trackingNumber },
      include: {
        order: {
          select: {
            orderNumber: true,
            status: true,
            shippingAddress: true,
          },
        },
        store: { select: { name: true } },
      },
    });
    if (!shipment) throw new NotFoundException("Shipment tracking number not found");
    return shipment;
  }

  public async updateShipmentStatus(
    shipmentId: string,
    status: ShipmentStatus,
    carrier?: string,
    trackingNumber?: string
  ) {
    const shipment = await prisma.shipment.findUnique({ where: { id: shipmentId } });
    if (!shipment) throw new NotFoundException("Shipment record not found");

    const data: any = { status };
    if (carrier) data.carrier = carrier;
    if (trackingNumber) data.trackingNumber = trackingNumber;

    if (status === "PICKED_UP" || status === "IN_TRANSIT" || status === "OUT_FOR_DELIVERY") {
      data.shippedAt = shipment.shippedAt || new Date();
    } else if (status === "DELIVERED") {
      data.deliveredAt = new Date();
      await prisma.order.update({
        where: { id: shipment.orderId },
        data: { status: "DELIVERED" },
      });
    }

    return prisma.shipment.update({
      where: { id: shipmentId },
      data,
    });
  }
}

export const shippingService = new ShippingService();
