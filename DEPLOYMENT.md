# Production Deployment & Architecture Guide
## EMC Multi-Vendor E-Commerce REST API

---

## 1. System Architecture Overview

This platform is architected as an **Enterprise Modular Monolith** adhering to:
- **Clean Architecture & Domain Driven Design (DDD)**
- **Repository Pattern & Service Layer Pattern**
- **SOLID Principles**
- **Loose Coupling**: Modules interact via explicit service interfaces, enabling zero-downtime decomposition into standalone microservices.

```
                          [ Client Applications ]
                        (Web, Mobile, Third-party)
                                    │
                                    ▼
                         [ Cloudflare / Nginx ]
                       (SSL Termination, DDoS, WAF)
                                    │
                                    ▼
                    ┌───────────────────────────────┐
                    │       ElysiaJS / Bun API      │
                    │   (Swagger, Rate Limiter,     │
                    │    JWT RBAC, Audit Logger)    │
                    └───────┬───────────────┬───────┘
                            │               │
            ┌───────────────┴────┐     ┌────┴────────────────┐
            ▼                    ▼     ▼                     ▼
     [ PostgreSQL 16 ]     [ Redis 7 ]   [ Object Storage ]   [ External Gateways ]
    (ACID Transactions,    (Cache, Rates, (S3 / Local Uploads) (ABA, Stripe, PayPal)
     Indexes, Full-Text)    Sessions)
```

---

## 2. Microservices Migration Roadmap

Because modules are isolated into separate domain directories under `src/modules/*`:
```
src/modules/
├── auth/           ──> [ Auth & Identity Service ]
├── products/       ──> [ Catalog & Search Service ]
├── orders/         ──> [ Order Management Service (OMS) ]
├── payments/       ──> [ Payment Gateway Adapter Service ]
├── inventory/      ──> [ Real-time Inventory & Warehouse Service ]
├── notifications/  ──> [ Asynchronous Event & Notification Service ]
```
Migration steps:
1. **Extract Domain Events**: Replace in-process method calls with RabbitMQ / Apache Kafka or Redis Pub/Sub events.
2. **Database Per Service**: Split PostgreSQL schemas into isolated database instances per bounded context.
3. **API Gateway**: Deploy Traefik / Kong / Envoy routing traffic across independent microservice pods.

---

## 3. Docker Compose Deployment (Single Node / VPS)

### Step 1: Clone & Configure Environment
```bash
git clone <repo-url> /opt/emc-api
cd /opt/emc-api

cp .env.example .env
# Edit production secrets in .env
nano .env
```

### Step 2: Build and Run Services
```bash
docker compose up -d --build
```

### Step 3: Run Database Migrations & Seeds
```bash
docker compose exec api bun x prisma db push
docker compose exec api bun run prisma/seed.ts
```

### Step 4: Verify Deployment
```bash
# Check service health
curl -s http://localhost:3001/health | jq .

# Check running containers
docker compose ps
```

---

## 4. Kubernetes Production Deployment (Helm / YAML)

### Deployment Manifest (`k8s/api-deployment.yaml`)
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: emc-api
  namespace: production
  labels:
    app: emc-api
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  selector:
    matchLabels:
      app: emc-api
  template:
    metadata:
      labels:
        app: emc-api
    spec:
      containers:
        - name: emc-api
          image: ghcr.io/yourorg/emc-api:v1.0.0
          imagePullPolicy: IfNotPresent
          ports:
            - containerPort: 3001
          envFrom:
            - configMapRef:
                name: emc-api-config
            - secretRef:
                name: emc-api-secrets
          resources:
            requests:
              cpu: 250m
              memory: 256Mi
            limits:
              cpu: 1000m
              memory: 1024Mi
          livenessProbe:
            httpGet:
              path: /health
              port: 3001
            initialDelaySeconds: 15
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /health
              port: 3001
            initialDelaySeconds: 5
            periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: emc-api-service
  namespace: production
spec:
  type: ClusterIP
  selector:
    app: emc-api
  ports:
    - port: 80
      targetPort: 3001
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: emc-api-hpa
  namespace: production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: emc-api
  minReplicas: 3
  maxReplicas: 15
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 75
```

---

## 5. Reverse Proxy Configuration (Nginx)

```nginx
upstream emc_backend {
    server 127.0.0.1:3001;
    keepalive 64;
}

server {
    listen 80;
    server_name api.yourdomain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.yourdomain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    client_max_body_size 15M;

    location / {
        proxy_pass http://emc_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
```

---

## 6. Security Hardening Checklist

1. **Non-Root Execution**: Container runs under unprivileged UID `1001` (`appuser`).
2. **Secrets Isolation**: Secrets (`JWT_ACCESS_SECRET`, `DATABASE_URL`) stored in Kubernetes Secrets or HashiCorp Vault.
3. **Input Sanitization**: TypeBox compile-time schema validation prevents prototype pollution and malformed payloads.
4. **Rate Limiting**: Sliding window counter prevents brute force on `/api/auth/*` and DDoS on public search endpoints.
5. **Security Headers**: Standard CSP, HSTS, `X-Content-Type-Options: nosniff`, and `X-Frame-Options: DENY` on all responses.
6. **SQL Injection Defense**: Prisma ORM executes parameterized queries for 100% of database interactions.
7. **Audit Logging**: Every sensitive mutation (approvals, refunds, password changes) writes immutable audit trails to `audit_logs`.

---

## 7. Backup & Disaster Recovery

### PostgreSQL Automated Backup (Cron)
```bash
#!/bin/bash
BACKUP_DIR="/backups/postgres"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

docker exec -t emc_ecommerce_postgres pg_dump -U postgres -F c emc_ecommerce > "$BACKUP_DIR/emc_backup_$DATE.dump"

# Retain last 14 days
find $BACKUP_DIR -type f -mtime +14 -name "*.dump" -delete
```

### Restore Procedure
```bash
docker exec -i emc_ecommerce_postgres pg_restore -U postgres -d emc_ecommerce --clean < /backups/postgres/emc_backup_20261002.dump
```
