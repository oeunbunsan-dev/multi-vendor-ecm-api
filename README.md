# Multi-Vendor E-Commerce Enterprise REST API

A production-ready Multi-Vendor E-Commerce platform built with **ElysiaJS**, **TypeScript**, **PostgreSQL**, **Prisma ORM**, **Redis**, **Docker**, and the **Bun Runtime**.

---

## 🌟 Key Architecture & Stack Highlights

- **Runtime & Web Framework**: [Bun](https://bun.sh) + [ElysiaJS](https://elysiajs.com) (high performance, native type safety)
- **Database & Caching**: PostgreSQL 16 + Prisma ORM + Redis 7 (sliding window rate limiting, cache fallback)
- **Architecture**: Clean Architecture, Domain Driven Design (DDD), Repository Pattern, Service Layer Pattern, Modular Monolith (Scalable for Microservices)
- **API Documentation**: Interactive Swagger / OpenAPI 3.0 at `/swagger`
- **Security**: JWT Access/Refresh tokens, RBAC (Super Admin, Vendor, Customer), Helmet security headers, Rate Limiting, Audit Logs
- **Containerization**: Multi-stage Dockerfile + Docker Compose (API, PostgreSQL, Redis, pgAdmin)

---

## 🏗️ Project Structure

```
src/
├── config/                  # Strongly typed environment configuration
│   ├── env.ts
│   └── index.ts
├── database/                # Singleton clients & lifecycle handling
│   ├── prisma.ts            # Prisma Client singleton & connection pooling
│   ├── redis.ts             # Redis client with retry strategy & in-memory fallback
│   └── index.ts
├── common/                  # Cross-cutting concerns & shared infrastructure
│   ├── constants/           # Roles, OrderStatus, PaymentStatus, Cache keys
│   ├── exceptions/          # Domain HTTP exceptions hierarchy
│   ├── middleware/          # Global error handling, logger, security headers, rate limiting, audit
│   ├── plugins/             # JWT Auth plugin, RBAC guards, Swagger documentation
│   └── utils/               # Standardized response format, pagination, slug generator, crypto, cache
├── modules/                 # Modular Monolith Bounded Contexts
│   ├── auth/                # Register, login, refresh, password lifecycle, email verification
│   ├── users/               # Customer profiles, shipping/billing address CRUD
│   ├── vendors/             # Vendor onboarding, approval workflow, dashboard metrics
│   ├── stores/              # Multi-store per vendor, SEO metadata, logos, banners
│   ├── categories/          # Hierarchical category tree, slugs, SEO
│   ├── brands/              # Brand catalog & caching
│   ├── products/            # Full-text search, filters (price/rating/category/brand), variants, gallery
│   ├── inventory/           # Stock tracking, movements (IN/OUT/ADJUSTMENT/RETURN), low stock alerts
│   ├── carts/               # Guest session cart, customer cart, stock check, cart merge
│   ├── wishlist/            # Wishlist CRUD & move to cart
│   ├── orders/              # Checkout transaction, stock reservation, status tracking, cancellations
│   ├── payments/            # Checkout initiation, webhooks (COD, ABA Payway, Stripe, PayPal)
│   ├── shipping/            # Methods, fee calculation, tracking numbers, status updates
│   ├── coupons/             # Percentage, fixed amount, free shipping, usage limits
│   ├── reviews/             # Verified purchase reviews, star ratings, vendor responses
│   ├── notifications/       # User & vendor notifications
│   ├── analytics/           # Admin & vendor business intelligence analytics
│   ├── uploads/             # Media upload handling & streaming
│   └── admin/               # Dedicated platform administration APIs
├── prisma/
│   ├── schema.prisma        # Complete 22-model schema with enums & indexes
│   └── seed.ts              # Comprehensive database seeder
├── app.ts                   # Elysia application factory
└── index.ts                 # Server entrypoint with graceful shutdown
```

---

## 🚀 Quick Start

### 1. Prerequisites
- [Bun](https://bun.sh) (v1.2+)
- Docker & Docker Compose

### 2. Installation
```bash
# Clone the repository
git clone <repo-url>
cd emc-api

# Install dependencies
bun install

# Set up environment variables
cp .env.example .env
```

### 3. Database Setup & Seeding
```bash
# Push Prisma Schema to database
bun run prisma:push

# Seed comprehensive demo data
bun run prisma:seed
```

### 4. Running the Development Server
```bash
bun run dev
```

Server will start on `http://localhost:3001`:
- **Swagger Documentation**: [http://localhost:3001/swagger](http://localhost:3001/swagger)
- **Health Check**: [http://localhost:3001/health](http://localhost:3001/health)

---

## 🐳 Docker Setup

Run all 4 services (API, PostgreSQL, Redis, pgAdmin) using Docker Compose:

```bash
docker compose up -d --build
```

- **API**: `http://localhost:3001`
- **Swagger UI**: `http://localhost:3001/swagger`
- **pgAdmin**: `http://localhost:5050` (Login: `admin@emc.com` / `AdminPassword123!`)
- **PostgreSQL**: `localhost:5433` (Host mapping)
- **Redis**: `localhost:6380` (Host mapping)

---

## 🧪 Testing

Run all unit and integration test suites:
```bash
bun test
```

Watch mode:
```bash
bun run test:watch
```

---

## 🔑 Demo Credentials

| Role | Email | Password |
|---|---|---|
| **Super Admin** | `admin@emc.com` | `AdminPassword123!` |
| **Tech Vendor** | `techstore@emc.com` | `VendorPassword123!` |
| **Fashion Vendor** | `urbanstyle@emc.com` | `VendorPassword123!` |
| **Customer** | `customer@emc.com` | `CustomerPassword123!` |

---

## 📚 API Endpoints Summary

### Authentication (`/api/auth`)
- `POST /api/auth/register` - Register customer
- `POST /api/auth/register-vendor` - Register vendor applicant
- `POST /api/auth/login` - Authenticate & obtain tokens
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/change-password` - Update password
- `POST /api/auth/forgot-password` - Request reset token
- `POST /api/auth/reset-password` - Reset password
- `GET /api/auth/verify-email` - Verify email token
- `GET /api/auth/me` - Authenticated profile

### Products & Catalog (`/api/products`)
- `GET /api/products` - Full-text search, filters (category, brand, price, rating), sorting, pagination
- `GET /api/products/:slug` - Product details with variants, images, inventory, reviews
- `GET /api/products/featured` - Cached featured products
- `GET /api/products/:slug/related` - Related products
- `POST /api/vendor/products` - Create product with variants & initial stock (Vendor)
- `GET /api/vendor/products` - List vendor products (Vendor)
- `PUT /api/vendor/products/:id` - Update product (Vendor)
- `DELETE /api/vendor/products/:id` - Delete product (Vendor)

### Orders & Checkout (`/api/orders`)
- `POST /api/orders` - Place order, reserve stock, create payment & shipment records
- `GET /api/orders` - Customer orders with pagination
- `GET /api/orders/:id` - Order details
- `POST /api/orders/:id/cancel` - Cancel order & restore inventory stock
- `PATCH /api/orders/:id/status` - Transition status (CONFIRMED, PROCESSING, SHIPPED, DELIVERED, CANCELLED)

### Payments (`/api/payments`)
- `POST /api/payments/checkout` - Generate ABA Payway QR, Stripe client secret, or PayPal approval
- `POST /api/payments/webhook/:gateway` - Multi-gateway webhook receiver (Stripe, ABA Payway, PayPal)
- `GET /api/payments/history` - Customer payment history

### Inventory (`/api/vendor/inventory`)
- `GET /api/vendor/inventory` - Stock tracking per warehouse and product/variant
- `GET /api/vendor/inventory/alerts` - Low stock alerts (≤ 5 units)
- `POST /api/vendor/inventory/adjust` - Record stock movement (IN, OUT, ADJUSTMENT, RETURN, DAMAGED)
- `GET /api/vendor/inventory/:id/history` - Stock movement audit log

### Cart & Wishlist
- `GET /api/cart` - View cart (guest session or customer)
- `POST /api/cart` - Add item to cart with stock validation
- `PUT /api/cart/items/:id` - Update quantity
- `DELETE /api/cart/items/:id` - Remove item
- `POST /api/cart/merge` - Merge guest cart to customer account
- `GET /api/wishlist` - View wishlist
- `POST /api/wishlist` - Add to wishlist
- `POST /api/wishlist/move-to-cart` - Move wishlist item to cart

### Administration (`/api/admin`)
- `GET /api/admin/dashboard` - Platform revenue, orders, customer and vendor counts
- `GET /api/admin/vendors` - List vendors with status filter
- `PATCH /api/admin/vendors/:id/status` - Vendor approval workflow (APPROVED, REJECTED, SUSPENDED)
- `GET /api/admin/orders` - Platform order monitoring
- `GET /api/admin/users` - Platform user directory

---

## 📄 License
MIT License. Built for enterprise multi-vendor commerce.