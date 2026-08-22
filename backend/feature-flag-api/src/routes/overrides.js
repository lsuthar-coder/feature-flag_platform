// src/routes/overrides.js
// ─────────────────────────────────────────────
// Per-user override management.
//
// POST   /flags/:name/overrides            force userId to a variant
// DELETE /flags/:name/overrides/:userId    remove override
//
// Primary use case: internal testing.
//   Set your own userId to always see "v3" while 90% of
//   real users still see "v1" via weight-based assignment.
//
// On write: only invalidates the specific user's eval cache.
// Other users' cached evaluations are unaffected.
// ─────────────────────────────────────────────
'use strict';

const express  = require('express');
const router   = express.Router();
const db       = require('../db/postgres');
const { invalidateUserEval }   = require('../cache/redis');
const { jwtMiddleware }        = require('../middleware/jwt');
const { writeAudit }           = require('../notifications/audit');
const { publishFlagEvent }     = require('../queue/azure');
const metrics                  = require('../metrics');

// ── POST /flags/:name/overrides ────────────────────────────────────────────
// Force a specific userId to always get a specific variant.
// If an override already exists for this userId, it is replaced (UPSERT).
router.post('/:name/overrides', jwtMiddleware, async (req, res) => {
  const { userId, variantKey } = req.body;

  if (!userId || !variantKey) {
    return res.status(400).json({ error: 'userId and variantKey are required' });
  }

  try {
    // Get flag
    const flagResult = await db.query('SELECT * FROM flags WHERE name=$1', [req.params.name]);
    if (!flagResult.rows.length) return res.status(404).json({ error: 'Flag not found' });
    const flag = flagResult.rows[0];

    // Validate that variantKey exists for this flag
    const variantResult = await db.query(
      'SELECT * FROM flag_variants WHERE flag_id=$1 AND key=$2',
      [flag.id, variantKey]
    );
    if (!variantResult.rows.length) {
      return res.status(400).json({
        error: `Variant '${variantKey}' does not exist for flag '${req.params.name}'`,
      });
    }

    // Upsert: update if exists, insert if not
    await db.query(
      `INSERT INTO flag_overrides (flag_id, user_id, variant_key, created_by)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT (flag_id, user_id)
       DO UPDATE SET variant_key=$3, created_by=$4`,
      [flag.id, userId, variantKey, req.user.email]
    );

    // Only invalidate THIS user's evaluation cache
    await invalidateUserEval(flag.name, userId);

    // Audit + queue
    await writeAudit(flag, 'override_added', req.user.email, null, { userId, variantKey });
    publishFlagEvent({
      flagName: flag.name,
      action:   'override_added',
      changedBy: req.user.email,
      details:  { userId, variantKey },
    }).catch(err => console.error('Queue publish failed:', err.message));

    metrics.writes.inc({ action: 'override_added' });
    res.status(201).json({
      flag:       flag.name,
      userId,
      variantKey,
      message:    `User ${userId} will always get variant '${variantKey}'`,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /flags/:name/overrides/:userId ──────────────────────────────────
// Remove an override. The user goes back to weight-based assignment.
router.delete('/:name/overrides/:userId', jwtMiddleware, async (req, res) => {
  try {
    const flagResult = await db.query('SELECT * FROM flags WHERE name=$1', [req.params.name]);
    if (!flagResult.rows.length) return res.status(404).json({ error: 'Flag not found' });
    const flag = flagResult.rows[0];

    const deleteResult = await db.query(
      'DELETE FROM flag_overrides WHERE flag_id=$1 AND user_id=$2 RETURNING *',
      [flag.id, req.params.userId]
    );
    if (!deleteResult.rows.length) {
      return res.status(404).json({ error: 'Override not found' });
    }

    // Only invalidate that user's eval cache
    await invalidateUserEval(flag.name, req.params.userId);

    // Audit + queue
    await writeAudit(flag, 'override_removed', req.user.email,
      { userId: req.params.userId, variantKey: deleteResult.rows[0].variant_key }, null
    );
    publishFlagEvent({
      flagName:  flag.name,
      action:    'override_removed',
      changedBy: req.user.email,
      details:   { userId: req.params.userId },
    }).catch(err => console.error('Queue publish failed:', err.message));

    metrics.writes.inc({ action: 'override_removed' });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
