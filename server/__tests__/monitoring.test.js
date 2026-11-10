jest.mock('../db', () => ({ query: jest.fn() }));
const db = require('../db');
const request = require('supertest');
const app = require('../app');
const { admin, customer, partnerKey } = require('../test-helpers');
const { resetStats } = require('../monitor');
const { resetRateLimit } = require('../rateLimit');

beforeEach(() => {
  db.query.mockReset();
  db.query.mockResolvedValue([[]]);
  resetStats();
  resetRateLimit();
});

describe('partner API key on booking reads', () => {
  it('no key and no login: 401 API_KEY_REQUIRED', async () => {
    const res = await request(app).get('/api/bookings');
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('API_KEY_REQUIRED');
  });

  it('wrong key: 401 INVALID_API_KEY, and the database is never touched', async () => {
    const res = await request(app).get('/api/bookings').set('X-API-Key', 'nope');
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('INVALID_API_KEY');
    expect(db.query).not.toHaveBeenCalled();
  });

  it('valid partner key: 200 on the list and on a single booking', async () => {
    expect((await request(app).get('/api/bookings').set(partnerKey())).status).toBe(200);
    db.query.mockResolvedValueOnce([[{ id: 5, handyman_id: 1, customer_name: 'A', customer_phone: '1', service_description: 'x', scheduled_time: 't', status: 'pending' }]]);
    expect((await request(app).get('/api/bookings/5').set(partnerKey())).status).toBe(200);
  });

  it('a second partner key also works', async () => {
    expect((await request(app).get('/api/bookings').set('X-API-Key', 'second-test-key-5678')).status).toBe(200);
  });

  it('admin login works without a key; a customer login gets 403', async () => {
    expect((await request(app).get('/api/bookings').set('Authorization', admin())).status).toBe(200);
    expect((await request(app).get('/api/bookings').set('Authorization', customer(1))).status).toBe(403);
  });

  it('GET /api/handymen stays public', async () => {
    expect((await request(app).get('/api/handymen')).status).toBe(200);
  });
});

describe('GET /api/stats', () => {
  it('is admin only: 401 with no login, 403 for a customer or a partner key', async () => {
    expect((await request(app).get('/api/stats')).status).toBe(401);
    expect((await request(app).get('/api/stats').set('Authorization', customer(1))).status).toBe(403);
    expect((await request(app).get('/api/stats').set(partnerKey())).status).toBe(401);
  });

  it('reports totals, error rate, routes and the slowest route', async () => {
    await request(app).get('/api/bookings').set(partnerKey());   // 200
    await request(app).get('/api/bookings');                      // 401
    await request(app).get('/api/handymen');                      // 200
    const res = await request(app).get('/api/stats').set('Authorization', admin());
    expect(res.status).toBe(200);
    expect(res.body.totalRequests).toBe(3);        // the stats call itself is counted after it finishes
    expect(res.body.errorCount).toBe(1);
    expect(res.body.errorRate).toBeCloseTo(0.33, 2);
    expect(res.body.byStatus).toEqual({ 200: 2, 401: 1 });
    expect(res.body.routes.find((r) => r.route === 'GET /api/bookings').count).toBe(2);
    expect(res.body.slowestRoute).toHaveProperty('route');
  });

  it('never exposes a key or a token', async () => {
    await request(app).get('/api/bookings').set(partnerKey());
    const res = await request(app).get('/api/stats').set('Authorization', admin());
    const text = JSON.stringify(res.body);
    expect(text).not.toContain('test-partner-key-1234');
    expect(text).not.toContain('Bearer');
  });
});

describe('request log', () => {
  it('logs method, path, status and a key-xxxxxx label, never the key or the query string', async () => {
    process.env.LOG_REQUESTS = 'true';
    const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
    try {
      await request(app).get('/api/bookings?status=completed').set(partnerKey());
      await request(app).get('/api/bookings');
      const lines = spy.mock.calls.map((c) => c[0]);
      expect(lines[0]).toMatch(/GET \/api\/bookings 200 \d+ms caller=key-[0-9a-f]{6}$/);
      expect(lines[1]).toMatch(/GET \/api\/bookings 401 \d+ms caller=none$/);
      expect(lines.join('\n')).not.toContain('test-partner-key-1234');
      expect(lines.join('\n')).not.toContain('status=completed');
    } finally {
      spy.mockRestore();
      process.env.LOG_REQUESTS = 'false';
    }
  });
});

describe('general rate limit', () => {
  it('returns 429 with Retry-After after the limit, per key, while another key is unaffected', async () => {
    process.env.RATE_LIMIT_MAX = '3';
    try {
      for (let i = 0; i < 3; i += 1) {
        expect((await request(app).get('/api/handymen').set(partnerKey())).status).toBe(200);
      }
      const blocked = await request(app).get('/api/handymen').set(partnerKey());
      expect(blocked.status).toBe(429);
      expect(blocked.body.code).toBe('RATE_LIMITED');
      expect(Number(blocked.headers['retry-after'])).toBeGreaterThan(0);
      expect((await request(app).get('/api/handymen').set('X-API-Key', 'second-test-key-5678')).status).toBe(200);
    } finally {
      process.env.RATE_LIMIT_MAX = '1000';
    }
  });
});
