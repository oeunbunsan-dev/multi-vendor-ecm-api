import { prisma } from "@/database/prisma";
import { NotFoundException, BadRequestException } from "@/common/exceptions";

export class CartsService {
  public async getOrCreateCart(userId?: string, sessionId?: string) {
    if (!userId && !sessionId) {
      throw new BadRequestException("Either userId or sessionId must be provided for cart");
    }

    let cart = await prisma.cart.findFirst({
      where: userId ? { userId } : { sessionId },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                slug: true,
                basePrice: true,
                images: { where: { isCover: true }, take: 1 },
                store: { select: { id: true, name: true } },
              },
            },
            variant: {
              select: {
                id: true,
                title: true,
                price: true,
                sku: true,
              },
            },
          },
        },
      },
    });

    if (!cart) {
      cart = await prisma.cart.create({
        data: {
          userId,
          sessionId: !userId ? sessionId : undefined,
        },
        include: {
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                  basePrice: true,
                  images: { where: { isCover: true }, take: 1 },
                  store: { select: { id: true, name: true } },
                },
              },
              variant: {
                select: {
                  id: true,
                  title: true,
                  price: true,
                  sku: true,
                },
              },
            },
          },
        },
      });
    }

    // Calculate totals
    const totalItems = cart.items.reduce((sum, i) => sum + i.quantity, 0);
    const subtotal = cart.items.reduce((sum, i) => sum + Number(i.unitPrice) * i.quantity, 0);

    return {
      id: cart.id,
      userId: cart.userId,
      sessionId: cart.sessionId,
      totalItems,
      subtotal: Number(subtotal.toFixed(2)),
      items: cart.items,
    };
  }

  public async addItem(params: {
    userId?: string;
    sessionId?: string;
    productId: string;
    variantId?: string;
    quantity: number;
  }) {
    if (params.quantity <= 0) {
      throw new BadRequestException("Quantity must be at least 1");
    }

    const product = await prisma.product.findUnique({
      where: { id: params.productId },
      include: { variants: true },
    });
    if (!product || !product.isActive) {
      throw new NotFoundException("Product not found or inactive");
    }

    let unitPrice = product.basePrice;
    if (params.variantId) {
      const variant = product.variants.find((v) => v.id === params.variantId);
      if (!variant) throw new NotFoundException("Product variant not found");
      unitPrice = variant.price;
    }

    // Check inventory
    const inventory = await prisma.inventory.findFirst({
      where: {
        productId: params.productId,
        variantId: params.variantId || null,
      },
    });

    if (!inventory || inventory.quantity < params.quantity) {
      throw new BadRequestException(
        `Insufficient stock available. Only ${inventory?.quantity || 0} left in stock.`
      );
    }

    const cart = await this.getOrCreateCart(params.userId, params.sessionId);

    // Check if item already in cart
    const existingItem = await prisma.cartItem.findUnique({
      where: {
        cartId_productId_variantId: {
          cartId: cart.id,
          productId: params.productId,
          variantId: params.variantId || (null as any),
        },
      },
    });

    if (existingItem) {
      const newQuantity = existingItem.quantity + params.quantity;
      if (inventory.quantity < newQuantity) {
        throw new BadRequestException(
          `Cannot add ${params.quantity} more. Total in cart would exceed stock (${inventory.quantity}).`
        );
      }

      await prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: newQuantity, unitPrice },
      });
    } else {
      await prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId: params.productId,
          variantId: params.variantId,
          quantity: params.quantity,
          unitPrice,
        },
      });
    }

    return this.getOrCreateCart(params.userId, params.sessionId);
  }

  public async updateItemQuantity(
    cartItemId: string,
    quantity: number,
    userId?: string,
    sessionId?: string
  ) {
    if (quantity <= 0) {
      return this.removeItem(cartItemId, userId, sessionId);
    }

    const item = await prisma.cartItem.findUnique({
      where: { id: cartItemId },
      include: {
        product: true,
        variant: true,
      },
    });
    if (!item) throw new NotFoundException("Cart item not found");

    // Check inventory
    const inventory = await prisma.inventory.findFirst({
      where: {
        productId: item.productId,
        variantId: item.variantId || null,
      },
    });

    if (!inventory || inventory.quantity < quantity) {
      throw new BadRequestException(
        `Insufficient stock available. Maximum available is ${inventory?.quantity || 0}.`
      );
    }

    await prisma.cartItem.update({
      where: { id: cartItemId },
      data: { quantity },
    });

    return this.getOrCreateCart(userId, sessionId);
  }

  public async removeItem(cartItemId: string, userId?: string, sessionId?: string) {
    await prisma.cartItem.deleteMany({
      where: { id: cartItemId },
    });

    return this.getOrCreateCart(userId, sessionId);
  }

  public async mergeGuestCart(userId: string, sessionId: string) {
    const guestCart = await prisma.cart.findUnique({
      where: { sessionId },
      include: { items: true },
    });

    if (!guestCart || guestCart.items.length === 0) {
      return this.getOrCreateCart(userId);
    }

    const userCart = await this.getOrCreateCart(userId);

    for (const item of guestCart.items) {
      const existing = await prisma.cartItem.findUnique({
        where: {
          cartId_productId_variantId: {
            cartId: userCart.id,
            productId: item.productId,
            variantId: item.variantId || (null as any),
          },
        },
      });

      if (existing) {
        await prisma.cartItem.update({
          where: { id: existing.id },
          data: { quantity: existing.quantity + item.quantity },
        });
      } else {
        await prisma.cartItem.create({
          data: {
            cartId: userCart.id,
            productId: item.productId,
            variantId: item.variantId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
          },
        });
      }
    }

    // Delete guest cart after merge
    await prisma.cart.delete({ where: { id: guestCart.id } });

    return this.getOrCreateCart(userId);
  }
}

export const cartsService = new CartsService();
