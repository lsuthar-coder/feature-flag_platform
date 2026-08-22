FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY src/ ./src/
COPY migrations/ ./migrations/

FROM node:20-alpine AS runtime

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/src ./src
COPY --from=builder /app/migrations ./migrations

RUN chown -R appuser:appgroup /app

USER appuser

EXPOSE 3000

HEALTHCHECK --interval=15s --timeout=3s --start-period=15s \
  CMD wget -qO- http://localhost:3000/health || exit 1

CMD ["node", "src/index.js"]