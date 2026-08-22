// src/cache/redis.js
// ─────────────────────────────────────────────
// Two-layer flag evaluation cache.
//
// Layer 1 — flag:{name}
//   Stores the full flag object + variants array as JSON.
//   Shared across all users. One DB query per 30s window
//   regardless of how many users call the same flag.
//
// Layer 2 — flag-eval:{name}:{userId}
//   Stores the evaluated variant for one specific user.
//   Sub-millisecond on cache hit. TTL 30s.
//
// Invalidation strategy:
//   - Any write to a flag or its variants:
//       DEL flag:{name}  +  DEL flag-eval:{name}:* (all users)
//   - Override added/removed for a specific userId:
//       DEL flag-eval:{name}:{userId}  (only that user)
//
// evaluateFlag algorithm:
//   1. Check layer-2 cache (flag-eval:{name}:{userId})
//   2. Check layer-1 cache (flag:{name}) for flag + variants
//   3. If neither cached: query PostgreSQL, populate both caches
//   4. Check flag_overrides table for this userId
//   5. Hash userId % 100 to get bucket (0-99)
//   6. Walk variants in sort_order, accumulate weights
//      until cumulative weight > bucket
//   7. Fallback to is_default=true variant
//   8. Cache result in layer-2, return variant
// ─────────────────────────────────────────────
'use strict';

const redis   = require('../db/redis');
const db      = require('../db/postgres');
const metrics = require('../metrics');

const FLAG_TTL      = 30; // seconds
const EVAL_TTL      = 30; // seconds

// ── Public API ────────────────────────────────────────────────────────────

/**
 * Get a single flag by name (no userId, no variant evaluation).
 * Used by the legacy /status endpoint and by flag CRUD reads.
 * Layer-1 cache only.
 */
async function getFlag(name, environment = 'production') {
  const cacheKey = `flag:${name}:${environment}`;

  // Try cache first
  const cached = await redis.get(cacheKey);
  if (cached) {
    metrics.evaluations.inc({ flag_name: name, result: 'hit' });
    return JSON.parse(cached);
  }

  // Cache miss — query PostgreSQL
  const result = await db.query(
    'SELECT * FROM flags WHERE name = $1 AND environment = $2',
    [name, environment]
  );
  if (!result.rows.length) return null;

  await redis.setex(cacheKey, FLAG_TTL, JSON.stringify(result.rows[0]));
  metrics.evaluations.inc({ flag_name: name, result: 'miss' });
  return result.rows[0];
}

/**
 * Evaluate a flag for a specific user.
 * Returns the variant object: { id, flag_id, key, value, weight, is_default }
 *
 * @param {string} flagName
 * @param {{ userId?: string, environment?: string }} context
 */
async function evaluateFlag(flagName, context = {}) {
  const userId      = context.userId  || 'anon';
  const environment = context.environment || 'production';

  // ── Layer 2: Per-user evaluation cache ──────────────────────────────────
  const evalKey = `flag-eval:${flagName}:${userId}`;
  const cachedEval = await redis.get(evalKey);
  if (cachedEval) {
    metrics.evaluations.inc({ flag_name: flagName, result: 'hit' });
    return JSON.parse(cachedEval);
  }

  // ── Layer 1: Flag + variants cache ──────────────────────────────────────
  const flagKey    = `flag:${flagName}:${environment}`;
  let   flagData   = null;
  const cachedFlag = await redis.get(flagKey);

  if (cachedFlag) {
    flagData = JSON.parse(cachedFlag);
  } else {
    // Full PostgreSQL query: flag row + all variants
    const flagResult = await db.query(
      'SELECT * FROM flags WHERE name = $1 AND environment = $2',
      [flagName, environment]
    );
    if (!flagResult.rows.length) return null;

    const variantsResult = await db.query(
      'SELECT * FROM flag_variants WHERE flag_id = $1 ORDER BY sort_order ASC',
      [flagResult.rows[0].id]
    );

    flagData = {
      ...flagResult.rows[0],
      variants: variantsResult.rows,
    };

    // Populate layer-1 cache
    await redis.setex(flagKey, FLAG_TTL, JSON.stringify(flagData));
    metrics.evaluations.inc({ flag_name: flagName, result: 'miss' });
  }

  const { id: flagId, variants } = flagData;
  if (!variants || variants.length === 0) return null;

  // ── Check per-user override ──────────────────────────────────────────────
  if (userId !== 'anon') {
    const overrideResult = await db.query(
      'SELECT * FROM flag_overrides WHERE flag_id = $1 AND user_id = $2',
      [flagId, userId]
    );
    if (overrideResult.rows.length) {
      const variant = variants.find(v => v.key === overrideResult.rows[0].variant_key);
      if (variant) {
        const result = { ...variant, reason: 'override' };
        await redis.setex(evalKey, EVAL_TTL, JSON.stringify(result));
        return result;
      }
    }
  }

  // ── Hash userId → bucket 0-99 ────────────────────────────────────────────
  // Anonymous users get a random bucket (no stable assignment needed)
  const bucket = userId === 'anon'
    ? Math.floor(Math.random() * 100)
    : hashUserId(userId) % 100;

  // ── Walk variants, accumulate weights ────────────────────────────────────
  // Example weights: mp3=70, aac=20, opus=10
  //   bucket=15 → cumulative hits 70 first  → mp3
  //   bucket=75 → cumulative hits 90 second → aac
  //   bucket=95 → cumulative hits 100 third → opus
  let cumulative = 0;
  for (const variant of variants) {
    cumulative += variant.weight;
    if (bucket < cumulative) {
      const result = { ...variant, reason: 'weight' };
      await redis.setex(evalKey, EVAL_TTL, JSON.stringify(result));
      return result;
    }
  }

  // ── Fallback to default variant ──────────────────────────────────────────
  const def = variants.find(v => v.is_default) || variants[0];
  const result = { ...def, reason: 'default' };
  await redis.setex(evalKey, EVAL_TTL, JSON.stringify(result));
  return result;
}

/**
 * Invalidate flag cache and ALL per-user evaluation caches for a flag.
 * Called on any write to the flag, its variants, or any config change.
 */
async function invalidateFlag(name, environment = 'production') {
  // Delete the flag-level cache
  await redis.del(`flag:${name}:${environment}`);

  // Delete all per-user evaluation caches using SCAN
  // Redis does not support wildcard DEL — SCAN is the safe pattern
  const pattern = `flag-eval:${name}:*`;
  let   cursor  = '0';
  do {
    const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100); // returns [newCursor, [keys]]
    cursor = nextCursor;
    if (keys.length) await redis.del(...keys);
  } while (cursor !== '0');
}

/**
 * Invalidate only ONE user's evaluation cache.
 * Called when an override is added or removed for a specific userId.
 * Other users' cached evaluations are unaffected.
 */
async function invalidateUserEval(name, userId) {
  await redis.del(`flag-eval:${name}:${userId}`);
}

// ── Deterministic hash ────────────────────────────────────────────────────
// Same userId always maps to the same 0-9999 number.
// Modulo 100 gives a bucket in [0, 99].
// Simple polynomial hash — fast and consistent across Node.js restarts.
function hashUserId(userId) {
  let h = 0;
  for (const c of String(userId)) {
    h = (h * 31 + c.charCodeAt(0)) % 10_000;
  }
  return Math.abs(h);
}

module.exports = { getFlag, evaluateFlag, invalidateFlag, invalidateUserEval };
