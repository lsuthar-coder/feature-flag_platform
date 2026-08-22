// src/routes/audit.js
// ─────────────────────────────────────────────
// Audit log route.
//
// GET /audit       list all flag changes (JWT required)
//
// Query params:
//   flag_id    filter to one flag's history
//   limit      max rows (default 50)
//   from       start date (ISO string)
//   to         end date   (ISO string)
//
// Every create/update/delete/toggle/variant change/override
// change writes a row here with JSONB old_value + new_value.
// ─────────────────────────────────────────────
'use strict';

const express = require('express');
const router  = express.Router();
const db      = require('../db/postgres');
const { jwtMiddleware } = require('../middleware/jwt');

// ── GET /audit ─────────────────────────────────────────────────────────────
router.get('/', jwtMiddleware, async (req, res) => {
  const { flag_id, limit = 50, from, to } = req.query;

  const conditions = [];
  const values     = [];
  let   idx = 1;

  if (flag_id) {
    conditions.push(`flag_id = $${idx++}`);
    values.push(flag_id);
  }
  if (from) {
    conditions.push(`changed_at >= $${idx++}`);
    values.push(new Date(from));
  }
  if (to) {
    conditions.push(`changed_at <= $${idx++}`);
    values.push(new Date(to));
  }

  const where  = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const cap    = Math.min(parseInt(limit) || 50, 500); // max 500 rows
  values.push(cap);

  try {
    const result = await db.query(
      `SELECT
         id, flag_id, flag_name, action,
         old_value, new_value,
         changed_by, changed_at
       FROM flag_audit
       ${where}
       ORDER BY changed_at DESC
       LIMIT $${idx}`,
      values
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
