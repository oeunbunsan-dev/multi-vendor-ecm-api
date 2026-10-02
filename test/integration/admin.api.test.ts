import { describe, expect, it } from "bun:test";
import { app } from "@/app";

describe("Integration Tests: Admin Dashboard & RBAC Enforcement", () => {
  let adminToken = "";
  let customerToken = "";

  it("Setup: Obtain tokens for Admin and Customer", async () => {
    const adminRes = await app.handle(
      new Request("http://localhost/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "admin@emc.com",
          password: "AdminPassword123!",
        }),
      })
    );
    expect(adminRes.status).toBe(200);
    const adminData = await adminRes.json();
    adminToken = adminData.data.tokens.accessToken;

    const custRes = await app.handle(
      new Request("http://localhost/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "customer@emc.com",
          password: "CustomerPassword123!",
        }),
      })
    );
    expect(custRes.status).toBe(200);
    const custData = await custRes.json();
    customerToken = custData.data.tokens.accessToken;
  });

  it("GET /api/admin/dashboard - should allow Admin to retrieve stats", async () => {
    const res = await app.handle(
      new Request("http://localhost/api/admin/dashboard", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      })
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.metrics.totalOrders).toBeGreaterThan(0);
    expect(body.data.metrics.totalCustomers).toBeGreaterThan(0);
  });

  it("GET /api/admin/dashboard - should reject Customer with 403 Forbidden", async () => {
    const res = await app.handle(
      new Request("http://localhost/api/admin/dashboard", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${customerToken}`,
        },
      })
    );

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.success).toBe(false);
  });
});
