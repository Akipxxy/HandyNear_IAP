jest.mock('../db', () => ({ query: jest.fn() }));
const db = require('../db');
const request = require('supertest');
const app = require('../app');

beforeEach(() => {
  db.query.mockClear();
});

describe('GET /api/handymen', () => {
  it('returns 200 and maps DB rows to the contract shape (happy path)', async () => {
    db.query.mockResolvedValueOnce([[
      {
        id: 1,
        name: 'John Kamau',
        phone: '+254712345678',
        email: 'john@example.com',
        national_id: '12345678',
        service_category: 'Plumbing',
        hourly_rate: '1500.00', // DECIMAL columns often come back as strings
        rating: 4.8,
        is_available: 1,
        location: 'Nairobi'
      }
    ]]);

    const res = await request(app).get('/api/handymen');

    expect(res.status).toBe(200);
    expect(res.body[0]).toHaveProperty('serviceCategory', 'Plumbing');
    expect(res.body[0]).toHaveProperty('isAvailable', true);
    expect(typeof res.body[0].hourlyRate).toBe('number'); // not a string
  });

  it('returns an empty array, not an error, when there are no matches (edge case)', async () => {
    db.query.mockResolvedValueOnce([[]]);
    const res = await request(app).get('/api/handymen');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('filters by serviceCategory using a query parameter', async () => {
    db.query.mockResolvedValueOnce([[]]);
    await request(app).get('/api/handymen?serviceCategory=Plumbing');
    const [sql, params] = db.query.mock.calls[0];
    expect(sql).toMatch(/service_category = \?/);
    expect(params).toContain('Plumbing');
  });

  it('rejects an invalid "available" value with 400', async () => {
    const res = await request(app).get('/api/handymen?available=maybe');
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('code');
  });
});

describe('GET /api/handymen/:id', () => {
  it('returns 200 with the matching handyman (happy path)', async () => {
    db.query.mockResolvedValueOnce([[
      { id: 12, name: 'John Kamau', phone: '+254712345678', email: 'john@example.com',
        national_id: '12345678', service_category: 'Plumbing', hourly_rate: '1500.00',
        rating: 4.8, is_available: 1, location: 'Nairobi' }
    ]]);
    const res = await request(app).get('/api/handymen/12');
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(12);
    expect(typeof res.body.hourlyRate).toBe('number');
  });

  it('returns 404 with the exact contract error shape when not found', async () => {
    db.query.mockResolvedValueOnce([[]]);
    const res = await request(app).get('/api/handymen/9999');
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('code', 'RESOURCE_NOT_FOUND');
    expect(res.body).toHaveProperty('message');
    expect(res.body).not.toHaveProperty('error'); // old, wrong field name
  });
});