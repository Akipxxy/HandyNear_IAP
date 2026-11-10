// General rate limit for /api (Week 9): fixed window, in memory.
// Keyed by the API key's hash when one is sent, otherwise by IP. Defaults: 100 requests per minute.
const crypto = require('crypto');

const hits = new Map();
const max = () => Number(process.env.RATE_LIMIT_MAX) || 100;
const windowMs = () => Number(process.env.RATE_LIMIT_WINDOW_MS) || 60 * 1000;

function bucketId(req) {
  const key = req.get('X-API-Key');
  return key ? 'k:' + crypto.createHash('sha256').update(key).digest('hex').slice(0, 16) : 'ip:' + req.ip;
}

function rateLimit(req, res, next) {
  const now = Date.now();
  const id = bucketId(req);
  let e = hits.get(id);
  if (!e || now >= e.resetAt) {
    e = { count: 0, resetAt: now + windowMs() };
    hits.set(id, e);
    if (hits.size > 5000) for (const [k, v] of hits) if (now >= v.resetAt) hits.delete(k);
  }
  e.count += 1;
  res.set('RateLimit-Limit', String(max()));
  res.set('RateLimit-Remaining', String(Math.max(0, max() - e.count)));
  if (e.count > max()) {
    res.set('Retry-After', String(Math.ceil((e.resetAt - now) / 1000)));
    return res.status(429).json({ code: 'RATE_LIMITED', message: 'Too many requests. Try again shortly.' });
  }
  next();
}

const resetRateLimit = () => hits.clear();
module.exports = { rateLimit, resetRateLimit };
