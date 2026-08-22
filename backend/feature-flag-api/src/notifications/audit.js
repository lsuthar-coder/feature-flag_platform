// src/notifications/audit.js
// ─────────────────────────────────────────────
// Shared helper for writing to the flag_audit table.
// Called after every write operation (create/update/delete/
// variants_updated/override_added/override_removed).
//
// Stores a JSONB snapshot of old_value and new_value so the
// full flag state can be reconstructed at any point in time.
// ─────────────────────────────────────────────
'use strict';

const db = require('../db/postgres');

/**
 * Write an audit log entry.
 *
 * @param {object} flag      - the flag row (needs id + name)
 * @param {string} action    - 'created'|'updated'|'deleted'|'enabled'|'disabled'|
 *                             'variants_updated'|'override_added'|'override_removed'
 * @param {string} changedBy - email from JWT payload (req.user.email)
 * @param {any}    oldValue  - state before the change (null for creates)
 * @param {any}    newValue  - state after the change  (null for deletes)
 */
async function writeAudit(flag, action, changedBy, oldValue = null, newValue = null) {
  try {
    await db.query(
      `INSERT INTO flag_audit
         (flag_id, flag_name, action, old_value, new_value, changed_by)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        flag.id,
        flag.name,
        action,
        oldValue  ? JSON.stringify(oldValue)  : null,
        newValue  ? JSON.stringify(newValue)  : null,
        changedBy || 'system',
      ]
    );
  } catch (err) {
    // Audit write failure should never break the main operation
    console.error(JSON.stringify({ event: 'audit_write_failed', error: err.message, flag: flag.name }));
  }
}

module.exports = { writeAudit };
