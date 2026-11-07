jest.mock('../db', () => ({ query: jest.fn() }));
jest.mock('../moneymentor', () => {
  const actual = jest.requireActual('../moneymentor');
  return { ...actual, payBooking: jest.fn(), registerBooking: jest.fn() };
});
const db = require('../db');
const mm = require('../moneymentor');
const request = require('supertest');
const app = require('../app');

const row = (o = {}) => ({
  id: 1, handyman_id: 1, customer_id: 1, customer_name: 'Sarah Mwangi', customer_phone: '+254798765432',
  customer_email: null, service_description: 'Fix sink', scheduled_time: '2026-11-10T10:00:00.000Z',
  status: 'confirmed', notes: null, created_at: '2026-11-01T08:00:00.000Z',
  price_cents: 50000, payment_status: 'unpaid', ...o,
});

beforeEach(() => {
  db.query.mockReset(); mm.payBooking.mockReset(); mm.registerBooking.mockReset();
  delete process.env.PARTNER_REGISTER_BOOKINGS;
  jest.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

describe('POST /api/bookings with a customer', () => {
  const payload = {
    handymanId: 1, customerId: 1, customerName: 'Sarah Mwangi', customerPhone: '+254798765432',
    serviceDescription: 'Fix sink', scheduledTime: '2026-11-10T10:00:00Z',
  };

  it('prices the booking from the hourly rate (1500 x 2h = 300000 cents)', async () => {
    db.query
      .mockResolvedValueOnce([[{ hourly_rate: '1500.00' }]])
      .mockResolvedValueOnce([[{ id: 1 }]])
      .mockResolvedValueOnce([{ insertId: 7 }])
      .mockResolvedValueOnce([[row({ id: 7, status: 'pending', price_cents: 300000 })]]);
    const res = await request(app).post('/api/bookings').send({ ...payload, durationHours: 2 });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ customerId: 1, priceCents: 300000, paymentStatus: 'unpaid' });
    expect(db.query.mock.calls[2][1]).toContain(300000);
  });

  it('404 when the customer does not exist', async () => {
    db.query.mockResolvedValueOnce([[{ hourly_rate: '1500.00' }]]).mockResolvedValueOnce([[]]);
    const res = await request(app).post('/api/bookings').send(payload);
    expect(res.status).toBe(404);
  });

  it('400 for a bad durationHours', async () => {
    const res = await request(app).post('/api/bookings').send({ ...payload, durationHours: 0 });
    expect(res.status).toBe(400);
    expect(db.query).not.toHaveBeenCalled();
  });

  it('registers the booking with MoneyMentor only when switched on', async () => {
    process.env.PARTNER_REGISTER_BOOKINGS = 'true';
    db.query
      .mockResolvedValueOnce([[{ hourly_rate: '1500.00' }]]).mockResolvedValueOnce([[{ id: 1 }]])
      .mockResolvedValueOnce([{ insertId: 7 }]).mockResolvedValueOnce([[row({ id: 7 })]]);
    mm.registerBooking.mockResolvedValue({});
    await request(app).post('/api/bookings').send(payload);
    expect(mm.registerBooking).toHaveBeenCalledWith(7, 1, 1, 150000);
  });
});

describe('PATCH /api/bookings/:id to completed', () => {
  it('pays first, then marks the booking completed and paid', async () => {
    mm.payBooking.mockResolvedValue({ id: 42 });
    db.query
      .mockResolvedValueOnce([[row()]])
      .mockResolvedValueOnce([{ affectedRows: 1 }])
      .mockResolvedValueOnce([[row({ status: 'completed', payment_status: 'paid' })]]);
    const res = await request(app).patch('/api/bookings/1').send({ status: 'completed' });
    expect(res.status).toBe(200);
    expect(mm.payBooking).toHaveBeenCalledWith(1);
    expect(db.query.mock.calls[1][0]).toContain("payment_status = 'paid'");
    expect(db.query.mock.calls[1][1]).toContain(42);
    expect(res.body).toMatchObject({ status: 'completed', paymentStatus: 'paid' });
  });

  it('409 insufficient funds: booking is NOT changed', async () => {
    mm.payBooking.mockRejectedValue(new mm.PartnerError(409, 'CONFLICT', 'Insufficient wallet balance.'));
    db.query.mockResolvedValueOnce([[row()]]);
    const res = await request(app).patch('/api/bookings/1').send({ status: 'completed' });
    expect(res.status).toBe(409);
    expect(res.body).toMatchObject({ code: 'PAYMENT_FAILED', message: 'Insufficient wallet balance.' });
    expect(db.query).toHaveBeenCalledTimes(1); // only the existence check, no UPDATE
  });

  it('409 PAYMENT_NOT_READY when MoneyMentor does not know the booking', async () => {
    mm.payBooking.mockRejectedValue(new mm.PartnerError(404, 'NOT_FOUND', 'Booking not found.'));
    db.query.mockResolvedValueOnce([[row()]]);
    const res = await request(app).patch('/api/bookings/1').send({ status: 'completed' });
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('PAYMENT_NOT_READY');
  });

  it('502 when MoneyMentor is down: booking stays as it was', async () => {
    mm.payBooking.mockRejectedValue(new mm.PartnerError(502, 'PARTNER_UNAVAILABLE', 'MoneyMentor is not responding.'));
    db.query.mockResolvedValueOnce([[row()]]);
    const res = await request(app).patch('/api/bookings/1').send({ status: 'completed' });
    expect(res.status).toBe(502);
    expect(db.query).toHaveBeenCalledTimes(1);
  });

  it('does not pay twice for an already paid booking', async () => {
    db.query
      .mockResolvedValueOnce([[row({ payment_status: 'paid', status: 'confirmed' })]])
      .mockResolvedValueOnce([{ affectedRows: 1 }])
      .mockResolvedValueOnce([[row({ status: 'completed', payment_status: 'paid' })]]);
    await request(app).patch('/api/bookings/1').send({ status: 'completed' });
    expect(mm.payBooking).not.toHaveBeenCalled();
  });

  it('bookings without a customer complete with no payment (old behaviour)', async () => {
    db.query
      .mockResolvedValueOnce([[row({ customer_id: null, price_cents: null })]])
      .mockResolvedValueOnce([{ affectedRows: 1 }])
      .mockResolvedValueOnce([[row({ customer_id: null, status: 'completed' })]]);
    const res = await request(app).patch('/api/bookings/1').send({ status: 'completed' });
    expect(res.status).toBe(200);
    expect(mm.payBooking).not.toHaveBeenCalled();
  });

  it('moving to confirmed never triggers payment', async () => {
    db.query
      .mockResolvedValueOnce([[row({ status: 'pending' })]])
      .mockResolvedValueOnce([{ affectedRows: 1 }])
      .mockResolvedValueOnce([[row()]]);
    await request(app).patch('/api/bookings/1').send({ status: 'confirmed' });
    expect(mm.payBooking).not.toHaveBeenCalled();
  });
});
