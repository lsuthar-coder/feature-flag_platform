// src/routes/flags.js
// ─────────────────────────────────────────────
// Flag CRUD and evaluation routes.
//
// Public (no auth):
//   GET  /flags/:name/status      legacy boolean check
//   GET  /flags/:name/evaluate    variant evaluation for userId
//
// JWT required (any role):
//   GET  /flags                   list all flags
//   POST /flags                   create flag
//   GET  /flags/:name             get one flag + variants
//   PUT  /flags/:name             update flag metadata
//
// Admin JWT required:
//   DELETE /flags/:name           delete flag + cascade
// ─────────────────────────────────────────────
'use strict';

const express  = require('express');
const router   = express.Router();
const db       = require('../db/postgres');
const { getFlag, evaluateFlag, invalidateFlag } = require('../cache/redis');
const { jwtMiddleware, adminMiddleware }         = require('../middleware/jwt');
const { writeAudit }   = require('../notifications/audit');
const { publishFlagEvent } = require('../queue/azure');
const metrics  = require('../metrics');

// ── GET /flags ─────────────────────────────────────────────────────────────
// List all flags including their variants array.
// No Redis cache — this is the admin list view, always fresh from DB.
router.get('/', jwtMiddleware, async (req, res) => {
  try {
    const { environment } = req.query;

    // Fetch all flags
    const flagsQuery = environment
      ? 'SELECT * FROM flags WHERE environment=$1 ORDER BY name ASC'
      : 'SELECT * FROM flags ORDER BY name ASC';
    const flagsResult = await db.query(flagsQuery, environment ? [environment] : []);

    // Fetch all variants in one query, then group by flag_id
    const variantsResult = await db.query(
      'SELECT * FROM flag_variants ORDER BY flag_id, sort_order'
    );
    const variantsByFlag = {}; 
    for (const v of variantsResult.rows) {
      if (!variantsByFlag[v.flag_id]) variantsByFlag[v.flag_id] = []; // if key not present in variantsByFlag, then add it with value []
      variantsByFlag[v.flag_id].push(v);
    }

    // Attach variants to each flag
    const flags = flagsResult.rows.map(f => ({
      ...f,
      variants: variantsByFlag[f.id] || [],
    }));

    res.json(flags);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /flags ────────────────────────────────────────────────────────────
// Create a new flag. Variants are added separately via POST /flags/:name/variants.
router.post('/', jwtMiddleware, async (req, res) => {
  const { name, description, flag_type = 'boolean', environment = 'production' } = req.body;

  // Validate name: lowercase letters, numbers, hyphens only
  if (!name || !/^[a-z0-9-]+$/.test(name)) {
    return res.status(400).json({
      error: 'Flag name must be lowercase letters, numbers, and hyphens only',
    });
  }

  // Validate flag_type
  const validTypes = ['boolean', 'string', 'number', 'multivariate'];
  if (!validTypes.includes(flag_type)) {
    return res.status(400).json({ error: `flag_type must be one of: ${validTypes.join(', ')}` });
  }

  try {
    const result = await db.query(
      `INSERT INTO flags (name, description, flag_type, environment)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [name, description || null, flag_type, environment]
    );
    const flag = result.rows[0];

    // If it's a boolean flag, auto-create on/off variants as convenience
    if (flag_type === 'boolean') {
      await db.query(
        `INSERT INTO flag_variants (flag_id, key, value, weight, is_default, sort_order)
         VALUES ($1,'on','true',0,true,1), ($1,'off','false',100,false,2)`,
        [flag.id]
      );
    }

    // Audit log 
    await writeAudit(flag, 'created', req.user.email, null, flag);

    // queue notification (send the entry in AzureStorageQueue - a buffer, and the msg is consumed by other azure services)
    publishFlagEvent({ flagName: name, action: 'created', changedBy: req.user.email, environment })
      .catch(err => console.error('Queue publish failed:', err.message));

    metrics.writes.inc({ action: 'created' });

    // Return flag with empty variants (or auto-created boolean variants)
    const variantsResult = await db.query(
      'SELECT * FROM flag_variants WHERE flag_id=$1 ORDER BY sort_order', [flag.id]
    );
    res.status(201).json({ ...flag, variants: variantsResult.rows });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Flag name already exists' });
    res.status(500).json({ error: err.message });
  }
});

// ── GET /flags/:name ───────────────────────────────────────────────────────
// Get one flag with all its variants and overrides.
// Always fresh from DB (admin view — no cache).
router.get('/:name', jwtMiddleware, async (req, res) => {
  try {
    const flagResult = await db.query(
      'SELECT * FROM flags WHERE name=$1', [req.params.name]
    );
    if (!flagResult.rows.length) return res.status(404).json({ error: 'Flag not found' });

    const flag = flagResult.rows[0];

    const [variantsResult, overridesResult] = await Promise.all([
      db.query('SELECT * FROM flag_variants WHERE flag_id=$1 ORDER BY sort_order', [flag.id]),
      db.query('SELECT * FROM flag_overrides WHERE flag_id=$1', [flag.id]),
    ]);

    res.json({
      ...flag,
      variants:  variantsResult.rows,
      overrides: overridesResult.rows,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PUT /flags/:name ───────────────────────────────────────────────────────
// Update flag metadata (description, environment).
// To change variants use PUT /flags/:name/variants/:key.
router.put('/:name', jwtMiddleware, async (req, res) => {
  const { description, environment } = req.body;

  try {
    // Fetch current state for audit log old_value
    const current = await db.query('SELECT * FROM flags WHERE name=$1', [req.params.name]);
    if (!current.rows.length) return res.status(404).json({ error: 'Flag not found' });

    const updates = [];
    const values  = [];
    let idx = 1;

    if (description !== undefined) { updates.push(`description=$${idx++}`); values.push(description); }
    if (environment  !== undefined) { updates.push(`environment=$${idx++}`);  values.push(environment); }

    if (updates.length === 0) return res.status(400).json({ error: 'Nothing to update' });

    values.push(req.params.name);
    const result = await db.query(
      `UPDATE flags SET ${updates.join(',')} WHERE name=$${idx} RETURNING *`, values
    );
    const updated = result.rows[0];

    // Invalidate both cache layers
    await invalidateFlag(req.params.name);

    // Audit + queue
    await writeAudit(updated, 'updated', req.user.email, current.rows[0], updated);
    publishFlagEvent({ flagName: updated.name, action: 'updated', changedBy: req.user.email, environment: updated.environment })
      .catch(err => console.error('Queue publish failed:', err.message));

    metrics.writes.inc({ action: 'updated' });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /flags/:name ────────────────────────────────────────────────────
// Delete flag. CASCADE removes all variants and overrides.
// Admin role required.
router.delete('/:name', adminMiddleware, async (req, res) => {
  try {
    const current = await db.query('SELECT * FROM flags WHERE name=$1', [req.params.name]);
    if (!current.rows.length) return res.status(404).json({ error: 'Flag not found' });

    const flag = current.rows[0];


    // Audit + queue
    await writeAudit(flag, 'deleted', req.user.email, flag, null);
    publishFlagEvent({ flagName: flag.name, action: 'deleted', changedBy: req.user.email })
      .catch(err => console.error('Queue publish failed:', err.message));
    
    // Delete the flag — ON DELETE CASCADE removes variants and overrides
    await db.query('DELETE FROM flags WHERE id=$1', [flag.id]);

    // Invalidate all caches for this flag
    await invalidateFlag(flag.name);

    metrics.writes.inc({ action: 'deleted' });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════
// EVALUATION ENDPOINTS — public, no JWT required
// Called by any service in the platform that needs to read a flag.
// ══════════════════════════════════════════════════════════════════════════

// ── GET /flags/:name/status ────────────────────────────────────────────────
// Legacy boolean endpoint. Kept for services that haven't migrated to /evaluate.
// Returns { name, enabled, environment } — simple true/false.
// Uses layer-1 Redis cache (flag:{name}).
router.get('/:name/status', async (req, res) => {
  try {
    const environment = req.query.environment || 'production';
    const flag        = await getFlag(req.params.name, environment);

    if (!flag) return res.status(404).json({ error: 'Flag not found' });

    // For boolean flags: check if the 'on' variant has weight > 0
    // For other types: enabled = any variant has weight > 0
    res.json({
      name:        flag.name,
      enabled:     flag.enabled || false,
      environment: flag.environment,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /flags/:name/evaluate ──────────────────────────────────────────────
// Evaluate a flag for a specific userId. Returns the variant.
// Same userId always gets same variant (consistent hash).
// Uses both cache layers (flag + per-user evaluation).
router.get('/:name/evaluate', async (req, res) => {
  try {
    const userId      = req.query.userId      || null;
    const environment = req.query.environment || 'production';

    const variant = await evaluateFlag(req.params.name, { userId, environment });
    if (!variant) return res.status(404).json({ error: 'Flag not found' });

    res.json({
      flag:    req.params.name,
      variant: variant.key,    // e.g. "aac", "v1", "on"
      value:   variant.value,  // what the caller uses in their code
      reason:  variant.reason, // "weight" | "override" | "default"
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
