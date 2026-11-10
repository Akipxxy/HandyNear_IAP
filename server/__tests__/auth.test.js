jest.mock('../db', () => ({ query: jest.fn() }));
const bcrypt = require('bcryptjs');
const db = require('../db');
const request = require('supertest');
const app = require('../app');
const { customer, admin } = require('../test-helpers');
const { resetLoginLimiter } = require('../auth');

const row = (o = {}) => ({
  id: 3, name: 'Sarah Mwangi', phone: '+254798765432', email: 'sarah@example.com',
  password_hash: bcrypt.hashSync('a-good-password', 4), created_at: '2026-11-01T08:00:00.000Z', ...o,
});

beforeEach(() => {
  db.query.mockReset();
  resetLoginLimiter();
  jest.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

describe('POST /api/auth/register', () => {
  const body = { name: 'Sarah Mwangi', phone: '+254798765432', email: 'Sarah@Example.com', password: 'a-good-password' };

  it('creates the account, stores a HASH (never the password) and returns a token', async () => {
    db.query.mockResolvedValueOnce([[]]).mockResolvedValueOnce([{ insertId: 3 }]).mockResolvedValueOnce([[row()]]);
    const res = await request(app).post('/api/auth/register').send(body);
    expect(res.status).toBe(201);
    expect(res.body.token).toEqual(expect.any(String));
    expect(res.body.customer).toMatchObject({ id: 3, email: 'sarah@example.com' });
    expect(res.body.customer).not.toHaveProperty('password_hash');
    const insertParams = db.query.mock.calls[1][1];
    expect(insertParams[2]).toBe('sarah@example.com'); // lower-cased
    expect(insertParams[3]).not.toBe('a-good-password');
    expect(bcrypt.compareSync('a-good-password', insertParams[3])).toBe(true);
  });

  it('409 when the email already has an account', async () => {
    db.query.mockResolvedValueOnce([[{ id: 9 }]]);
    expect((await request(app).post('/api/auth/register').send(body)).status).toBe(409);
  });

  it.each([
    [{ password: 'short' }], [{ email: 'not-an-email' }], [{ name: '' }], [{ phone: undefined }],
  ])('400 for invalid input %j', async (bad) => {
    const res = await request(app).post('/api/auth/register').send({ ...body, ...bad });
    expect(res.status).toBe(400);
    expect(db.query).not.toHaveBeenCalled();
  });
});

describe('POST /api/auth/login', () => {
  it('logs a customer in with the right password', async () => {
    db.query.mockResolvedValueOnce([[row()]]);
    const res = await request(app).post('/api/auth/login').send({ email: 'SARAH@example.com', password: 'a-good-password' });
    expect(res.status).toBe(200);
    expect(res.body.customer.id).toBe(3);
    // the token really works on a customer-only route
    db.query.mockResolvedValueOnce([[]]);
    const mine = await request(app).get('/api/bookings/mine').set('Authorization', `Bearer ${res.body.token}`);
    expect(mine.status).toBe(200);
  });

  it('401 with the same message for a wrong password and an unknown email', async () => {
    db.query.mockResolvedValueOnce([[row()]]).mockResolvedValueOnce([[]]);
    const wrong = await request(app).post('/api/auth/login').send({ email: 'sarah@example.com', password: 'nope-nope-nope' });
    const unknown = await request(app).post('/api/auth/login').send({ email: 'who@example.com', password: 'nope-nope-nope' });
    expect(wrong.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(wrong.body.message).toBe(unknown.body.message);
  });

  it('401 for a customer who has no password set yet (seeded customers)', async () => {
    db.query.mockResolvedValueOnce([[row({ password_hash: null })]]);
    const res = await request(app).post('/api/auth/login').send({ email: 'sarah@example.com', password: 'a-good-password' });
    expect(res.status).toBe(401);
  });

  it('429 after too many failures (limit is 3 in tests), with Retry-After', async () => {
    db.query.mockResolvedValue([[]]);
    for (let i = 0; i < 3; i++) {
      expect((await request(app).post('/api/auth/login').send({ email: 'a@b.co', password: 'x'.repeat(10) })).status).toBe(401);
    }
    const res = await request(app).post('/api/auth/login').send({ email: 'a@b.co', password: 'x'.repeat(10) });
    expect(res.status).toBe(429);
    expect(res.headers['retry-after']).toBeDefined();
  });
});

describe('POST /api/auth/admin/login', () => {
  it('returns an admin token for the right credentials', async () => {
    const res = await request(app).post('/api/auth/admin/login')
      .send({ username: 'admin', password: 'correct horse battery staple' });
    expect(res.status).toBe(200);
    db.query.mockResolvedValueOnce([[]]);
    const patch = await request(app).patch('/api/bookings/1').set('Authorization', `Bearer ${res.body.token}`).send({});
    expect(patch.status).toBe(400); // got past the login check, failed only on empty body
  });

  it.each([
    [{ username: 'admin', password: 'wrong' }], [{ username: 'root', password: 'correct horse battery staple' }], [{}],
  ])('401 for %j', async (creds) => {
    expect((await request(app).post('/api/auth/admin/login').send(creds)).status).toBe(401);
  });

  it('503 if the admin password is not configured on the server', async () => {
    const saved = process.env.ADMIN_PASSWORD;
    delete process.env.ADMIN_PASSWORD;
    const res = await request(app).post('/api/auth/admin/login').send({ username: 'admin', password: 'x' });
    process.env.ADMIN_PASSWORD = saved;
    expect(res.status).toBe(503);
  });
});

describe('tokens', () => {
  it('a customer token cannot be used as admin and vice versa', async () => {
    expect((await request(app).patch('/api/bookings/1').set('Authorization', customer(3)).send({ status: 'confirmed' })).status).toBe(403);
    expect((await request(app).get('/api/bookings/mine').set('Authorization', admin())).status).toBe(403);
  });

  it('an expired token is rejected (401)', async () => {
    process.env.TOKEN_TTL = '-10s';
    const old = customer(3);
    delete process.env.TOKEN_TTL;
    expect((await request(app).get('/api/bookings/mine').set('Authorization', old)).status).toBe(401);
  });

  it('GET /api/auth/me returns the logged-in customer', async () => {
    db.query.mockResolvedValueOnce([[row()]]);
    const res = await request(app).get('/api/auth/me').set('Authorization', customer(3));
    expect(res.body).toMatchObject({ role: 'customer', customer: { id: 3 } });
    expect((await request(app).get('/api/auth/me')).status).toBe(401);
  });

  it('the handymen list stays public; bookings reads need a partner key or admin login', async () => {
    db.query.mockResolvedValue([[]]);
    expect((await request(app).get('/api/handymen')).status).toBe(200);
    expect((await request(app).get('/api/bookings?handymanId=1&status=completed')).status).toBe(401);
    expect((await request(app).get('/api/bookings?handymanId=1&status=completed').set(require('../test-helpers').partnerKey())).status).toBe(200);
  });
});
