import { prisma } from "@/database/prisma";
import { NotFoundException, ConflictException, ForbiddenException } from "@/common/exceptions";
import { generateSlug } from "@/common/utils/slug";
import { StoreStatus } from "@prisma/client";

export class StoresService {
  public async getStoresByVendor(vendorId: string) {
    return prisma.store.findMany({
      where: { vendorId },
      include: {
        _count: {
          select: { products: true, orders: true },
        },
      },
    });
  }

  public async getStoreBySlug(slug: string) {
    const store = await prisma.store.findUnique({
      where: { slug },
      include: {
        vendor: {
          select: {
            companyName: true,
            status: true,
          },
        },
        _count: {
          select: { products: true },
        },
      },
    });
    if (!store) throw new NotFoundException("Store not found");
    return store;
  }

  public async getStoreById(id: string) {
    const store = await prisma.store.findUnique({
      where: { id },
      include: {
        vendor: true,
      },
    });
    if (!store) throw new NotFoundException("Store not found");
    return store;
  }

  public async createStore(
    vendorId: string,
    data: {
      name: string;
      description?: string;
      logo?: string;
      banner?: string;
      address?: string;
      phone?: string;
      email?: string;
      seoTitle?: string;
      seoDescription?: string;
      seoKeywords?: string;
    }
  ) {
    let slug = generateSlug(data.name);
    const existing = await prisma.store.findUnique({ where: { slug } });
    if (existing) {
      slug = `${slug}-${Math.floor(1000 + Math.random() * 9000)}`;
    }

    return prisma.store.create({
      data: {
        vendorId,
        name: data.name,
        slug,
        description: data.description,
        logo: data.logo,
        banner: data.banner,
        address: data.address,
        phone: data.phone,
        email: data.email,
        seoTitle: data.seoTitle || data.name,
        seoDescription: data.seoDescription || data.description,
        seoKeywords: data.seoKeywords,
        status: "ACTIVE",
      },
    });
  }

  public async updateStore(
    storeId: string,
    vendorId: string,
    data: Partial<{
      name: string;
      description: string;
      logo: string;
      banner: string;
      status: StoreStatus;
      address: string;
      phone: string;
      email: string;
      seoTitle: string;
      seoDescription: string;
      seoKeywords: string;
    }>
  ) {
    const store = await prisma.store.findUnique({ where: { id: storeId } });
    if (!store) throw new NotFoundException("Store not found");
    if (store.vendorId !== vendorId) {
      throw new ForbiddenException("You do not have permission to modify this store");
    }

    return prisma.store.update({
      where: { id: storeId },
      data,
    });
  }
}

export const storesService = new StoresService();
