// src/db/redis.js
// ─────────────────────────────────────────────
// Shared Redis client using ioredis.
//
// Used for two purposes:
//   1. Flag object cache:      flag:{name}              TTL 30s
//   2. Per-user eval cache:    flag-eval:{name}:{userId} TTL 30s
//
// Both caches are invalidated (DEL) on every write operation
// so flag changes take effect within 1 request (not 30s).
// ─────────────────────────────────────────────
'use strict';

const Redis = require('ioredis');

const redis = new Redis(process.env.REDIS_URL || 'redis://redis-master:6379', {
  maxRetriesPerRequest: 3,
  retryStrategy: (times) => Math.min(times * 50, 2_000),
});

redis.on('error',   (err) => console.error(JSON.stringify({ event: 'redis_error',     error: err.message })));
redis.on('connect', ()    => console.log  (JSON.stringify({ event: 'redis_connected' })));

module.exports = redis;
