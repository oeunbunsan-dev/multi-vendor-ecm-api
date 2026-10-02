import { describe, expect, it } from "bun:test";
import { app } from "@/app";

describe("Integration Tests: Auth API", () => {
  const testEmail = `testuser_${Date.now()}@emc.com`;
  const testPassword = "SecurePassword123!";
  let accessToken = "";

  it("POST /api/auth/register - should register a new customer", async () => {
    const res = await app.handle(
      new Request("http://localhost/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: testEmail,
          password: testPassword,
          firstName: "John",
          lastName: "Doe",
          phone: "+85599887766",
        }),
      })
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.email).toBe(testEmail);
    expect(body.data.role).toBe("CUSTOMER");
  });

  it("POST /api/auth/login - should authenticate and return tokens", async () => {
    const res = await app.handle(
      new Request("http://localhost/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: testEmail,
          password: testPassword,
        }),
      })
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.tokens.accessToken).toBeDefined();
    expect(body.data.tokens.refreshToken).toBeDefined();

    accessToken = body.data.tokens.accessToken;
  });

  it("POST /api/auth/login - should reject invalid credentials", async () => {
    const res = await app.handle(
      new Request("http://localhost/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: testEmail,
          password: "WrongPassword!",
        }),
      })
    );

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  it("GET /api/auth/me - should return profile for authenticated user", async () => {
    const res = await app.handle(
      new Request("http://localhost/api/auth/me", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.email).toBe(testEmail);
  });

  it("GET /api/auth/me - should reject request without token", async () => {
    const res = await app.handle(
      new Request("http://localhost/api/auth/me", {
        method: "GET",
      })
    );

    expect(res.status).toBe(401);
  });
});
