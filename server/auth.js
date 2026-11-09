// Login sessions for HandyNear: signed JWTs for customers and for the admin.
const jwt = require('jsonwebtoken');

const ISSUER = 'handynear';
const AUDIENCE = 'handynear-web';

function secret() {
  const s = process.env.JWT_SECRET;
  return s && Buffer.byteLength(s) >= 32 ? s : null;
}

// role: 'customer' (id = customer id) or 'admin'
function signToken(role, id) {
  const s = secret();
  if (!s) throw Object.assign(new Error('JWT_SECRET is not configured'), { status: 503 });
  return jwt.sign({ role }, s, {
    algorithm: 'HS256',
    subject: role === 'admin' ? 'admin' : String(id),
    expiresIn: process.env.TOKEN_TTL || '2h',
    issuer: ISSUER,
    audience: AUDIENCE,
  });
}

// Returns { auth } on success or { status, code, message } on failure.
function readAuth(req) {
  if (!secret()) {
    return { status: 503, code: 'AUTH_NOT_CONFIGURED', message: 'Login is not configured on the server (JWT_SECRET).' };
  }
  const match = /^Bearer ([^ ]+)$/i.exec(req.get('Authorization') || '');
  if (!match) return { status: 401, code: 'UNAUTHORIZED', message: 'Please log in.' };
  try {
    const claims = jwt.verify(match[1], secret(), { algorithms: ['HS256'], issuer: ISSUER, audience: AUDIENCE });
    if (claims.role === 'admin') return { auth: { role: 'admin', id: null } };
    const id = Number(claims.sub);
    if (claims.role === 'customer' && Number.isInteger(id) && id > 0) return { auth: { role: 'customer', id } };
  } catch { /* fall through */ }
  return { status: 401, code: 'UNAUTHORIZED', message: 'Your session is invalid or has expired. Please log in again.' };
}

const deny = (res, r) => res.status(r.status).json({ code: r.code, message: r.message });

// Only the listed roles may continue. Sets req.auth = { role, id }.
function requireRole(...roles) {
  return (req, res, next) => {
    const r = readAuth(req);
    if (!r.auth) return deny(res, r);
    if (!roles.includes(r.auth.role)) {
      return res.status(403).json({ code: 'FORBIDDEN', message: 'You are not allowed to do that.' });
    }
    req.auth = r.auth;
    next();
  };
}

// For /customers/:id/...: the admin, or the customer whose id is in the URL.
function requireSelfOrAdmin(req, res, next) {
  const r = readAuth(req);
  if (!r.auth) return deny(res, r);
  if (r.auth.role === 'admin' || String(r.auth.id) === req.params.id) {
    req.auth = r.auth;
    return next();
  }
  return res.status(403).json({ code: 'FORBIDDEN', message: 'You can only access your own account.' });
}

// ---- brute-force protection for the login routes (in memory, per IP) ----
const WINDOW_MS = 15 * 60 * 1000;
const failures = new Map();
const maxFails = () => Number(process.env.LOGIN_MAX_FAILS) || 10;

function loginAllowed(req, res) {
  const e = failures.get(req.ip);
  if (e && Date.now() < e.until && e.count >= maxFails()) {
    res.set('Retry-After', String(Math.ceil((e.until - Date.now()) / 1000)));
    res.status(429).json({ code: 'RATE_LIMITED', message: 'Too many failed logins. Try again in a few minutes.' });
    return false;
  }
  return true;
}
function recordLoginFailure(req) {
  const now = Date.now();
  let e = failures.get(req.ip);
  if (!e || now >= e.until) e = { count: 0, until: now + WINDOW_MS };
  e.count += 1;
  failures.set(req.ip, e);
}
function clearLoginFailures(req) { failures.delete(req.ip); }
function resetLoginLimiter() { failures.clear(); }

module.exports = {
  signToken, requireRole, requireSelfOrAdmin,
  loginAllowed, recordLoginFailure, clearLoginFailures, resetLoginLimiter,
};
