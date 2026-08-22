'use strict';

const db = require('../db/postgres');

let cache = [];
let loadedAt = 0;

async function loadPublicRoutes() {
  try {
    const result = await db.query(
      'SELECT id, path, match_type, is_system, description FROM public_routes'
    );
    cache = result.rows;
    loadedAt = Date.now();
  } catch (err) {
    console.error('[public-routes] reload failed:', err.message);
    // Don't clear cache on failure — keep serving last-known-good
  }
}

function getPublicRoutes() {
  return cache;
}

function isPublicRoute(reqPath) {
  for (const r of cache) {
    if (r.match_type === 'exact' && reqPath === r.path) return true;
    if (r.match_type === 'prefix' && reqPath.startsWith(r.path)) return true;
  }
  return false;
}

// Initial load + periodic refresh
async function start(intervalMs = 30_000) {
  await loadPublicRoutes();
  setInterval(loadPublicRoutes, intervalMs).unref();
}

module.exports = { start, loadPublicRoutes, getPublicRoutes, isPublicRoute };