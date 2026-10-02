import { swagger } from "@elysiajs/swagger";
import { config } from "@/config";

export const swaggerPlugin = swagger({
  path: "/swagger",
  documentation: {
    info: {
      title: "EMC Multi-Vendor E-Commerce REST API",
      version: "1.0.0",
      description: `
# Multi-Vendor E-Commerce Enterprise REST API

Built with **ElysiaJS**, **TypeScript**, **PostgreSQL**, **Prisma ORM**, **Redis**, and **Bun**.

### Key Architectural Highlights:
- **Clean Architecture & Domain Driven Design (DDD)**
- **Repository Pattern & Service Layer**
- **Modular Monolith (Ready for Microservices)**
- **Role-Based Access Control (RBAC)**: Super Admin, Vendor, Customer
- **High Performance**: Redis Caching, Connection Pooling, Bun Runtime
- **Security**: JWT Auth, Sliding-Window Rate Limiting, Helmet Headers, Input Sanitization

### Roles:
- **Super Admin**: Complete platform management, vendor approvals, platform orders, user administration.
- **Vendor**: Store management, product catalog, inventory tracking, vendor orders, revenue analytics.
- **Customer**: Product discovery, carts (guest & customer), checkout, order tracking, reviews, wishlist.
      `,
      contact: {
        name: "EMC Engineering Team",
        email: "support@emc.com",
      },
      license: {
        name: "MIT",
      },
    },
    servers: [
      {
        url: `http://localhost:${config.port}`,
        description: "Local Development Server",
      },
    ],
    tags: [
      { name: "Auth", description: "Authentication & Password Management" },
      { name: "Users", description: "User Profile & Address Management" },
      { name: "Admin", description: "Super Admin Platform Management" },
      { name: "Vendors", description: "Vendor Onboarding & Dashboard" },
      { name: "Stores", description: "Vendor Multi-Store Management" },
      { name: "Categories", description: "Hierarchical Category Catalog" },
      { name: "Brands", description: "Brand Management" },
      { name: "Products", description: "Product Catalog, Search & Filtering" },
      { name: "Inventory", description: "Inventory Tracking & Stock Movements" },
      { name: "Cart", description: "Guest & Customer Shopping Cart" },
      { name: "Wishlist", description: "Customer Wishlist Management" },
      { name: "Orders", description: "Order Processing & Lifecycle" },
      { name: "Payments", description: "Checkout & Multi-Gateway Webhooks (COD, ABA, Stripe, PayPal)" },
      { name: "Shipping", description: "Shipping Methods & Tracking" },
      { name: "Coupons", description: "Promotions & Discount Codes" },
      { name: "Reviews", description: "Product Reviews & Vendor Responses" },
      { name: "Analytics", description: "Admin & Vendor Performance Analytics" },
      { name: "Notifications", description: "User & Vendor Notifications" },
      { name: "Uploads", description: "Media Asset Uploads" },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "Enter your Bearer JWT Access Token",
        },
      },
    },
  },
});
