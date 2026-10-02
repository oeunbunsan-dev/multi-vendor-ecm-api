import { ForbiddenException, UnauthorizedException } from "../exceptions";
import { AuthUser } from "./auth.plugin";
import { prisma } from "@/database/prisma";

export class RbacGuard {
  public static ensureAdmin(user: AuthUser | null): void {
    if (!user) throw new UnauthorizedException("Authentication required");
    if (user.role !== "ADMIN") {
      throw new ForbiddenException("Super Admin privileges required");
    }
  }

  public static ensureVendor(user: AuthUser | null): void {
    if (!user) throw new UnauthorizedException("Authentication required");
    if (user.role !== "VENDOR" && user.role !== "ADMIN") {
      throw new ForbiddenException("Vendor or Admin privileges required");
    }
  }

  public static async ensureVendorStoreOwner(user: AuthUser | null, storeId: string): Promise<void> {
    if (!user) throw new UnauthorizedException("Authentication required");
    if (user.role === "ADMIN") return; // Super admin has bypass access

    if (user.role !== "VENDOR" || !user.vendorId) {
      throw new ForbiddenException("Vendor access required");
    }

    const store = await prisma.store.findFirst({
      where: {
        id: storeId,
        vendorId: user.vendorId,
      },
    });

    if (!store) {
      throw new ForbiddenException("You do not own or manage this store");
    }
  }

  public static async ensureProductOwner(user: AuthUser | null, productId: string): Promise<void> {
    if (!user) throw new UnauthorizedException("Authentication required");
    if (user.role === "ADMIN") return;

    if (!user.vendorId) {
      throw new ForbiddenException("Vendor access required");
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: { store: true },
    });

    if (!product || product.store.vendorId !== user.vendorId) {
      throw new ForbiddenException("You do not have permission to manage this product");
    }
  }
}
