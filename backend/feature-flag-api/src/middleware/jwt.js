// src/middleware/jwt.js
// ─────────────────────────────────────────────
// JWT Bearer token verification middleware.
//
// Used on all write endpoints (POST/PUT/DELETE).
// Read endpoints (/status, /evaluate) skip this entirely
// so any service can check flags without credentials.
//
// Unlike the API Gateway, this service does NOT fetch the
// public key dynamically — it reads it from the environment
// variable PUBLIC_KEY_PEM, which is injected from the K8s
// Secret at pod startup.
//
// The Gateway already validates JWTs before forwarding
// requests to this service. This middleware is a second
// layer of defence — useful if the service is ever called
// directly (e.g. in local development or integration tests).
// ─────────────────────────────────────────────
'use strict';

const { jwtVerify, importSPKI } = require('jose');

let publicKey = null;

// Lazy-load the public key from env on first use
async function getPublicKey() {
  if (!publicKey) {
    const pem = process.env.PUBLIC_KEY_PEM;
    if (!pem) throw new Error('PUBLIC_KEY_PEM env var not set');
    publicKey = await importSPKI(pem, 'RS256');
  }
  return publicKey;
}

/**
 * Middleware: verify RS256 Bearer token.
 * Attaches req.user = { sub, email, role, jti } on success.
 */
async function jwtMiddleware(req, res, next) {
  const header = req.headers['authorization'];
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization required' });
  }

  const token = header.split(' ')[1];
  try {
    const key            = await getPublicKey();
    const { payload }    = await jwtVerify(token, key, { algorithms: ['RS256'] });
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

/**
 * Middleware: same as jwtMiddleware but also requires role === 'admin'.
 * Used on DELETE /flags/:name.
 */
async function adminMiddleware(req, res, next) {
  await jwtMiddleware(req, res, () => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    next();
  });
}

module.exports = { jwtMiddleware, adminMiddleware };
