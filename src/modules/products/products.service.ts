import { productsRepository, ProductsRepository, ProductFilterParams } from "./products.repository";
import { prisma } from "@/database/prisma";
import { NotFoundException, ForbiddenException, ConflictException } from "@/common/exceptions";
import { generateSlug, generateRandomCode } from "@/common/utils/slug";
import { parsePagination, buildPaginationMeta } from "@/common/utils/pagination";
import { CacheService } from "@/common/utils/cache";
import { CACHE_KEYS, CACHE_TTL } from "@/common/constants";
import { ProductStatus } from "@prisma/client";

export interface CreateProductDTO {
  storeId: string;
  brandId?: string;
  categoryId: string;
  name: string;
  description: string;
  shortDescription?: string;
  sku?: string;
  basePrice: number;
  comparePrice?: number;
  costPrice?: number;
  isFeatured?: boolean;
  tags?: string[];
  status?: ProductStatus;
  initialStock?: number;
  images?: Array<{
    url: string;
    altText?: string;
    isCover?: boolean;
    sortOrder?: number;
  }>;
  variants?: Array<{
    sku?: string;
    title: string;
    price: number;
    comparePrice?: number;
    attributes?: Record<string, unknown>;
    barcode?: string;
    image?: string;
    initialStock?: number;
  }>;
}

export class ProductsService {
  constructor(private readonly repo: ProductsRepository = productsRepository) {}

  public async getProducts(
    filterParams: {
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
    },
    paginationParams: {
      page?: number;
      limit?: number;
      sortBy?: string;
      sortOrder?: "asc" | "desc";
      cursor?: string;
    }
  ) {
    const { page, limit, skip, sortBy, sortOrder, cursor } = parsePagination(paginationParams);

    const { items, total } = await this.repo.findManyWithFilters({
      ...filterParams,
      skip,
      take: limit,
      sortBy,
      sortOrder,
      cursor,
    });

    const meta = buildPaginationMeta(total, page, limit, items.length > 0 ? items[items.length - 1].id : undefined);

    return { items, meta };
  }

  public async getProductBySlug(slug: string) {
    const cacheKey = CACHE_KEYS.PRODUCT_BY_SLUG(slug);
    const cached = await CacheService.get(cacheKey);
    if (cached) return cached;

    const product = await this.repo.findBySlug(slug);
    if (!product) throw new NotFoundException("Product not found");

    // Asynchronously increment views
    this.repo.incrementViews(product.id).catch((err) => console.error(err));

    await CacheService.set(cacheKey, product, CACHE_TTL.SHORT);
    return product;
  }

  public async getFeaturedProducts() {
    return CacheService.getOrSet(
      CACHE_KEYS.FEATURED_PRODUCTS,
      async () => {
        const { items } = await this.repo.findManyWithFilters({
          isFeatured: true,
          take: 12,
        });
        return items;
      },
      CACHE_TTL.MEDIUM
    );
  }

  public async getRelatedProducts(slugOrId: string, limit = 6) {
    const product = await prisma.product.findFirst({
      where: {
        OR: [{ id: slugOrId }, { slug: slugOrId }],
      },
      select: { id: true, categoryId: true, brandId: true },
    });
    if (!product) throw new NotFoundException("Product not found");

    const related = await prisma.product.findMany({
      where: {
        id: { not: product.id },
        isActive: true,
        status: "PUBLISHED",
        OR: [{ categoryId: product.categoryId }, { brandId: product.brandId }],
      },
      take: limit,
      include: {
        images: { where: { isCover: true }, take: 1 },
        store: { select: { id: true, name: true, slug: true } },
      },
    });

    return related;
  }

  public async createProduct(vendorId: string | undefined, dto: CreateProductDTO) {
    // Verify store ownership
    const store = await prisma.store.findUnique({
      where: { id: dto.storeId },
      include: { vendor: true },
    });
    if (!store) throw new NotFoundException("Store not found");
    if (vendorId && store.vendorId !== vendorId) {
      throw new ForbiddenException("You do not have permission to add products to this store");
    }

    // Verify category exists
    const category = await prisma.category.findUnique({ where: { id: dto.categoryId } });
    if (!category) throw new NotFoundException("Category not found");

    // Generate unique slug
    let slug = generateSlug(dto.name);
    const existing = await prisma.product.findUnique({ where: { slug } });
    if (existing) {
      slug = `${slug}-${generateRandomCode(6).toLowerCase()}`;
    }

    // Generate product SKU
    const mainSku = dto.sku || `PRD-${generateRandomCode(8)}`;
    const existingSku = await prisma.product.findUnique({ where: { sku: mainSku } });
    if (existingSku) {
      throw new ConflictException("Product SKU already exists");
    }

    // Execute transaction to create product, variants, and initial inventory
    const result = await prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          storeId: dto.storeId,
          brandId: dto.brandId || null,
          categoryId: dto.categoryId,
          name: dto.name,
          slug,
          description: dto.description,
          shortDescription: dto.shortDescription,
          sku: mainSku,
          basePrice: dto.basePrice,
          comparePrice: dto.comparePrice || null,
          costPrice: dto.costPrice || null,
          isFeatured: dto.isFeatured || false,
          tags: dto.tags || [],
          status: dto.status || "PUBLISHED",
          images: {
            create: dto.images?.map((img, idx) => ({
              url: img.url,
              altText: img.altText || dto.name,
              isCover: img.isCover !== undefined ? img.isCover : idx === 0,
              sortOrder: img.sortOrder || idx,
            })),
          },
        },
      });

      // Handle variants or single default inventory
      if (dto.variants && dto.variants.length > 0) {
        for (const variant of dto.variants) {
          const variantSku = variant.sku || `${mainSku}-${generateRandomCode(4)}`;
          const createdVariant = await tx.productVariant.create({
            data: {
              productId: product.id,
              sku: variantSku,
              title: variant.title,
              price: variant.price,
              comparePrice: variant.comparePrice || null,
              attributes: (variant.attributes as any) || {},
              barcode: variant.barcode,
              image: variant.image,
            },
          });

          // Initialize variant inventory
          const stock = variant.initialStock || 0;
          const inv = await tx.inventory.create({
            data: {
              productId: product.id,
              variantId: createdVariant.id,
              quantity: stock,
              sku: variantSku,
            },
          });

          if (stock > 0) {
            await tx.inventoryHistory.create({
              data: {
                inventoryId: inv.id,
                type: "IN",
                quantity: stock,
                reason: "Initial stock load",
              },
            });
          }
        }
      } else {
        // Create base product inventory
        const stock = dto.initialStock || 0;
        const inv = await tx.inventory.create({
          data: {
            productId: product.id,
            quantity: stock,
            sku: mainSku,
          },
        });

        if (stock > 0) {
          await tx.inventoryHistory.create({
            data: {
              inventoryId: inv.id,
              type: "IN",
              quantity: stock,
              reason: "Initial stock load",
            },
          });
        }
      }

      return product;
    });

    await CacheService.del(CACHE_KEYS.FEATURED_PRODUCTS);
    return this.repo.findById(result.id);
  }

  public async updateProduct(
    productId: string,
    vendorId: string | undefined,
    dto: Partial<CreateProductDTO>
  ) {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: { store: true },
    });
    if (!product) throw new NotFoundException("Product not found");

    if (vendorId && product.store.vendorId !== vendorId) {
      throw new ForbiddenException("You do not have permission to update this product");
    }

    const updated = await prisma.product.update({
      where: { id: productId },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.description && { description: dto.description }),
        ...(dto.shortDescription !== undefined && { shortDescription: dto.shortDescription }),
        ...(dto.basePrice !== undefined && { basePrice: dto.basePrice }),
        ...(dto.comparePrice !== undefined && { comparePrice: dto.comparePrice }),
        ...(dto.costPrice !== undefined && { costPrice: dto.costPrice }),
        ...(dto.isFeatured !== undefined && { isFeatured: dto.isFeatured }),
        ...(dto.status && { status: dto.status }),
        ...(dto.tags && { tags: dto.tags }),
        ...(dto.brandId !== undefined && { brandId: dto.brandId }),
        ...(dto.categoryId && { categoryId: dto.categoryId }),
      },
      include: {
        images: true,
        variants: true,
        inventory: true,
      },
    });

    await CacheService.del(CACHE_KEYS.PRODUCT_BY_SLUG(product.slug));
    await CacheService.del(CACHE_KEYS.FEATURED_PRODUCTS);
    return updated;
  }

  public async deleteProduct(productId: string, vendorId: string | undefined) {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: { store: true },
    });
    if (!product) throw new NotFoundException("Product not found");

    if (vendorId && product.store.vendorId !== vendorId) {
      throw new ForbiddenException("You do not have permission to delete this product");
    }

    await prisma.product.delete({ where: { id: productId } });

    await CacheService.del(CACHE_KEYS.PRODUCT_BY_SLUG(product.slug));
    await CacheService.del(CACHE_KEYS.FEATURED_PRODUCTS);
    return { message: "Product deleted successfully" };
  }
}

export const productsService = new ProductsService();
