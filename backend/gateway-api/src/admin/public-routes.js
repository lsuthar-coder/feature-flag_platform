'use strict';

const express = require('express');
const router  = express.Router();
const db      = require('../db/postgres');
const publicRoutesCache = require('../router/public-routes');


// Paths we never allow as public — would break the security model
const FORBIDDEN_PREFIXES = ['/admin', '/internal'];

function validatePath(path, match_type) {
  if (typeof path !== 'string' || !path.startsWith('/')) {
    return 'path must start with /';
  }
  if (path === '/') {
    return 'path cannot be "/" — that would make every route public';
  }
  if (FORBIDDEN_PREFIXES.some(p => path === p || path.startsWith(p + '/'))) {
    return `path cannot be under ${FORBIDDEN_PREFIXES.join(', ')}`;
  }
  if (match_type && !['exact', 'prefix'].includes(match_type)) {
    return 'match_type must be "exact" or "prefix"';
  }
  return null;
}

// ── GET /admin/public-routes ──────────────────────────────────────────────
router.get('/public-routes', async (req, res) => {
  try {
    console.log('Fetching public routes from DB');
    const result = await db.query(
      `SELECT id, path, match_type, is_system, description, created_at, updated_at
       FROM public_routes
       ORDER BY is_system DESC, path ASC`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /admin/public-routes ─────────────────────────────────────────────
router.post('/public-routes', async (req, res) => {
  const { path, match_type = 'exact', description = null } = req.body;
console.log('Creating public route:', { path, match_type, description });
  const validationError = validatePath(path, match_type);
  if (validationError) return res.status(400).json({ error: validationError });

  try {
    const result = await db.query(
      `INSERT INTO public_routes (path, match_type, description, is_system)
       VALUES ($1, $2, $3, FALSE)
       RETURNING *`,
      [path, match_type, description]
    );
    await publicRoutesCache.loadPublicRoutes(); // immediate refresh
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'A public route with this path already exists' });
    }
    res.status(500).json({ error: err.message });
  }
});

// ── PUT /admin/public-routes/:id ──────────────────────────────────────────
router.put('/public-routes/:id', async (req, res) => {
  const { id } = req.params;
  const { path, match_type, description } = req.body;

  try {
    const existing = await db.query('SELECT * FROM public_routes WHERE id = $1', [id]);
    if (!existing.rows.length) return res.status(404).json({ error: 'Public route not found' });

    // System routes can have description updated but not path/match_type changed
    if (existing.rows[0].is_system && (path || match_type)) {
      return res.status(403).json({
        error: 'Cannot modify path or match_type of a system route',
      });
    }

    if (path || match_type) {
      const err = validatePath(path || existing.rows[0].path, match_type || existing.rows[0].match_type);
      if (err) return res.status(400).json({ error: err });
    }

    const result = await db.query(
      `UPDATE public_routes
       SET path        = COALESCE($1, path),
           match_type  = COALESCE($2, match_type),
           description = COALESCE($3, description),
           updated_at  = NOW()
       WHERE id = $4
       RETURNING *`,
      [path, match_type, description, id]
    );
    await publicRoutesCache.loadPublicRoutes();
    res.json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Another public route already uses this path' });
    }
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /admin/public-routes/:id ───────────────────────────────────────
router.delete('/public-routes/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const existing = await db.query(
      'SELECT is_system, path FROM public_routes WHERE id = $1', [id]
    );
    if (!existing.rows.length) return res.status(404).json({ error: 'Public route not found' });

    if (existing.rows[0].is_system) {
      return res.status(403).json({
        error: `Cannot delete system route "${existing.rows[0].path}". ` +
               `Deletion would lock the system out. Toggle is_system in DB if absolutely needed.`,
      });
    }

    await db.query('DELETE FROM public_routes WHERE id = $1', [id]);
    await publicRoutesCache.loadPublicRoutes();
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;