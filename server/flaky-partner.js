// Stand-in for MoneyMentor's wallet API (contract 2.0.0) so we can build and test
// without their server. Run: node flaky-partner.js   (port 4000, in-memory data)
//   curl.exe http://127.0.0.1:4000/__mode/slow    modes: ok | slow | flaky | error
//   curl.exe http://127.0.0.1:4000/__reset        restore starting data
const express = require('express');
const app = express();
app.use(express.json());

let mode = 'ok';
let calls = 0;
let wallets, bookings, txs, keys;

function reset() {
  wallets = { 1: 0, 2: 0 };
  bookings = { 1: { customer_id: 1, handyman_id: 1, amount_cents: 50000, status: 'pending' } };
  txs = [];
  keys = new Map(); // `${customer}:${key}` -> { kind, bookingId, amount, tx }
}
reset();

app.get('/__mode/:m', (req, res) => { mode = req.params.m; calls = 0; res.json({ mode }); });
app.get('/__reset', (req, res) => { reset(); mode = 'ok'; calls = 0; res.json({ reset: true }); });

// Mode behaviour + fake auth, like the real API (401 body is { error })
app.use('/api', async (req, res, next) => {
  calls += 1;
  console.log(`${req.method} ${req.originalUrl} (call ${calls}, mode ${mode})`);
  if (!req.get('X-API-Key')) return res.status(401).json({ error: 'Missing or invalid API key' });
  if (!/^Bearer \S+$/.test(req.get('Authorization') || '')) return res.status(401).json({ error: 'A valid customer bearer token is required.' });
  if (mode === 'slow') await new Promise((r) => setTimeout(r, 10000));
  if (mode === 'flaky' && calls % 3 !== 0) return res.status(503).json({ error: 'Try again' });
  if (mode === 'error') return res.status(500).json({ error: 'Internal error' });
  next();
});

// The stub treats the customer in the URL as the token owner (no real JWT parsing).
const tx = (t) => ({ ...t, currency: 'KES', simulated: true });

app.get('/api/customers/:id/wallet', (req, res) => {
  const id = Number(req.params.id);
  if (!(id in wallets)) return res.status(404).json({ error: 'Wallet not found.' });
  res.json({ customer_id: id, balance_cents: wallets[id], currency: 'KES', simulated: true });
});

app.get('/api/customers/:id/wallet/transactions', (req, res) => {
  const id = Number(req.params.id);
  if (!(id in wallets)) return res.status(404).json({ error: 'Wallet not found.' });
  res.json(txs.filter((t) => t.customer_id === id).reverse().map((t) => ({ ...tx(t), created_at: t.created_at })));
});

function mutate(req, res, customerId, kind, bookingId, amount) {
  const key = req.get('Idempotency-Key');
  if (!key || !/^[A-Za-z0-9_-]{1,100}$/.test(key)) return res.status(400).json({ error: 'Supply an Idempotency-Key of 1-100 letters, digits, underscores or hyphens.' });
  const prev = keys.get(`${customerId}:${key}`);
  if (prev) {
    if (prev.kind !== kind || prev.bookingId !== bookingId || (kind === 'topup' && prev.amount !== amount)) {
      return res.status(409).json({ error: 'Idempotency key already used for a different request.' });
    }
    return res.status(201).json(tx(prev.tx));
  }
  if (kind === 'payment') {
    const b = bookings[bookingId];
    if (!b || b.customer_id !== customerId) return res.status(404).json({ error: 'Booking not found.' });
    if (b.status !== 'pending') return res.status(409).json({ error: 'Booking is already paid or cancelled.' });
    amount = b.amount_cents;
    if (wallets[customerId] < amount) return res.status(409).json({ error: 'Insufficient wallet balance.' });
    b.status = 'paid';
    wallets[customerId] -= amount;
  } else {
    wallets[customerId] += amount;
  }
  const t = {
    id: txs.length + 1, customer_id: customerId, type: kind, amount_cents: amount,
    balance_after_cents: wallets[customerId], booking_id: bookingId, created_at: new Date().toISOString(),
  };
  txs.push(t);
  keys.set(`${customerId}:${key}`, { kind, bookingId, amount, tx: t });
  res.status(201).json(tx(t));
}

app.post('/api/customers/:id/wallet/topups', (req, res) => {
  const id = Number(req.params.id);
  if (!(id in wallets)) return res.status(404).json({ error: 'Wallet not found.' });
  const body = req.body || {};
  if (Object.keys(body).length !== 1 || !Number.isSafeInteger(body.amount_cents) || body.amount_cents < 1 || body.amount_cents > 1000000000) {
    return res.status(400).json({ error: 'Supply only amount_cents, an integer from 1 to 1000000000.' });
  }
  mutate(req, res, id, 'topup', null, body.amount_cents);
});

app.post('/api/bookings/:id/pay', (req, res) => {
  const b = bookings[Number(req.params.id)];
  if (!b) return res.status(404).json({ error: 'Booking not found.' });
  mutate(req, res, b.customer_id, 'payment', Number(req.params.id));
});

// PROPOSED registration route (not in Team 6's contract yet)
app.put('/api/bookings/:id', (req, res) => {
  const id = Number(req.params.id);
  if (bookings[id]) return res.status(409).json({ error: 'Booking already registered.' });
  const { customer_id, handyman_id, amount_cents } = req.body || {};
  if (!(customer_id in wallets) || !Number.isInteger(handyman_id) || !Number.isInteger(amount_cents) || amount_cents < 1) {
    return res.status(400).json({ error: 'Supply customer_id, handyman_id and amount_cents.' });
  }
  bookings[id] = { customer_id, handyman_id, amount_cents, status: 'pending' };
  res.status(201).json({ id, ...bookings[id] });
});

app.listen(4000, '127.0.0.1', () => console.log('Stand-in MoneyMentor wallet on http://127.0.0.1:4000'));