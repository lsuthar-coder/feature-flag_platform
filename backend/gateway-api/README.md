# API Gateway

Production-grade API Gateway for the lsuthar.in platform. Routes requests across Auth, Feature Flag, PDF, and Audio services with JWT verification, rate limiting, circuit breaking, and canary deployments driven by feature flags.

**Live:** https://api.lsuthar.in/health

---

## Architecture

```
Client → Nginx Ingress → API Gateway → Auth Service          (http://auth-service.platform.svc.cluster.local:5000/auth)
                                     → Feature Flag Service  (http://feature-flag-service.platform.svc.cluster.local:4000/flags)
                                     → PDF Service           (http://pdf-service.platform.svc.cluster.local:6000/pdf)
                                     → Audio Service         (http://13.63.189.209:3001)
```

## Middleware Pipeline

```
requestId → requestLogger → CORS → jwtVerify → requireRoute → rateLimiter → circuitBreaker → resolveUpstream → dynamicProxy
```

## Features

- **JWT Verification** — RS256 public key fetched from Auth Service at startup
- **Dynamic Routing** — Routes loaded from PostgreSQL, reloaded every 30s (zero downtime)
- **Rate Limiting** — Redis sliding-window counter per user per minute per route
- **Circuit Breaker** — CLOSED / OPEN / HALF_OPEN states per upstream, stored in Redis
- **Canary Routing** — Feature flag-driven upstream selection for A/B deployments
- **Path Rewrite** — Strips route prefix before proxying to upstream
- **Slack Alerts** — Circuit breaker events sent to `#platform-alerts`
- **Admin API** — Protected admin routes for runtime route management

## Public Routes (no JWT required)

| Path | Description |
|------|-------------|
| `POST /auth/login` | User login |
| `POST /auth/register` | User registration |
| `POST /auth/refresh` | Token refresh |
| `GET /auth/public-key` | JWT public key |
| `GET /health` | Gateway health check |

## Routes Table

Routes are stored in PostgreSQL and reloaded every 30 seconds:

| Prefix | Upstream | Rate Limit |
|--------|----------|------------|
| `/auth` | `http://auth-service.platform.svc.cluster.local:5000/auth` | 20/min |
| `/flags` | `http://feature-flag-service.platform.svc.cluster.local:4000/flags` | 60/min |
| `/pdf` | `http://pdf-service.platform.svc.cluster.local:6000` | 30/min |
| `/audio` | `http://13.63.189.209:3001` | 10/min |

## Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection URL |
| `AUTH_SERVICE_URL` | Auth service URL for public key fetch at startup |
| `FLAG_SERVICE_URL` | Feature flag service URL |
| `SLACK_WEBHOOK_URL` | Slack webhook for circuit breaker alerts |
| `PORT` | Server port (default: 3000) |

## Local Development

```bash
npm install
cp .env.example .env
npm start
```

## Docker

```bash
docker buildx build --platform linux/amd64 \
  -t ghcr.io/lsuthar-coder/api-gateway:latest \
  --push .
```

## CI/CD

- **CI** — GitHub Actions: lint, test, Docker build and push to GHCR on every push to `main`
- **CD** — Jenkins: triggered by GitHub Actions after successful CI, deploys to K8s via `kubectl set image`

## Deployment

Deployed on **K3s** (Contabo VPS, `167.86.90.32`) in the `platform` namespace.

Secrets stored in Kubernetes secret `api-gateway-secrets`:
- PostgreSQL connection string
- Redis URL
- Slack webhook URL

K8s manifests live in `k8s/`:
```
k8s/
├── deployment.yaml
├── service.yaml
└── ingress.yaml
```

Apply manually:
```bash
kubectl apply -f k8s/
```

See [DEPLOYMENT.md](./DEPLOYMENT.md) for full deployment steps.

## Tech Stack

- Node.js + Express
- http-proxy-middleware v3
- ioredis
- pg (PostgreSQL)
- jsonwebtoken (RS256)