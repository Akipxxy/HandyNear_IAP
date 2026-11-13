// Optional guard for the money routes. If WALLET_API_KEY is set in .env, callers must send
// the same value in an X-API-Key header. If it is not set, the routes stay open (local dev).
const crypto = require('crypto');
const digest = (v) => crypto.createHash('sha256').update(String(v)).digest();

module.exports = function requireWalletKey(req, res, next) {
  const expected = process.env.WALLET_API_KEY;
  if (!expected) return next();
  if (!crypto.timingSafeEqual(digest(req.get('X-API-Key') || ''), digest(expected))) {
    return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Missing or invalid API key' });
  }
  next();
};