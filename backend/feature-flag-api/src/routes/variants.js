// src/routes/variants.js
// ─────────────────────────────────────────────
// Variant management routes.
//
// POST   /flags/:name/variants           add variant
// PUT    /flags/:name/variants/:key      update weight or value
// DELETE /flags/:name/variants/:key      remove variant
//
// All require JWT. No admin role needed —
// any authenticated user can manage variants.
//
// On every write: invalidates both Redis cache layers
// so all users get re-evaluated on next request.
// ─────────────────────────────────────────────
'use strict';

const express  = require('express');
const router   = express.Router();
const db       = require('../db/postgres');
const { invalidateFlag }       = require('../cache/redis');
const { jwtMiddleware }        = require('../middleware/jwt');
const { writeAudit }           = require('../notifications/audit');
const { publishFlagEvent }     = require('../queue/azure');
const metrics                  = require('../metrics');

// Helper: fetch flag by name, return 404 if not found
async function fetchFlag(name, res) {
  const result = await db.query('SELECT * FROM flags WHERE name=$1', [name]);
  if (!result.rows.length) {
    res.status(404).json({ error: 'Flag not found' });
    return null;
  }
  return result.rows[0];
}

// Helper: get all variants for a flag and compute total weight
async function getVariantsWithTotal(flagId) {
  const result = await db.query(
    'SELECT * FROM flag_variants WHERE flag_id=$1 ORDER BY sort_order', [flagId]
  );
  const total = result.rows.reduce((sum, v) => sum + v.weight, 0);
  return { variants: result.rows, total };
}

// ── POST /flags/:name/variants ─────────────────────────────────────────────
// Add a new variant to a flag.
// Validates that total weights stay ≤ 100 after adding.
router.post('/:name/variants', jwtMiddleware, async (req, res) => {
  const flag = await fetchFlag(req.params.name, res);
  if (!flag) return;

  const {
    key,
    value,
    weight      = 0,
    isDefault   = false,
    sortOrder   = 99,
  } = req.body;

  if (!key || value === undefined) {
    return res.status(400).json({ error: 'key and value are required' });
  }
  if (weight < 0 || weight > 100) {
    return res.status(400).json({ error: 'weight must be between 0 and 100' });
  }

  try {
    // Check that adding this weight won't exceed 100
    const { variants: existing, total } = await getVariantsWithTotal(flag.id);
    if (total + weight > 100) {
      return res.status(400).json({
        error: `Weights would total ${total + weight}. Reduce another variant's weight first.`,
        current_total: total,
      });
    }

    const result = await db.query(
      `INSERT INTO flag_variants (flag_id, key, value, weight, is_default, sort_order)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [flag.id, key, value, weight, isDefault, sortOrder]
    );
    const variant = result.rows[0];

    // Invalidate all caches — weights changed, everyone gets re-evaluated
    await invalidateFlag(flag.name);

    // Audit: snapshot old variants and new variants
    const { variants: newVariants } = await getVariantsWithTotal(flag.id);
    await writeAudit(flag, 'variants_updated', req.user.email,
      { variants: existing },
      { variants: newVariants }
    );
    publishFlagEvent({ flagName: flag.name, action: 'variants_updated', changedBy: req.user.email })
      .catch(err => console.error('Queue publish failed:', err.message));

    metrics.writes.inc({ action: 'variant_added' });
    res.status(201).json(variant);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: `Variant key '${key}' already exists` });
    res.status(500).json({ error: err.message });
  }
});

// ── PUT /flags/:name/variants/:key ─────────────────────────────────────────
// Update a variant's weight or value.
// Changing weight shifts bucket boundaries — some users change variants.
router.put('/:name/variants/:key', jwtMiddleware, async (req, res) => {
  const flag = await fetchFlag(req.params.name, res);
  if (!flag) return;

  const { weight, value, isDefault, sortOrder } = req.body;

  try {
    // Get current variants for validation and audit
    const { variants: before } = await getVariantsWithTotal(flag.id);
    const current = before.find(v => v.key === req.params.key);
    if (!current) return res.status(404).json({ error: `Variant '${req.params.key}' not found` });

    // Validate new total weight if weight is being changed
    if (weight !== undefined) {
      const otherWeights = before
        .filter(v => v.key !== req.params.key)
        .reduce((sum, v) => sum + v.weight, 0);
      if (otherWeights + weight > 100) {
        return res.status(400).json({
          error: `Weights would total ${otherWeights + weight}. Max is 100.`,
        });
      }
    }

    // Build dynamic update
    const fields = [];
    const vals   = [];
    let idx = 1;
    if (weight     !== undefined) { fields.push(`weight=$${idx++}`);      vals.push(weight); }
    if (value      !== undefined) { fields.push(`value=$${idx++}`);       vals.push(value); }
    if (isDefault  !== undefined) { fields.push(`is_default=$${idx++}`);  vals.push(isDefault); }
    if (sortOrder  !== undefined) { fields.push(`sort_order=$${idx++}`);  vals.push(sortOrder); }

    if (fields.length === 0) return res.status(400).json({ error: 'Nothing to update' });

    vals.push(flag.id, req.params.key);
    const result = await db.query(
      `UPDATE flag_variants SET ${fields.join(',')}
       WHERE flag_id=$${idx++} AND key=$${idx} RETURNING *`,
      vals
    );
    const updated = result.rows[0];

    // Invalidate caches
    await invalidateFlag(flag.name);

    const { variants: after } = await getVariantsWithTotal(flag.id);
    await writeAudit(flag, 'variants_updated', req.user.email,
      { variants: before }, { variants: after }
    );
    publishFlagEvent({ flagName: flag.name, action: 'variants_updated', changedBy: req.user.email })
      .catch(err => console.error('Queue publish failed:', err.message));

    metrics.writes.inc({ action: 'variant_updated' });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /flags/:name/variants/:key ──────────────────────────────────────
// Remove a variant. Cannot remove the default if others exist.
router.delete('/:name/variants/:key', jwtMiddleware, async (req, res) => {
  const flag = await fetchFlag(req.params.name, res);
  if (!flag) return;

  try {
    const { variants: before } = await getVariantsWithTotal(flag.id);
    const target = before.find(v => v.key === req.params.key);
    if (!target) return res.status(404).json({ error: `Variant '${req.params.key}' not found` });

    // Guard: cannot remove the default variant if others remain (no fallback)
    if (target.is_default && before.length > 1) {
      return res.status(400).json({
        error: 'Cannot delete the default variant while other variants exist. Set another variant as default first.',
      });
    }

    await db.query('DELETE FROM flag_variants WHERE flag_id=$1 AND key=$2', [flag.id, req.params.key]);

    await invalidateFlag(flag.name);

    const { variants: after } = await getVariantsWithTotal(flag.id);
    await writeAudit(flag, 'variants_updated', req.user.email,
      { variants: before }, { variants: after }
    );
    publishFlagEvent({ flagName: flag.name, action: 'variants_updated', changedBy: req.user.email })
      .catch(err => console.error('Queue publish failed:', err.message));

    metrics.writes.inc({ action: 'variant_deleted' });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
