jest.mock('../db', () => ({ query: jest.fn() }));
const db = require('../db');
const request = require('supertest');
const app = require('../app');

beforeEach(() => {
  db.query.mockClear();
});

const dbRow = (overrides = {}) => ({
  id: 101,
  handyman_id: 12,
  customer_name: 'Sarah Mwangi',
  customer_phone: '+254798765432',
  customer_email: 'sarah@example.com',
  service_description: 'Leaking kitchen sink faucet repair',
  scheduled_time: '2026-09-12T14:30:00.000Z',
  status: 'pending',
  notes: null,
  created_at: '2026-09-09T09:15:00.000Z',
  ...overrides
});

describe('POST /api/bookings', () => {
  const validPayload = {
    handymanId: 12,
    customerName: 'Sarah Mwangi',
    customerPhone: '+254798765432',
    customerEmail: 'sarah@example.com',
    serviceDescription: 'Leaking kitchen sink faucet repair',
    scheduledTime: '2026-09-12T14:30:00Z'
  };

  it('creates a booking and returns 201 with the full Booking shape (happy path)', async () => {
    db.query
      .mockResolvedValueOnce([{ insertId: 101 }])   // INSERT
      .mockResolvedValueOnce([[dbRow()]]);          // SELECT the created row back

    const res = await request(app).post('/api/bookings').send(validPayload);

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id', 101);
    expect(res.body).toHaveProperty('handymanId', 12);
    expect(res.body).toHaveProperty('status', 'pending');
    expect(res.body).not.toHaveProperty('message'); // old, wrong shape
  });

  it('rejects a request missing required fields with 400 (validation)', async () => {
    const res = await request(app).post('/api/bookings').send({ handymanId: 12 });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('code', 'VALIDATION_ERROR');
    expect(db.query).not.toHaveBeenCalled(); // nothing written on invalid input
  });

  it('rejects a non-numeric handymanId with 400 (wrong type)', async () => {
    const res = await request(app)
      .post('/api/bookings')
      .send({ ...validPayload, handymanId: 'twelve' });
    expect(res.status).toBe(400);
    expect(db.query).not.toHaveBeenCalled();
  });
});

describe('GET /api/bookings', () => {
  it('returns 200 with mapped bookings (happy path)', async () => {
    db.query.mockResolvedValueOnce([[dbRow()]]);
    const res = await request(app).get('/api/bookings');
    expect(res.status).toBe(200);
    expect(res.body[0]).toHaveProperty('handymanId', 12);
    expect(res.body[0]).toHaveProperty('serviceDescription');
  });

  it('filters by status using a query parameter', async () => {
    db.query.mockResolvedValueOnce([[]]);
    await request(app).get('/api/bookings?status=completed');
    const [sql, params] = db.query.mock.calls[0];
    expect(sql).toMatch(/WHERE status = \?/);
    expect(params).toContain('completed');
  });

  it('rejects an invalid status filter with 400', async () => {
    const res = await request(app).get('/api/bookings?status=not-a-real-status');
    expect(res.status).toBe(400);
  });
});

describe('GET /api/bookings/:id', () => {
  it('returns 200 with the matching booking (happy path)', async () => {
    db.query.mockResolvedValueOnce([[dbRow()]]);
    const res = await request(app).get('/api/bookings/101');
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(101);
  });

  it('returns 404 with the exact contract error shape when not found', async () => {
    db.query.mockResolvedValueOnce([[]]);
    const res = await request(app).get('/api/bookings/9999');
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('code', 'RESOURCE_NOT_FOUND');
    expect(res.body).not.toHaveProperty('error');
  });
});

describe('PATCH /api/bookings/:id', () => {
  it('updates status and returns 200 with the updated Booking (happy path)', async () => {
    db.query
      .mockResolvedValueOnce([[dbRow()]])                          // existence check
      .mockResolvedValueOnce([{ affectedRows: 1 }])                // UPDATE
      .mockResolvedValueOnce([[dbRow({ status: 'confirmed' })]]);  // re-fetch

    const res = await request(app).patch('/api/bookings/101').send({ status: 'confirmed' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('confirmed');
  });

  it('returns 404 on a nonexistent booking rather than creating one', async () => {
    db.query.mockResolvedValueOnce([[]]); // existence check finds nothing
    const res = await request(app).patch('/api/bookings/9999').send({ status: 'confirmed' });
    expect(res.status).toBe(404);
    expect(db.query).toHaveBeenCalledTimes(1); // never reached the UPDATE
  });

  it('rejects an invalid status value with 400', async () => {
    const res = await request(app).patch('/api/bookings/101').send({ status: 'in-orbit' });
    expect(res.status).toBe(400);
    expect(db.query).not.toHaveBeenCalled();
  });

  it('rejects an empty body with 400 (nothing to update)', async () => {
    const res = await request(app).patch('/api/bookings/101').send({});
    expect(res.status).toBe(400);
  });

  it('produces the same end state when the same valid PATCH is sent twice (idempotency)', async () => {
    db.query
      .mockResolvedValueOnce([[dbRow()]])
      .mockResolvedValueOnce([{ affectedRows: 1 }])
      .mockResolvedValueOnce([[dbRow({ status: 'confirmed' })]]);
    const first = await request(app).patch('/api/bookings/101').send({ status: 'confirmed' });

    db.query
      .mockResolvedValueOnce([[dbRow({ status: 'confirmed' })]])
      .mockResolvedValueOnce([{ affectedRows: 1 }])
      .mockResolvedValueOnce([[dbRow({ status: 'confirmed' })]]);
    const second = await request(app).patch('/api/bookings/101').send({ status: 'confirmed' });

    expect(first.body.status).toBe(second.body.status);
  });
});