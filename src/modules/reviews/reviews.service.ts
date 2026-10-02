import { prisma } from "@/database/prisma";
import { NotFoundException, BadRequestException, ForbiddenException } from "@/common/exceptions";

export class ReviewsService {
  public async getProductReviews(productId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      prisma.review.findMany({
        where: { productId },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, avatar: true },
          },
        },
      }),
      prisma.review.count({ where: { productId } }),
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

  public async createReview(
    userId: string,
    data: {
      productId: string;
      orderItemId?: string;
      rating: number;
      title?: string;
      comment: string;
    }
  ) {
    if (data.rating < 1 || data.rating > 5) {
      throw new BadRequestException("Rating must be an integer between 1 and 5");
    }

    const product = await prisma.product.findUnique({ where: { id: data.productId } });
    if (!product) throw new NotFoundException("Product not found");

    // Check if verified purchase
    let isVerifiedPurchase = false;
    const deliveredOrderWithProduct = await prisma.order.findFirst({
      where: {
        customerId: userId,
        status: "DELIVERED",
        items: {
          some: { productId: data.productId },
        },
      },
    });

    if (deliveredOrderWithProduct) {
      isVerifiedPurchase = true;
    }

    const review = await prisma.$transaction(async (tx) => {
      const created = await tx.review.create({
        data: {
          productId: data.productId,
          userId,
          orderItemId: data.orderItemId,
          rating: data.rating,
          title: data.title,
          comment: data.comment,
          isVerifiedPurchase,
        },
      });

      // Recalculate average rating & rating count
      const aggregates = await tx.review.aggregate({
        where: { productId: data.productId },
        _avg: { rating: true },
        _count: { rating: true },
      });

      const avg = Number((aggregates._avg.rating || 0).toFixed(2));
      const count = aggregates._count.rating || 0;

      await tx.product.update({
        where: { id: data.productId },
        data: {
          ratingAvg: avg,
          ratingCount: count,
        },
      });

      return created;
    });

    return review;
  }

  public async respondToReview(
    reviewId: string,
    vendorId: string | undefined,
    response: string
  ) {
    const review = await prisma.review.findUnique({
      where: { id: reviewId },
      include: {
        product: { include: { store: true } },
      },
    });

    if (!review) throw new NotFoundException("Review not found");

    if (vendorId && review.product.store.vendorId !== vendorId) {
      throw new ForbiddenException("You can only respond to reviews of products from your store");
    }

    return prisma.review.update({
      where: { id: reviewId },
      data: {
        vendorResponse: response,
        responseDate: new Date(),
      },
    });
  }
}

export const reviewsService = new ReviewsService();
