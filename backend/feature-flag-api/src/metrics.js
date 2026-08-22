// src/metrics.js
// ─────────────────────────────────────────────
// Prometheus metrics for the Feature Flag Service.
// Scraped by Grafana Agent every 15s via GET /metrics.
//
// Key metric: flag_evaluations_total
//   Labels: flag_name, result (hit|miss)
//   Shows cache efficiency per flag.
//   In Grafana: rate(flag_evaluations_total[5m]) by flag_name
// ─────────────────────────────────────────────
'use strict';

const client = require('prom-client');

client.collectDefaultMetrics({ prefix: 'flag_service_node_' });

// Counter: how many times each flag was evaluated (hit = Redis, miss = DB)
const evaluations = new client.Counter({
  name:       'flag_evaluations_total',
  help:       'Total flag evaluations broken down by flag name and cache result',
  labelNames: ['flag_name', 'result'],
});

// Counter: how many flag writes happened (create/update/delete/toggle)
const writes = new client.Counter({
  name:       'flag_writes_total',
  help:       'Total flag write operations',
  labelNames: ['action'],
});

// Gauge: total number of flags currently in the system
const flagCount = new client.Gauge({
  name: 'flag_count',
  help: 'Total number of flags in the system',
});

module.exports = { evaluations, writes, flagCount };
