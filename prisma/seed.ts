import { PrismaClient, Role, VendorStatus, ProductStatus, OrderStatus, PaymentStatus, PaymentMethod, ShipmentStatus, CouponType } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting Database Seeder...");

  // 1. Clean up existing data (in correct relational deletion order)
  console.log("🧹 Clearing old data...");
  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.review.deleteMany();
  await prisma.shipment.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.coupon.deleteMany();
  await prisma.cartItem.deleteMany();
  await prisma.cart.deleteMany();
  await prisma.wishlist.deleteMany();
  await prisma.inventoryHistory.deleteMany();
  await prisma.inventory.deleteMany();
  await prisma.productImage.deleteMany();
  await prisma.productVariant.deleteMany();
  await prisma.product.deleteMany();
  await prisma.brand.deleteMany();
  await prisma.subCategory.deleteMany();
  await prisma.category.deleteMany();
  await prisma.store.deleteMany();
  await prisma.vendor.deleteMany();
  await prisma.address.deleteMany();
  await prisma.user.deleteMany();

  const salt = await bcrypt.genSalt(10);
  const adminPasswordHash = await bcrypt.hash("AdminPassword123!", salt);
  const vendorPasswordHash = await bcrypt.hash("VendorPassword123!", salt);
  const customerPasswordHash = await bcrypt.hash("CustomerPassword123!", salt);

  // 2. Super Admin User
  console.log("👑 Creating Super Admin...");
  const admin = await prisma.user.create({
    data: {
      email: "admin@emc.com",
      passwordHash: adminPasswordHash,
      firstName: "Super",
      lastName: "Admin",
      role: Role.ADMIN,
      emailVerified: true,
      phone: "+85512345678",
    },
  });

  // 3. Vendors and Stores
  console.log("🏪 Creating Vendors and Stores...");
  const vendor1User = await prisma.user.create({
    data: {
      email: "techstore@emc.com",
      passwordHash: vendorPasswordHash,
      firstName: "John",
      lastName: "Tech",
      role: Role.VENDOR,
      emailVerified: true,
      phone: "+85512999888",
      vendor: {
        create: {
          companyName: "Tech Hub Global Ltd.",
          businessNumber: "BN-88776655",
          taxId: "TAX-123456789",
          status: VendorStatus.APPROVED,
          commissionRate: 8.5,
          approvedAt: new Date(),
        },
      },
    },
    include: { vendor: true },
  });

  const store1 = await prisma.store.create({
    data: {
      vendorId: vendor1User.vendor!.id,
      name: "Apex Electronics",
      slug: "apex-electronics",
      description: "Premier distributor of cutting-edge gadgets, computing gear, and flagship electronics.",
      logo: "https://images.unsplash.com/photo-1550009158-9ebf69173e03?w=200",
      banner: "https://images.unsplash.com/photo-1526738549149-8e07eca6c147?w=1200",
      seoTitle: "Apex Electronics | Flagship Tech Store",
      seoDescription: "Shop genuine electronics, smartphones, and pro laptops.",
      email: "contact@apexelectronics.com",
      phone: "+85523999111",
      address: "123 Monivong Blvd, Phnom Penh, Cambodia",
    },
  });

  const vendor2User = await prisma.user.create({
    data: {
      email: "urbanstyle@emc.com",
      passwordHash: vendorPasswordHash,
      firstName: "Sophie",
      lastName: "Miller",
      role: Role.VENDOR,
      emailVerified: true,
      phone: "+85512777666",
      vendor: {
        create: {
          companyName: "Urban Lifestyle Group",
          businessNumber: "BN-44332211",
          taxId: "TAX-987654321",
          status: VendorStatus.APPROVED,
          commissionRate: 10.0,
          approvedAt: new Date(),
        },
      },
    },
    include: { vendor: true },
  });

  const store2 = await prisma.store.create({
    data: {
      vendorId: vendor2User.vendor!.id,
      name: "Urban Threads",
      slug: "urban-threads",
      description: "Contemporary designer apparel, sustainable footwear, and luxury lifestyle accessories.",
      logo: "https://images.unsplash.com/photo-1529720317453-c8da503f2051?w=200",
      banner: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200",
      seoTitle: "Urban Threads Fashion Store",
      seoDescription: "Modern apparel and lifestyle accessories.",
      email: "support@urbanthreads.com",
      phone: "+85523888222",
      address: "456 Norodom Blvd, Phnom Penh, Cambodia",
    },
  });

  // 4. Hierarchical Categories
  console.log("🗂️ Creating Category Hierarchy...");
  const electronics = await prisma.category.create({
    data: {
      name: "Electronics",
      slug: "electronics",
      description: "Smart devices, consumer electronics, and computing hardware.",
      image: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=500",
      level: 1,
    },
  });

  const smartphones = await prisma.category.create({
    data: {
      parentId: electronics.id,
      name: "Smartphones & Tablets",
      slug: "smartphones-tablets",
      description: "Next-gen flagship smartphones and high-performance tablets.",
      image: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=500",
      level: 2,
    },
  });

  const laptops = await prisma.category.create({
    data: {
      parentId: electronics.id,
      name: "Laptops & Computers",
      slug: "laptops-computers",
      description: "Ultra-portable laptops, creator workstations, and gaming rigs.",
      image: "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=500",
      level: 2,
    },
  });

  const fashion = await prisma.category.create({
    data: {
      name: "Fashion & Apparel",
      slug: "fashion-apparel",
      description: "Modern men and women designer wear and street trends.",
      image: "https://images.unsplash.com/photo-1445205170230-053b83016050?w=500",
      level: 1,
    },
  });

  // 5. Brands
  console.log("🏷️ Creating Brands...");
  const apple = await prisma.brand.create({
    data: {
      name: "Apple",
      slug: "apple",
      description: "Innovative electronics, premium mobile devices, and macOS computers.",
      website: "https://apple.com",
    },
  });

  const samsung = await prisma.brand.create({
    data: {
      name: "Samsung",
      slug: "samsung",
      description: "World leader in digital media and advanced AMOLED mobile technology.",
      website: "https://samsung.com",
    },
  });

  const sony = await prisma.brand.create({
    data: {
      name: "Sony",
      slug: "sony",
      description: "Pioneers in high-resolution audio, noise cancellation, and imaging sensor tech.",
      website: "https://sony.com",
    },
  });

  // 6. Products with Variants, Images & Inventory
  console.log("📦 Creating Products, Variants, Images & Stock...");
  
  // Product 1: iPhone 16 Pro Max
  const p1 = await prisma.product.create({
    data: {
      storeId: store1.id,
      brandId: apple.id,
      categoryId: smartphones.id,
      name: "iPhone 16 Pro Max",
      slug: "iphone-16-pro-max",
      description: "The ultimate iPhone featuring aerospace titanium construction, A18 Pro silicon, and camera control button.",
      shortDescription: "Titanium design, 48MP Fusion camera, A18 Pro chip.",
      sku: "IPH-16PM-MAIN",
      basePrice: 1199.0,
      comparePrice: 1299.0,
      costPrice: 950.0,
      isFeatured: true,
      tags: ["apple", "iphone", "5g", "flagship", "ios"],
      status: ProductStatus.PUBLISHED,
      salesCount: 42,
      ratingAvg: 4.9,
      ratingCount: 15,
      images: {
        create: [
          { url: "https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=600", isCover: true, sortOrder: 0 },
          { url: "https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?w=600", isCover: false, sortOrder: 1 },
        ],
      },
      variants: {
        create: [
          {
            sku: "IPH-16PM-256-BLK",
            title: "256GB - Black Titanium",
            price: 1199.0,
            attributes: { storage: "256GB", color: "Black Titanium" },
          },
          {
            sku: "IPH-16PM-512-NAT",
            title: "512GB - Natural Titanium",
            price: 1399.0,
            attributes: { storage: "512GB", color: "Natural Titanium" },
          },
        ],
      },
    },
    include: { variants: true },
  });

  // Create Inventory for variants
  for (const v of p1.variants) {
    const inv = await prisma.inventory.create({
      data: {
        productId: p1.id,
        variantId: v.id,
        quantity: 50,
        sku: v.sku,
        reorderThreshold: 10,
        minStockAlert: 5,
      },
    });
    await prisma.inventoryHistory.create({
      data: {
        inventoryId: inv.id,
        type: "IN",
        quantity: 50,
        reason: "Initial warehouse stock load",
      },
    });
  }

  // Product 2: MacBook Pro 16 M3 Max
  const p2 = await prisma.product.create({
    data: {
      storeId: store1.id,
      brandId: apple.id,
      categoryId: laptops.id,
      name: "MacBook Pro 16 Liquid Retina XDR",
      slug: "macbook-pro-16-liquid-retina",
      description: "Engineered for demanding workflows with Liquid Retina XDR display, up to 22 hours battery life, and pro connectivity.",
      shortDescription: "Pro computing monster with M3 Max architecture.",
      sku: "MBP-16-M3X",
      basePrice: 2499.0,
      comparePrice: 2699.0,
      costPrice: 2100.0,
      isFeatured: true,
      tags: ["apple", "macbook", "laptop", "m3", "pro"],
      status: ProductStatus.PUBLISHED,
      salesCount: 18,
      ratingAvg: 4.8,
      ratingCount: 8,
      images: {
        create: [
          { url: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=600", isCover: true, sortOrder: 0 },
        ],
      },
      variants: {
        create: [
          {
            sku: "MBP-16-36GB-1TB",
            title: "36GB Unified Memory / 1TB SSD - Space Black",
            price: 2499.0,
            attributes: { memory: "36GB", storage: "1TB", color: "Space Black" },
          },
        ],
      },
    },
    include: { variants: true },
  });

  const inv2 = await prisma.inventory.create({
    data: {
      productId: p2.id,
      variantId: p2.variants[0].id,
      quantity: 25,
      sku: p2.variants[0].sku,
    },
  });
  await prisma.inventoryHistory.create({
    data: {
      inventoryId: inv2.id,
      type: "IN",
      quantity: 25,
      reason: "Initial load",
    },
  });

  // Product 3: Sony WH-1000XM5 Wireless Headphones
  const p3 = await prisma.product.create({
    data: {
      storeId: store1.id,
      brandId: sony.id,
      categoryId: electronics.id,
      name: "Sony WH-1000XM5 Wireless Noise-Canceling",
      slug: "sony-wh-1000xm5-noise-canceling",
      description: "Industry-leading noise cancellation optimized by two processors and eight microphones with Auto NC Optimizer.",
      shortDescription: "Benchmark wireless noise cancellation audio.",
      sku: "SNY-WH1000XM5-BLK",
      basePrice: 399.0,
      comparePrice: 449.0,
      costPrice: 290.0,
      isFeatured: true,
      tags: ["sony", "audio", "headphones", "bluetooth"],
      status: ProductStatus.PUBLISHED,
      salesCount: 88,
      ratingAvg: 4.95,
      ratingCount: 22,
      images: {
        create: [
          { url: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600", isCover: true, sortOrder: 0 },
        ],
      },
    },
  });

  const inv3 = await prisma.inventory.create({
    data: {
      productId: p3.id,
      quantity: 4, // low stock test!
      sku: p3.sku,
      reorderThreshold: 10,
      minStockAlert: 5,
    },
  });
  await prisma.inventoryHistory.create({
    data: {
      inventoryId: inv3.id,
      type: "IN",
      quantity: 4,
      reason: "Initial load (Low stock sample)",
    },
  });

  // 7. Customers with Address
  console.log("👤 Creating Customer Accounts & Addresses...");
  const customer1 = await prisma.user.create({
    data: {
      email: "customer@emc.com",
      passwordHash: customerPasswordHash,
      firstName: "Alice",
      lastName: "Smith",
      role: Role.CUSTOMER,
      emailVerified: true,
      phone: "+85512111222",
      addresses: {
        create: [
          {
            type: "SHIPPING",
            firstName: "Alice",
            lastName: "Smith",
            phone: "+85512111222",
            street: "Villa 12, Street 2004",
            city: "Phnom Penh",
            state: "Sen Sok",
            postalCode: "120801",
            country: "Cambodia",
            isDefault: true,
          },
        ],
      },
    },
  });

  // 8. Coupons
  console.log("🎟️ Creating Promotional Coupons...");
  await prisma.coupon.createMany({
    data: [
      {
        code: "WELCOME10",
        description: "10% discount on orders above $50",
        type: CouponType.PERCENTAGE,
        value: 10.0,
        minOrderAmount: 50.0,
        maxDiscountAmount: 100.0,
        usageLimit: 500,
        userLimit: 1,
        isActive: true,
      },
      {
        code: "SAVE50",
        description: "Flat $50 off on high value orders over $500",
        type: CouponType.FIXED_AMOUNT,
        value: 50.0,
        minOrderAmount: 500.0,
        usageLimit: 200,
        userLimit: 1,
        isActive: true,
      },
      {
        code: "FREESHIP",
        description: "Free shipping across all stores",
        type: CouponType.FREE_SHIPPING,
        value: 0,
        usageLimit: 1000,
        userLimit: 5,
        isActive: true,
      },
    ],
  });

  // 9. Sample Completed Order with Payment, Shipment & Review
  console.log("🧾 Creating Sample Orders, Payments & Reviews...");
  const sampleOrder = await prisma.order.create({
    data: {
      orderNumber: "ORD-261002-100001",
      customerId: customer1.id,
      storeId: store1.id,
      status: OrderStatus.DELIVERED,
      subtotal: 1199.0,
      discountTotal: 0.0,
      shippingTotal: 0.0,
      taxTotal: 59.95,
      totalAmount: 1258.95,
      shippingAddress: {
        firstName: "Alice",
        lastName: "Smith",
        phone: "+85512111222",
        street: "Villa 12, Street 2004",
        city: "Phnom Penh",
        postalCode: "120801",
        country: "Cambodia",
      },
      items: {
        create: [
          {
            storeId: store1.id,
            productId: p1.id,
            variantId: p1.variants[0].id,
            sku: p1.variants[0].sku,
            productName: p1.name,
            variantTitle: p1.variants[0].title,
            unitPrice: 1199.0,
            quantity: 1,
            subtotal: 1199.0,
            discount: 0,
            total: 1199.0,
          },
        ],
      },
      payment: {
        create: {
          method: PaymentMethod.ABA_PAYWAY,
          status: PaymentStatus.COMPLETED,
          amount: 1258.95,
          currency: "USD",
          transactionId: "ABA-TRX-99887766",
          paidAt: new Date(),
        },
      },
      shipments: {
        create: [
          {
            storeId: store1.id,
            carrier: "Swift Couriers Express",
            trackingNumber: "TRK-EXP-88991122",
            status: ShipmentStatus.DELIVERED,
            shippingFee: 0.0,
            shippedAt: new Date(Date.now() - 86400000 * 2),
            deliveredAt: new Date(Date.now() - 3600000),
          },
        ],
      },
    },
    include: { items: true },
  });

  // Create Verified Product Review with Vendor Response
  await prisma.review.create({
    data: {
      productId: p1.id,
      userId: customer1.id,
      orderItemId: sampleOrder.items[0].id,
      rating: 5,
      title: "Phenomenal performance and battery life!",
      comment: "The camera control button is great and battery lasts two full days easily. Fast delivery too!",
      isVerifiedPurchase: true,
      vendorResponse: "Thank you Alice for trusting Apex Electronics! Enjoy your new iPhone 16 Pro Max.",
      responseDate: new Date(),
    },
  });

  // 10. Sample Pending Order
  await prisma.order.create({
    data: {
      orderNumber: "ORD-261002-100002",
      customerId: customer1.id,
      storeId: store1.id,
      status: OrderStatus.CONFIRMED,
      subtotal: 399.0,
      discountTotal: 0.0,
      shippingTotal: 3.5,
      taxTotal: 19.95,
      totalAmount: 422.45,
      shippingAddress: {
        firstName: "Alice",
        lastName: "Smith",
        phone: "+85512111222",
        street: "Villa 12, Street 2004",
        city: "Phnom Penh",
        postalCode: "120801",
        country: "Cambodia",
      },
      items: {
        create: [
          {
            storeId: store1.id,
            productId: p3.id,
            sku: p3.sku,
            productName: p3.name,
            unitPrice: 399.0,
            quantity: 1,
            subtotal: 399.0,
            discount: 0,
            total: 399.0,
          },
        ],
      },
      payment: {
        create: {
          method: PaymentMethod.COD,
          status: PaymentStatus.PENDING,
          amount: 422.45,
          currency: "USD",
        },
      },
      shipments: {
        create: [
          {
            storeId: store1.id,
            carrier: "Standard Ground Delivery",
            trackingNumber: "TRK-STD-33445566",
            status: ShipmentStatus.PICKED_UP,
            shippingFee: 3.5,
            shippedAt: new Date(),
          },
        ],
      },
    },
  });

  console.log("✨ Seeding completed successfully!");
  console.log(`
  Credentials for Testing:
  ===========================================
  👑 Super Admin:  admin@emc.com     / AdminPassword123!
  🏪 Tech Vendor:   techstore@emc.com / VendorPassword123!
  👗 Fashion Vendor: urbanstyle@emc.com/ VendorPassword123!
  👤 Customer:      customer@emc.com  / CustomerPassword123!
  ===========================================
  `);
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
