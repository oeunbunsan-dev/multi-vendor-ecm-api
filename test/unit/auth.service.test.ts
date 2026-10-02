import { describe, expect, it } from "bun:test";
import { hashPassword, comparePassword, generateToken } from "@/common/utils/crypto";
import { generateSlug, generateOrderNumber } from "@/common/utils/slug";
import { parsePagination, buildPaginationMeta } from "@/common/utils/pagination";

describe("Unit Tests: Crypto & Security Utils", () => {
  it("should hash a password and verify successfully", async () => {
    const raw = "SuperSecretP@ssword123";
    const hashed = await hashPassword(raw);

    expect(hashed).not.toBe(raw);
    expect(hashed.startsWith("$2")).toBe(true);

    const isMatch = await comparePassword(raw, hashed);
    expect(isMatch).toBe(true);

    const isBadMatch = await comparePassword("WrongPassword", hashed);
    expect(isBadMatch).toBe(false);
  });

  it("should generate random hex tokens of correct length", () => {
    const token32 = generateToken(32);
    expect(token32.length).toBe(64); // 32 bytes = 64 hex characters

    const token16 = generateToken(16);
    expect(token16.length).toBe(32);
  });
});

describe("Unit Tests: Slug & Code Generator", () => {
  it("should convert titles into clean URL-friendly slugs", () => {
    const title = "  Sony WH-1000XM5 Wireless Headphones (Black Edition)!  ";
    const slug = generateSlug(title);
    expect(slug).toBe("sony-wh-1000xm5-wireless-headphones-black-edition");
  });

  it("should handle accented characters in slugs", () => {
    const title = "Café & Crème Brûlée Elegance";
    const slug = generateSlug(title);
    expect(slug).toBe("cafe-creme-brulee-elegance");
  });

  it("should generate valid order numbers with prefix", () => {
    const orderNumber = generateOrderNumber();
    expect(orderNumber.startsWith("ORD-")).toBe(true);
    expect(orderNumber.length).toBeGreaterThan(12);
  });
});

describe("Unit Tests: Pagination Utility", () => {
  it("should parse pagination defaults correctly", () => {
    const parsed = parsePagination({});
    expect(parsed.page).toBe(1);
    expect(parsed.limit).toBe(10);
    expect(parsed.skip).toBe(0);
    expect(parsed.sortOrder).toBe("desc");
  });

  it("should calculate pagination metadata accurately", () => {
    const meta = buildPaginationMeta(95, 2, 10);
    expect(meta.total).toBe(95);
    expect(meta.totalPages).toBe(10);
    expect(meta.hasNextPage).toBe(true);
    expect(meta.hasPrevPage).toBe(true);
  });
});
