// Partner API keys (Week 9). Keys live in .env, never in code or git:
//   PARTNER_API_KEYS=team8:<long-random-key>,other:<another-key>
// A request may send X-API-Key (a partner such as ShieldBox) or log in (our own app).
const crypto = require('crypto');
const { requireRole } = require('./auth');

const sha = (s) => crypto.createHash('sha256').update(String(s)).digest();

function loadKeys() {
  return (process.env.PARTNER_API_KEYS || '')
    .split(',')
    .map((pair) => pair.trim())
    .filter(Boolean)
    .map((pair) => {
      const i = pair.indexOf(':');
      const name = i > 0 ? pair.slice(0, i).trim() : 'partner';
      const key = i > 0 ? pair.slice(i + 1).trim() : pair;
      return key ? { name, digest: sha(key) } : null;
    })
    .filter(Boolean);
}

// Safe label for logs and stats: "key-" plus 6 hex chars of the key's hash. Never the key.
const labelFor = (key) => `key-${sha(key).toString('hex').slice(0, 6)}`;

function findPartner(key) {
  const d = sha(key);
  // timingSafeEqual on fixed-length digests; check every key so timing does not leak which matched
  let found = null;
  for (const k of loadKeys()) {
    if (crypto.timingSafeEqual(k.digest, d) && !found) found = k;
  }
  return found;
}

// Allows: a valid partner key, OR a login with one of `roles`.
function requirePartnerOrRole(...roles) {
  const loginCheck = requireRole(...roles);
  return (req, res, next) => {
    const key = req.get('X-API-Key');
    if (key) {
      const partner = findPartner(key);
      if (!partner) {
        req.caller = labelFor(key);
        return res.status(401).json({ code: 'INVALID_API_KEY', message: 'The X-API-Key is not valid.' });
      }
      req.caller = labelFor(key);
      req.partner = partner.name;
      return next();
    }
    if (!req.get('Authorization')) {
      return res.status(401).json({ code: 'API_KEY_REQUIRED', message: 'Send an X-API-Key header, or log in.' });
    }
    return loginCheck(req, res, next);
  };
}

module.exports = { requirePartnerOrRole, labelFor };
