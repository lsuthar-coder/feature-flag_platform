# Feature Flag Service

Feature flag management service for the lsuthar.in platform. Supports boolean, string, number, and multivariate flags with variant weights for canary deployments.

**Live:** https://flags.lsuthar.in/health

---

## Features

- **4 Flag Types** — `boolean`, `string`, `number`, `multivariate`
- **Variant Weights** — Percentage-based traffic splitting for canary releases
- **Environment Support** — Flags scoped per environment (production, staging)
- **Audit Log** — Every flag change recorded with timestamp and actor
- **Redis Caching** — Flag evaluations cached to reduce DB load
- **Override System** — Per-user flag overrides for testing

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/flags` | Bearer | List all flags |
| `POST` | `/flags` | Bearer | Create flag |
| `GET` | `/flags/:id` | Bearer | Get flag by ID |
| `PUT` | `/flags/:id` | Bearer | Update flag |
| `DELETE` | `/flags/:id` | Bearer | Delete flag |
| `POST` | `/flags/:id/evaluate` | Bearer | Evaluate flag for user |
| `GET` | `/flags/:id/variants` | Bearer | List variants |
| `GET` | `/health` | None | Health check |

## Seed Flags

| Name | Type | Description |
|------|------|-------------|
| `dark-mode` | boolean | Enables dark theme in dashboard |
| `service-version` | multivariate | Routes traffic between v1/v2/v3 |
| `pdf-compress` | boolean | Enable PDF compression (free tier) |
| `pdf-merge` | boolean | Enable PDF merge (premium tier) |
| `pdf-split` | boolean | Enable PDF split (premium tier) |
| `docx-to-pdf` | boolean | Enable DOCX conversion (free tier) |
| `img-to-pdf` | boolean | Enable image to PDF (premium tier) |
| `max-file-size` | number | Max upload size in MB (free: 5, premium: 50) |
| `storage-days` | number | File retention in days (free: 1, premium: 7) |

## Flag Evaluation

```json
POST /flags/pdf-merge/evaluate
{
  "userId": "uuid",
  "context": { "environment": "production" }
}

Response:
{
  "flagName": "pdf-merge",
  "variant": "on",
  "value": "false",
  "reason": "DEFAULT"
}
```

## Per-User Overrides

Override a flag for a specific user (e.g. grant premium access):

```bash
POST /flags/pdf-merge/overrides
{
  "userId": "uuid",
  "value": true
}
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection URL |
| `PUBLIC_KEY_PEM` | RS256 public key for JWT verification |
| `PORT` | Server port (default: 4000) |

## Local Development

```bash
npm install
cp .env.example .env
npm start
```

## Docker

```bash
docker buildx build --platform linux/amd64 \
  -t ghcr.io/lsuthar-coder/feature-flag-service:latest \
  --push .
```

## CI/CD

- **CI** — GitHub Actions: lint, test, Docker build and push to GHCR on every push to `main`
- **CD** — Jenkins: triggered by GitHub Actions after successful CI, deploys to K8s via `kubectl set image`

## Deployment

Deployed on **K3s** (Contabo VPS, `167.86.90.32`) in the `platform` namespace.

Secrets stored in Kubernetes secret `feature-flag-secrets`:
- PostgreSQL connection string
- Redis URL
- RSA public key (for JWT verification)

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
- ioredis
- pg (PostgreSQL)
- jsonwebtoken (RS256 verification)