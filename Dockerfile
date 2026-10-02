# ====================================================
# Stage 1: Base image
# ====================================================
FROM oven/bun:1.2-alpine AS base
WORKDIR /app

# Install OpenSSL for Prisma engine compatibility
RUN apk add --no-cache openssl libc6-compat

# ====================================================
# Stage 2: Install dependencies
# ====================================================
FROM base AS dependencies
COPY package.json bun.lock* ./
COPY prisma ./prisma/

RUN bun install
RUN bun x prisma generate

# ====================================================
# Stage 3: Build application
# ====================================================
FROM base AS builder
COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=dependencies /app/prisma ./prisma
COPY . .

ENV NODE_ENV=production
RUN bun run build

# ====================================================
# Stage 4: Production Runner
# ====================================================
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001

# Create non-root user and group
RUN addgroup -S -g 1001 appgroup && \
    adduser -S -u 1001 -G appgroup appuser

# Create uploads directory and permissions
RUN mkdir -p /app/uploads && chown -R appuser:appgroup /app

# Copy runtime assets
COPY --from=dependencies --chown=appuser:appgroup /app/node_modules ./node_modules
COPY --from=dependencies --chown=appuser:appgroup /app/prisma ./prisma
COPY --from=builder --chown=appuser:appgroup /app/dist ./dist
COPY --from=builder --chown=appuser:appgroup /app/package.json ./package.json

USER appuser

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/health || exit 1

CMD ["bun", "run", "dist/index.js"]
