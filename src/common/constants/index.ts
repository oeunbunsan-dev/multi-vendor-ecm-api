export * from "./roles";

export const CACHE_TTL = {
  SHORT: 60, // 1 min
  MEDIUM: 300, // 5 min
  LONG: 3600, // 1 hour
  DAY: 86400, // 24 hours
} as const;

export const CACHE_KEYS = {
  CATEGORIES_TREE: "cache:categories:tree",
  BRANDS_LIST: "cache:brands:all",
  FEATURED_PRODUCTS: "cache:products:featured",
  PRODUCT_BY_SLUG: (slug: string) => `cache:products:slug:${slug}`,
  STORE_BY_SLUG: (slug: string) => `cache:stores:slug:${slug}`,
} as const;
