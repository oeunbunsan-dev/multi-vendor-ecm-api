import { prisma } from "@/database/prisma";
import { Prisma, Product } from "@prisma/client";

export interface ProductFilterParams {
  search?: string;
  categoryId?: string;
  brandId?: string;
  storeId?: string;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  isFeatured?: boolean;
  status?: "DRAFT" | "PUBLISHED" | "ARCHIVED" | "OUT_OF_STOCK";
  tags?: string[];
  skip?: number;
  take?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  cursor?: string;
}

export class ProductsRepository {
  public async findManyWithFilters(params: ProductFilterParams) {
    const where: Prisma.ProductWhereInput = {
      isActive: true,
      ...(params.status ? { status: params.status } : { status: "PUBLISHED" }),
      ...(params.storeId && { storeId: params.storeId }),
      ...(params.brandId && { brandId: params.brandId }),
      ...(params.categoryId && {
        OR: [{ categoryId: params.categoryId }, { category: { parentId: params.categoryId } }],
      }),
      ...(params.isFeatured !== undefined && { isFeatured: params.isFeatured }),
      ...((params.minPrice !== undefined || params.maxPrice !== undefined) && {
        basePrice: {
          ...(params.minPrice !== undefined && { gte: params.minPrice }),
          ...(params.maxPrice !== undefined && { lte: params.maxPrice }),
        },
      }),
      ...(params.minRating !== undefined && {
        ratingAvg: { gte: params.minRating },
      }),
      ...(params.search && {
        OR: [
          { name: { contains: params.search, mode: "insensitive" } },
          { description: { contains: params.search, mode: "insensitive" } },
          { sku: { contains: params.search, mode: "insensitive" } },
          { tags: { hasSome: [params.search.toLowerCase()] } },
        ],
      }),
      ...(params.tags && params.tags.length > 0 && {
        tags: { hasSome: params.tags },
      }),
    };

    let orderBy: Prisma.ProductOrderByWithRelationInput = { createdAt: "desc" };
    if (params.sortBy === "price") {
      orderBy = { basePrice: params.sortOrder || "asc" };
    } else if (params.sortBy === "rating") {
      orderBy = { ratingAvg: params.sortOrder || "desc" };
    } else if (params.sortBy === "popular" || params.sortBy === "sales") {
      orderBy = { salesCount: params.sortOrder || "desc" };
    } else if (params.sortBy === "views") {
      orderBy = { viewsCount: params.sortOrder || "desc" };
    }

    const [items, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip: params.skip,
        take: params.take,
        cursor: params.cursor ? { id: params.cursor } : undefined,
        orderBy,
        include: {
          store: { select: { id: true, name: true, slug: true, logo: true } },
          brand: { select: { id: true, name: true, slug: true, logo: true } },
          category: { select: { id: true, name: true, slug: true } },
          images: { orderBy: [{ isCover: "desc" }, { sortOrder: "asc" }] },
          variants: true,
          inventory: { select: { quantity: true, reservedQuantity: true } },
        },
      }),
      prisma.product.count({ where }),
    ]);

    return { items, total };
  }

  public async findBySlug(slug: string): Promise<Product | null> {
    return prisma.product.findUnique({
      where: { slug },
      include: {
        store: { select: { id: true, name: true, slug: true, logo: true, description: true } },
        brand: true,
        category: { include: { parent: true } },
        images: { orderBy: [{ isCover: "desc" }, { sortOrder: "asc" }] },
        variants: {
          include: {
            inventory: true,
          },
        },
        inventory: true,
        reviews: {
          take: 10,
          orderBy: { createdAt: "desc" },
          include: {
            user: { select: { id: true, firstName: true, lastName: true, avatar: true } },
          },
        },
      },
    });
  }

  public async findById(id: string): Promise<Product | null> {
    return prisma.product.findUnique({
      where: { id },
      include: {
        store: true,
        images: true,
        variants: true,
        inventory: true,
      },
    });
  }

  public async create(data: Prisma.ProductCreateInput): Promise<Product> {
    return prisma.product.create({
      data,
      include: {
        images: true,
        variants: true,
      },
    });
  }

  public async update(id: string, data: Prisma.ProductUpdateInput): Promise<Product> {
    return prisma.product.update({
      where: { id },
      data,
      include: {
        images: true,
        variants: true,
      },
    });
  }

  public async delete(id: string): Promise<Product> {
    return prisma.product.delete({ where: { id } });
  }

  public async incrementViews(id: string): Promise<void> {
    await prisma.product.update({
      where: { id },
      data: { viewsCount: { increment: 1 } },
    });
  }
}

export const productsRepository = new ProductsRepository();
