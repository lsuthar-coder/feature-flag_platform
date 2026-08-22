// src/index.js
// ─────────────────────────────────────────────
// Feature Flag Service — Express app entry point.
//
// Mounts all routers and starts the server.
// No complex middleware chain here — auth is handled
// per-router since /status and /evaluate are public
// but all write operations require JWT.
// ─────────────────────────────────────────────
'use strict';

require('dotenv').config();

const express     = require('express');
const { register } = require('prom-client');

const flagsRouter     = require('./routes/flags');
const variantsRouter  = require('./routes/variants');
const overridesRouter = require('./routes/overrides');
const auditRouter     = require('./routes/audit');

const app  = express();
const PORT = process.env.PORT || 4000;

app.use(express.json());

// ── System endpoints ───────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

// Audit log — GET /audit
app.use('/flags/audit',    auditRouter);

// ── Feature flag routes ────────────────────────────────────────────────────
// All /flags routes. Auth is applied per-route inside the router
// because /flags/:name/status and /flags/:name/evaluate are public
// (no JWT) while all write operations require JWT.
app.use('/flags',    flagsRouter);

// Variant management — POST/PUT/DELETE /flags/:name/variants/:key
// mergeParams:true lets :name from the parent route be available here
app.use('/flags',    variantsRouter);

// Override management — POST/DELETE /flags/:name/overrides/:userId
app.use('/flags',    overridesRouter);


// ── Error handler ──────────────────────────────────────────────────────────
app.use((err, req, res, _next) => {
  console.error(JSON.stringify({
    event: 'unhandled_error',
    error: err.message,
    path:  req.path,
  }));
  res.status(500).json({ error: 'Internal server error' });
});

// ── Start server ───────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(JSON.stringify({ event: 'server_started', port: PORT }));
});
