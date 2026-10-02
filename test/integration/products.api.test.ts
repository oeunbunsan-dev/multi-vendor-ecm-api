import { describe, expect, it } from "bun:test";
import { app } from "@/app";

describe("Integration Tests: Products & Uploads API", () => {
  it("GET /api/products - should return seeded products list with pagination metadata", async () => {
    const res = await app.handle(new Request("http://localhost/api/products?page=1&limit=5"));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.meta).toBeDefined();
    expect(body.meta.page).toBe(1);
    expect(body.meta.limit).toBe(5);
  });

  it("GET /api/products/featured - should return featured items", async () => {
    const res = await app.handle(new Request("http://localhost/api/products/featured"));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.length).toBeGreaterThan(0);
    expect(body.data[0].isFeatured).toBe(true);
  });

  it("GET /api/products/:slug - should fetch full product by slug", async () => {
    const res = await app.handle(new Request("http://localhost/api/products/iphone-16-pro-max"));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.slug).toBe("iphone-16-pro-max");
    expect(body.data.variants.length).toBeGreaterThan(0);
    expect(body.data.images.length).toBeGreaterThan(0);
  });

  it("GET /api/products?search=Sony - should perform search filter", async () => {
    const res = await app.handle(new Request("http://localhost/api/products?search=Sony"));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.some((p: any) => p.name.includes("Sony"))).toBe(true);
  });

  it("POST /api/uploads - should accept file uploads successfully", async () => {
    const formData = new FormData();
    const fakeFile = new File(["dummy content"], "test-image.png", { type: "image/png" });
    formData.append("file", fakeFile);

    const res = await app.handle(
      new Request("http://localhost/api/uploads", {
        method: "POST",
        body: formData,
      })
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.url.startsWith("/uploads/")).toBe(true);
  });
});
