const mm = require('../moneymentor');

const reply = (status, body) => ({
  ok: status >= 200 && status < 300, status,
  headers: { get: () => null },
  text: async () => (body === undefined ? '' : JSON.stringify(body)),
});

beforeEach(() => {
  process.env.PARTNER_URL = 'http://partner.test/';
  process.env.PARTNER_X_API_KEY = 'key-123';
  process.env.PARTNER_CUSTOMER_TOKEN = 'tok-abc';
  global.fetch = jest.fn();
  jest.spyOn(console, 'error').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

test('getWallet sends both credentials and maps fields to camelCase', async () => {
  fetch.mockResolvedValue(reply(200, { customer_id: 1, balance_cents: 500, currency: 'KES', simulated: true }));
  const w = await mm.getWallet(1);
  expect(w).toEqual({ customerId: 1, balanceCents: 500, currency: 'KES', simulated: true });
  const [url, opts] = fetch.mock.calls[0];
  expect(url).toBe('http://partner.test/api/customers/1/wallet');
  expect(opts.headers['X-API-Key']).toBe('key-123');
  expect(opts.headers.Authorization).toBe('Bearer tok-abc');
});

test('payBooking uses a fixed idempotency key per booking', async () => {
  fetch.mockResolvedValue(reply(201, { id: 9, customer_id: 1, type: 'payment', amount_cents: 500, balance_after_cents: 0, booking_id: 7, currency: 'KES', simulated: true }));
  const t = await mm.payBooking(7);
  expect(t.bookingId).toBe(7);
  expect(fetch.mock.calls[0][1].headers['Idempotency-Key']).toBe('booking-7');
});

test('partner 409 passes through as 409 with their message', async () => {
  fetch.mockResolvedValue(reply(409, { error: 'Insufficient wallet balance.' }));
  await expect(mm.payBooking(7)).rejects.toMatchObject({ status: 409, code: 'CONFLICT', message: 'Insufficient wallet balance.' });
});

test('partner 401 (our credentials wrong) becomes 502 for our client', async () => {
  fetch.mockResolvedValue(reply(401, { error: 'Missing or invalid API key' }));
  await expect(mm.getWallet(1)).rejects.toMatchObject({ status: 502, code: 'PARTNER_UNAVAILABLE' });
});

test('network failure becomes 502', async () => {
  fetch.mockRejectedValue(new Error('boom'));
  await expect(mm.getWallet(1)).rejects.toMatchObject({ status: 502 });
  expect(fetch).toHaveBeenCalledTimes(3); // GET: 1 try + 2 retries
});

test('POST with idempotency key is retried and succeeds', async () => {
  fetch
    .mockResolvedValueOnce(reply(503, { error: 'Try again' }))
    .mockResolvedValueOnce(reply(201, { id: 1, customer_id: 1, type: 'topup', amount_cents: 100, balance_after_cents: 100, booking_id: null, currency: 'KES', simulated: true }));
  const t = await mm.topUp(1, 100, 'k1');
  expect(t.amountCents).toBe(100);
  expect(fetch).toHaveBeenCalledTimes(2);
});

test('bad idempotency key is rejected before any request', async () => {
  await expect(mm.topUp(1, 100, 'bad key!')).rejects.toMatchObject({ status: 400 });
  expect(fetch).not.toHaveBeenCalled();
});