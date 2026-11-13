// Client for the MoneyMentor wallet API (contract 2.0.0). Used only by our server:
// the browser never sees the partner URL, API key or customer token.
const { fetchWithRetry } = require('./resilientFetch');

const KEY_PATTERN = /^[A-Za-z0-9_-]{1,100}$/;

class PartnerError extends Error {
  constructor(status, code, message) {
    super(message);
    this.name = 'PartnerError';
    this.status = status; // the HTTP status WE should send to our own client
    this.code = code;
  }
}

// Passes through the partner statuses that are about the request itself.
// Anything else (401 = our credentials are wrong, 5xx, 429) is a 502 for our client.
function mapStatus(partnerStatus) {
  if ([400, 404, 409].includes(partnerStatus)) {
    return { 400: [400, 'VALIDATION_ERROR'], 404: [404, 'NOT_FOUND'], 409: [409, 'CONFLICT'] }[partnerStatus];
  }
  return [502, 'PARTNER_UNAVAILABLE'];
}

// Defaults: 1500 ms reads, 5000 ms writes. Raise them in .env for a slow tunnel.
const readTimeout = () => Number(process.env.PARTNER_READ_TIMEOUT_MS) || 1500;
const writeTimeout = () => Number(process.env.PARTNER_WRITE_TIMEOUT_MS) || 5000;

async function call(method, path, { body, idempotencyKey } = {}) {
  const base = (process.env.PARTNER_URL || '').replace(/\/+$/, '');
  const apiKey = process.env.PARTNER_X_API_KEY;
  const token = process.env.PARTNER_CUSTOMER_TOKEN;
  if (!base) throw new PartnerError(502, 'PARTNER_UNAVAILABLE', 'PARTNER_URL is not configured');

  const headers = { Accept: 'application/json' };
  if (apiKey) headers['X-API-Key'] = apiKey;
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (idempotencyKey !== undefined) {
    if (!KEY_PATTERN.test(idempotencyKey)) {
      throw new PartnerError(400, 'VALIDATION_ERROR', 'Idempotency key must be 1-100 letters, digits, - or _');
    }
    headers['Idempotency-Key'] = idempotencyKey;
  }

  let res;
  try {
    res = await fetchWithRetry(
      `${base}/api${path}`,
      { method, headers, body: body === undefined ? undefined : JSON.stringify(body) },
      { timeoutMs: method === 'GET' ? readTimeout() : writeTimeout(), retries: 2, delayMs: 200 }
    );
  } catch (err) {
    const reason = err.name === 'TimeoutError' ? 'timeout' : (err.cause?.code || err.message);
    console.error('partner call failed:', method, path, reason);
    throw new PartnerError(502, 'PARTNER_UNAVAILABLE', 'MoneyMentor is not responding. Try again in a minute.');
  }

  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { /* not JSON */ }

  if (!res.ok) {
    const [status, code] = mapStatus(res.status);
    console.error('partner returned', res.status, method, path);
    // Partner errors are { error: "..." }; show their text only for request-level errors.
    const message = status === 502
      ? 'MoneyMentor could not process the request right now.'
      : (data && (data.error || data.message)) || 'Request rejected by MoneyMentor.';
    throw new PartnerError(status, code, message);
  }
  return data;
}

// Partner snake_case -> our camelCase
const toWallet = (w) => ({
  customerId: w.customer_id, balanceCents: w.balance_cents, currency: w.currency, simulated: w.simulated,
});
const toTransaction = (t) => ({
  id: t.id, customerId: t.customer_id, type: t.type, amountCents: t.amount_cents,
  balanceAfterCents: t.balance_after_cents, bookingId: t.booking_id,
  currency: t.currency, simulated: t.simulated, createdAt: t.created_at,
});

const paymentKey = (bookingId) => `booking-${bookingId}`; // same booking -> same key -> never charged twice

async function getWallet(customerId) {
  return toWallet(await call('GET', `/customers/${customerId}/wallet`));
}
async function getTransactions(customerId) {
  return (await call('GET', `/customers/${customerId}/wallet/transactions`)).map(toTransaction);
}
async function topUp(customerId, amountCents, idempotencyKey) {
  return toTransaction(await call('POST', `/customers/${customerId}/wallet/topups`, {
    body: { amount_cents: amountCents }, idempotencyKey,
  }));
}
async function payBooking(bookingId) {
  return toTransaction(await call('POST', `/bookings/${bookingId}/pay`, {
    body: {}, idempotencyKey: paymentKey(bookingId),
  }));
}
// PROPOSED route, only works if Team 6 adds it: PUT /api/bookings/{id}
async function registerBooking(bookingId, customerId, handymanId, amountCents) {
  return call('PUT', `/bookings/${bookingId}`, {
    body: { customer_id: customerId, handyman_id: handymanId, amount_cents: amountCents },
  });
}

// For route handlers: res.status(...).json({ code, message })
function sendPartnerError(res, err) {
  if (err instanceof PartnerError) return res.status(err.status).json({ code: err.code, message: err.message });
  console.error(err);
  return res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Something went wrong' });
}

module.exports = {
  PartnerError, paymentKey, getWallet, getTransactions, topUp, payBooking, registerBooking, sendPartnerError,
};