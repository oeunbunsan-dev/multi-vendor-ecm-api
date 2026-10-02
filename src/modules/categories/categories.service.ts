import { prisma } from "@/database/prisma";
import { NotFoundException, ConflictException } from "@/common/exceptions";
import { generateSlug } from "@/common/utils/slug";
import { CacheService } from "@/common/utils/cache";
import { CACHE_KEYS, CACHE_TTL } from "@/common/constants";

export class CategoriesService {
  public async getCategoryTree() {
    return CacheService.getOrSet(
      CACHE_KEYS.CATEGORIES_TREE,
      async () => {
        // Fetch all active categories
        const categories = await prisma.category.findMany({
          where: { isActive: true },
          orderBy: { name: "asc" },
          include: {
            _count: { select: { products: true } },
          },
        });

        // Build hierarchy tree
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const map = new Map<string, any>();
        const tree: unknown[] = [];

        categories.forEach((cat) => {
          map.set(cat.id, { ...cat, children: [] });
        });

        categories.forEach((cat) => {
          if (cat.parentId && map.has(cat.parentId)) {
            map.get(cat.parentId).children.push(map.get(cat.id));
          } else {
            tree.push(map.get(cat.id));
          }
        });

        return tree;
      },
      CACHE_TTL.MEDIUM
    );
  }

  public async getCategoryBySlug(slug: string) {
    const category = await prisma.category.findUnique({
      where: { slug },
      include: {
        parent: true,
        children: {
          where: { isActive: true },
        },
        _count: { select: { products: true } },
      },
    });
    if (!category) throw new NotFoundException("Category not found");
    return category;
  }

  public async createCategory(data: {
    name: string;
    parentId?: string;
    description?: string;
    image?: string;
    seoTitle?: string;
    seoDescription?: string;
  }) {
    let slug = generateSlug(data.name);
    const existing = await prisma.category.findUnique({ where: { slug } });
    if (existing) {
      slug = `${slug}-${Math.floor(1000 + Math.random() * 9000)}`;
    }

    let level = 1;
    if (data.parentId) {
      const parent = await prisma.category.findUnique({ where: { id: data.parentId } });
      if (!parent) throw new NotFoundException("Parent category not found");
      level = parent.level + 1;
    }

    const category = await prisma.category.create({
      data: {
        name: data.name,
        slug,
        parentId: data.parentId,
        level,
        description: data.description,
        image: data.image,
        seoTitle: data.seoTitle || data.name,
        seoDescription: data.seoDescription || data.description,
      },
    });

    await CacheService.del(CACHE_KEYS.CATEGORIES_TREE);
    return category;
  }

  public async updateCategory(
    id: string,
    data: Partial<{
      name: string;
      parentId: string | null;
      description: string;
      image: string;
      isActive: boolean;
      seoTitle: string;
      seoDescription: string;
    }>
  ) {
    const existing = await prisma.category.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Category not found");

    let level = existing.level;
    if (data.parentId !== undefined) {
      if (data.parentId === id) {
        throw new ConflictException("Category cannot be its own parent");
      }
      if (data.parentId) {
        const parent = await prisma.category.findUnique({ where: { id: data.parentId } });
        if (!parent) throw new NotFoundException("Parent category not found");
        level = parent.level + 1;
      } else {
        level = 1;
      }
    }

    const updated = await prisma.category.update({
      where: { id },
      data: {
        ...data,
        level,
      },
    });

    await CacheService.del(CACHE_KEYS.CATEGORIES_TREE);
    return updated;
  }

  public async deleteCategory(id: string) {
    const hasProducts = await prisma.product.count({ where: { categoryId: id } });
    if (hasProducts > 0) {
      throw new ConflictException("Cannot delete category with associated products");
    }

    await prisma.category.delete({ where: { id } });
    await CacheService.del(CACHE_KEYS.CATEGORIES_TREE);
    return { message: "Category deleted successfully" };
  }
}

export const categoriesService = new CategoriesService();
