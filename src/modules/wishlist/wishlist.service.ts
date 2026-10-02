import { prisma } from "@/database/prisma";
import { NotFoundException } from "@/common/exceptions";
import { cartsService } from "../carts/carts.service";

export class WishlistService {
  public async getWishlist(userId: string) {
    return prisma.wishlist.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: {
        product: {
          include: {
            images: { where: { isCover: true }, take: 1 },
            store: { select: { id: true, name: true, slug: true } },
          },
        },
      },
    });
  }

  public async addToWishlist(userId: string, productId: string) {
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new NotFoundException("Product not found");

    return prisma.wishlist.upsert({
      where: {
        userId_productId: { userId, productId },
      },
      update: {},
      create: { userId, productId },
      include: { product: true },
    });
  }

  public async removeFromWishlist(userId: string, productId: string) {
    await prisma.wishlist.deleteMany({
      where: { userId, productId },
    });
    return { message: "Product removed from wishlist" };
  }

  public async moveToCart(userId: string, productId: string, variantId?: string) {
    await cartsService.addItem({
      userId,
      productId,
      variantId,
      quantity: 1,
    });

    await this.removeFromWishlist(userId, productId);
    return { message: "Product moved from wishlist to cart" };
  }
}

export const wishlistService = new WishlistService();
