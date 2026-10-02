import { prisma } from "@/database/prisma";
import { NotFoundException, ConflictException } from "@/common/exceptions";
import { generateSlug } from "@/common/utils/slug";
import { CacheService } from "@/common/utils/cache";
import { CACHE_KEYS, CACHE_TTL } from "@/common/constants";

export class BrandsService {
  public async getBrands() {
    return CacheService.getOrSet(
      CACHE_KEYS.BRANDS_LIST,
      async () => {
        return prisma.brand.findMany({
          where: { isActive: true },
          orderBy: { name: "asc" },
          include: {
            _count: { select: { products: true } },
          },
        });
      },
      CACHE_TTL.MEDIUM
    );
  }

  public async getBrandBySlug(slug: string) {
    const brand = await prisma.brand.findUnique({
      where: { slug },
      include: {
        _count: { select: { products: true } },
      },
    });
    if (!brand) throw new NotFoundException("Brand not found");
    return brand;
  }

  public async createBrand(data: {
    name: string;
    description?: string;
    logo?: string;
    website?: string;
  }) {
    let slug = generateSlug(data.name);
    const existing = await prisma.brand.findUnique({ where: { slug } });
    if (existing) {
      slug = `${slug}-${Math.floor(1000 + Math.random() * 9000)}`;
    }

    const brand = await prisma.brand.create({
      data: {
        name: data.name,
        slug,
        description: data.description,
        logo: data.logo,
        website: data.website,
      },
    });

    await CacheService.del(CACHE_KEYS.BRANDS_LIST);
    return brand;
  }

  public async updateBrand(
    id: string,
    data: Partial<{
      name: string;
      description: string;
      logo: string;
      website: string;
      isActive: boolean;
    }>
  ) {
    const brand = await prisma.brand.findUnique({ where: { id } });
    if (!brand) throw new NotFoundException("Brand not found");

    const updated = await prisma.brand.update({
      where: { id },
      data,
    });

    await CacheService.del(CACHE_KEYS.BRANDS_LIST);
    return updated;
  }

  public async deleteBrand(id: string) {
    const hasProducts = await prisma.product.count({ where: { brandId: id } });
    if (hasProducts > 0) {
      throw new ConflictException("Cannot delete brand that has linked products");
    }

    await prisma.brand.delete({ where: { id } });
    await CacheService.del(CACHE_KEYS.BRANDS_LIST);
    return { message: "Brand deleted successfully" };
  }
}

export const brandsService = new BrandsService();
