import { describe, expect, it } from "bun:test";
import { app } from "@/app";
import { prisma } from "@/database/prisma";

describe("Integration Tests: Cart & Orders Lifecycle", () => {
  let customerToken = "";
  let sampleProductId = "";
  let sampleVariantId = "";

  it("Setup: Login as Customer, clear previous cart, and get product", async () => {
    const loginRes = await app.handle(
      new Request("http://localhost/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "customer@emc.com",
          password: "CustomerPassword123!",
        }),
      })
    );
    expect(loginRes.status).toBe(200);
    const loginBody = await loginRes.json();
    customerToken = loginBody.data.tokens.accessToken;
    const customerId = loginBody.data.user.id;

    // Clear customer cart before test run
    await prisma.cartItem.deleteMany({
      where: { cart: { userId: customerId } },
    });

    const product = await prisma.product.findFirst({
      where: { slug: "iphone-16-pro-max" },
      include: { variants: true },
    });
    expect(product).toBeDefined();
    sampleProductId = product!.id;
    sampleVariantId = product!.variants[0].id;
  });

  it("POST /api/cart - should add item to cart with stock validation", async () => {
    const res = await app.handle(
      new Request("http://localhost/api/cart", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${customerToken}`,
        },
        body: JSON.stringify({
          productId: sampleProductId,
          variantId: sampleVariantId,
          quantity: 2,
        }),
      })
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.totalItems).toBe(2);
    expect(body.data.subtotal).toBe(2398.0);
  });

  it("POST /api/orders - should place order, create payment & shipment, and decrement inventory", async () => {
    const invBefore = await prisma.inventory.findFirst({
      where: { productId: sampleProductId, variantId: sampleVariantId },
    });
    const qtyBefore = invBefore?.quantity || 0;

    const res = await app.handle(
      new Request("http://localhost/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${customerToken}`,
        },
        body: JSON.stringify({
          items: [
            {
              productId: sampleProductId,
              variantId: sampleVariantId,
              quantity: 1,
            },
          ],
          shippingAddress: {
            firstName: "Alice",
            lastName: "Smith",
            phone: "+85512111222",
            street: "Villa 12, Street 2004",
            city: "Phnom Penh",
            postalCode: "120801",
            country: "Cambodia",
          },
          paymentMethod: "ABA_PAYWAY",
          notes: "Please call before arrival",
        }),
      })
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.orderNumber.startsWith("ORD-")).toBe(true);
    expect(body.data.payment).toBeDefined();
    expect(body.data.shipments.length).toBeGreaterThan(0);

    // Verify inventory decremented
    const invAfter = await prisma.inventory.findFirst({
      where: { productId: sampleProductId, variantId: sampleVariantId },
    });
    expect(invAfter?.quantity).toBe(qtyBefore - 1);
  });
});
