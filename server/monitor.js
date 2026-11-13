// Week 12 monitoring: one log line per request, plus in-memory numbers for GET /api/stats.
// Nothing sensitive is recorded: no keys, tokens, bodies or query strings.
const startedAt = new Date();
let total = 0;
let errors = 0;
const byStatus = {};
const byRoute = {};

function routeLabel(req) {
  if (req.route) return `${req.method} ${req.baseUrl}${req.route.path === '/' ? '' : req.route.path}`;
  return `${req.method} (unmatched)`;
}
function callerLabel(req) {
  if (req.caller) return req.caller;            // key-xxxxxx, set by apiKeys.js
  if (req.auth) return req.auth.role;           // admin or customer
  return 'none';
}

function requestLog(req, res, next) {
  const t0 = process.hrtime.bigint();
  res.on('finish', () => {
    const ms = Number(process.hrtime.bigint() - t0) / 1e6;
    const route = routeLabel(req);
    const caller = callerLabel(req);
    total += 1;
    if (res.statusCode >= 400) errors += 1;
    byStatus[res.statusCode] = (byStatus[res.statusCode] || 0) + 1;
    const r = byRoute[route] || (byRoute[route] = { count: 0, errors: 0, totalMs: 0, maxMs: 0 });
    r.count += 1;
    if (res.statusCode >= 400) r.errors += 1;
    r.totalMs += ms;
    r.maxMs = Math.max(r.maxMs, ms);
    if (process.env.LOG_REQUESTS !== 'false') {
      console.log(`${new Date().toISOString()} ${req.method} ${req.originalUrl.split('?')[0]} ${res.statusCode} ${Math.round(ms)}ms caller=${caller}`);
    }
  });
  next();
}

const round = (n) => Math.round(n * 10) / 10;

function getStats() {
  const routes = Object.entries(byRoute)
    .map(([route, r]) => ({ route, count: r.count, errors: r.errors, avgMs: round(r.totalMs / r.count), maxMs: round(r.maxMs) }))
    .sort((a, b) => b.count - a.count);
  const slowest = routes.slice().sort((a, b) => b.avgMs - a.avgMs)[0] || null;
  return {
    since: startedAt.toISOString(),
    totalRequests: total,
    errorCount: errors,
    errorRate: total ? round((errors / total) * 100) / 100 : 0,
    byStatus: { ...byStatus },
    slowestRoute: slowest && { route: slowest.route, avgMs: slowest.avgMs },
    routes,
  };
}

function resetStats() {
  total = 0; errors = 0;
  Object.keys(byStatus).forEach((k) => delete byStatus[k]);
  Object.keys(byRoute).forEach((k) => delete byRoute[k]);
}

module.exports = { requestLog, getStats, resetStats };
