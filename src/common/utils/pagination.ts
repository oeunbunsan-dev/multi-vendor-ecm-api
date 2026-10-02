export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  cursor?: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  nextCursor?: string;
}

export interface PaginatedResult<T> {
  items: T[];
  meta: PaginationMeta;
}

export function parsePagination(params: {
  page?: string | number;
  limit?: string | number;
  sortBy?: string;
  sortOrder?: string;
  cursor?: string;
}): {
  page: number;
  limit: number;
  skip: number;
  sortBy: string;
  sortOrder: "asc" | "desc";
  cursor?: string;
} {
  const page = Math.max(1, parseInt(String(params.page || 1), 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(String(params.limit || 10), 10) || 10));
  const skip = (page - 1) * limit;
  const sortBy = params.sortBy || "createdAt";
  const sortOrder = params.sortOrder?.toLowerCase() === "asc" ? "asc" : "desc";

  return {
    page,
    limit,
    skip,
    sortBy,
    sortOrder,
    cursor: params.cursor,
  };
}

export function buildPaginationMeta(total: number, page: number, limit: number, nextCursor?: string): PaginationMeta {
  const totalPages = Math.ceil(total / limit) || 1;
  return {
    page,
    limit,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
    ...(nextCursor && { nextCursor }),
  };
}
