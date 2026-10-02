import { describe, expect, it } from "bun:test";
import { couponsService } from "@/modules/coupons/coupons.service";
import { shippingService } from "@/modules/shipping/shipping.service";
import { RbacGuard } from "@/common/plugins/rbac.plugin";
import { ForbiddenException, UnauthorizedException } from "@/common/exceptions";

describe("Unit Tests: Shipping Service", () => {
  it("should charge standard base fee for orders below $50", () => {
    const methods = shippingService.getAvailableMethods(45.0);
    const standard = methods.find((m) => m.id === "std");
    expect(standard?.fee).toBe(3.5);
    expect(standard?.isFree).toBe(false);
  });

  it("should provide free standard shipping for orders $50 and above", () => {
    const methods = shippingService.getAvailableMethods(75.0);
    const standard = methods.find((m) => m.id === "std");
    expect(standard?.fee).toBe(0);
    expect(standard?.isFree).toBe(true);
  });
});

describe("Unit Tests: RBAC Guard", () => {
  it("should throw UnauthorizedException when no user is provided", () => {
    expect(() => RbacGuard.ensureAdmin(null)).toThrow(UnauthorizedException);
    expect(() => RbacGuard.ensureVendor(null)).toThrow(UnauthorizedException);
  });

  it("should throw ForbiddenException when customer tries to access admin guard", () => {
    const customer = { id: "1", email: "cust@emc.com", role: "CUSTOMER" as const };
    expect(() => RbacGuard.ensureAdmin(customer)).toThrow(ForbiddenException);
    expect(() => RbacGuard.ensureVendor(customer)).toThrow(ForbiddenException);
  });

  it("should pass when admin accesses admin guard", () => {
    const admin = { id: "2", email: "admin@emc.com", role: "ADMIN" as const };
    expect(() => RbacGuard.ensureAdmin(admin)).not.toThrow();
    expect(() => RbacGuard.ensureVendor(admin)).not.toThrow();
  });
});
