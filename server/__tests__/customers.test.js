jest.mock('../db', () => ({ query: jest.fn() }));
jest.mock('../moneymentor', () => {
  const actual = jest.requireActual('../moneymentor');
  return { ...actual, getWallet: jest.fn(), getTransactions: jest.fn(), topUp: jest.fn() };
});
const db = require('../db');
const mm = require('../moneymentor');
const request = require('supertest');
const app = require('../app');

const customerRow = { id: 1, name: 'Sarah Mwangi', phone: '+254798765432', email: 'sarah@example.com', created_at: '2026-11-01T08:00:00.000Z' };

beforeEach(() => {
  db.query.mockReset();
  Object.values({ a: mm.getWallet, b: mm.getTransactions, c: mm.topUp }).forEach((f) => f.mockReset());
  delete process.env.WALLET_API_KEY;
  jest.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

describe('customers', () => {
  it('creates a customer (201)', async () => {
    db.query.mockResolvedValueOnce([{ insertId: 1 }]).mockResolvedValueOnce([[customerRow]]);
    const res = await request(app).post('/api/customers').send({ name: 'Sarah Mwangi', phone: '+254798765432' });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ id: 1, name: 'Sarah Mwangi' });
  });

  it('rejects a customer with no phone (400)', async () => {
    const res = await request(app).post('/api/customers').send({ name: 'Sarah' });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
    expect(db.query).not.toHaveBeenCalled();
  });

  it('returns 404 for an unknown customer', async () => {
    db.query.mockResolvedValueOnce([[]]);
    const res = await request(app).get('/api/customers/99');
    expect(res.status).toBe(404);
  });

  it('rejects a non-numeric id (400)', async () => {
    const res = await request(app).get('/api/customers/abc/wallet');
    expect(res.status).toBe(400);
  });
});

describe('wallet routes', () => {
  beforeEach(() => db.query.mockResolvedValue([[customerRow]]));

  it('returns the wallet balance', async () => {
    mm.getWallet.mockResolvedValue({ customerId: 1, balanceCents: 5000, currency: 'KES', simulated: true });
    const res = await request(app).get('/api/customers/1/wallet');
    expect(res.status).toBe(200);
    expect(res.body.balanceCents).toBe(5000);
  });

  it('returns 502 when MoneyMentor is down', async () => {
    mm.getWallet.mockRejectedValue(new mm.PartnerError(502, 'PARTNER_UNAVAILABLE', 'MoneyMentor is not responding.'));
    const res = await request(app).get('/api/customers/1/wallet');
    expect(res.status).toBe(502);
    expect(res.body.code).toBe('PARTNER_UNAVAILABLE');
  });

  it('tops up with an idempotency key and forwards it', async () => {
    mm.topUp.mockResolvedValue({ id: 5, type: 'topup', amountCents: 100000 });
    const res = await request(app).post('/api/customers/1/wallet/topups')
      .set('Idempotency-Key', 'abc-123').send({ amountCents: 100000 });
    expect(res.status).toBe(201);
    expect(mm.topUp).toHaveBeenCalledWith(1, 100000, 'abc-123');
  });

  it('rejects a top-up without Idempotency-Key (400)', async () => {
    const res = await request(app).post('/api/customers/1/wallet/topups').send({ amountCents: 100 });
    expect(res.status).toBe(400);
    expect(mm.topUp).not.toHaveBeenCalled();
  });

  it.each([[0], [-5], [1.5], ['100']])('rejects amountCents %p (400)', async (amountCents) => {
    const res = await request(app).post('/api/customers/1/wallet/topups')
      .set('Idempotency-Key', 'k1').send({ amountCents });
    expect(res.status).toBe(400);
  });

  it('lists transactions', async () => {
    mm.getTransactions.mockResolvedValue([{ id: 1, type: 'topup' }]);
    const res = await request(app).get('/api/customers/1/wallet/transactions');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
  });
});

describe('WALLET_API_KEY guard', () => {
  it('returns 401 without the key and 200 with it', async () => {
    process.env.WALLET_API_KEY = 'secret-key-1234567890';
    db.query.mockResolvedValue([[customerRow]]);
    expect((await request(app).get('/api/customers/1')).status).toBe(401);
    expect((await request(app).get('/api/customers/1').set('X-API-Key', 'wrong')).status).toBe(401);
    expect((await request(app).get('/api/customers/1').set('X-API-Key', 'secret-key-1234567890')).status).toBe(200);
  });
});