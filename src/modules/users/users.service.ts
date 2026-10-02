import { prisma } from "@/database/prisma";
import { NotFoundException } from "@/common/exceptions";
import { AddressType } from "@prisma/client";

export class UsersService {
  public async updateProfile(
    userId: string,
    data: {
      firstName?: string;
      lastName?: string;
      phone?: string;
      avatar?: string;
    }
  ) {
    const user = await prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        avatar: true,
        role: true,
        updatedAt: true,
      },
    });
    return user;
  }

  public async getAddresses(userId: string) {
    return prisma.address.findMany({
      where: { userId },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    });
  }

  public async createAddress(
    userId: string,
    data: {
      type?: AddressType;
      firstName: string;
      lastName: string;
      phone: string;
      street: string;
      city: string;
      state?: string;
      postalCode: string;
      country?: string;
      isDefault?: boolean;
    }
  ) {
    if (data.isDefault) {
      // Unset previous default
      await prisma.address.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
    }

    return prisma.address.create({
      data: {
        userId,
        type: data.type || "SHIPPING",
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        street: data.street,
        city: data.city,
        state: data.state,
        postalCode: data.postalCode,
        country: data.country || "Cambodia",
        isDefault: data.isDefault || false,
      },
    });
  }

  public async updateAddress(
    userId: string,
    addressId: string,
    data: Partial<{
      type: AddressType;
      firstName: string;
      lastName: string;
      phone: string;
      street: string;
      city: string;
      state: string;
      postalCode: string;
      country: string;
      isDefault: boolean;
    }>
  ) {
    const address = await prisma.address.findFirst({
      where: { id: addressId, userId },
    });
    if (!address) throw new NotFoundException("Address not found");

    if (data.isDefault) {
      await prisma.address.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
    }

    return prisma.address.update({
      where: { id: addressId },
      data,
    });
  }

  public async deleteAddress(userId: string, addressId: string) {
    const address = await prisma.address.findFirst({
      where: { id: addressId, userId },
    });
    if (!address) throw new NotFoundException("Address not found");

    await prisma.address.delete({ where: { id: addressId } });
    return { message: "Address deleted successfully" };
  }
}

export const usersService = new UsersService();
