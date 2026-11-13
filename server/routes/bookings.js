const express = require('express');
const router = express.Router();
const db = require('../db');
const mm = require('../moneymentor');
const { requireRole } = require('../auth');
const { requirePartnerOrRole } = require('../apiKeys');

const ALLOWED_STATUSES = ['pending', 'confirmed', 'completed', 'cancelled'];

// Maps a raw DB row to the contract's Booking shape
function toBookingResponse(row) {
  return {
    id: row.id,
    handymanId: row.handyman_id,
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    customerEmail: row.customer_email,
    serviceDescription: row.service_description,
    scheduledTime: row.scheduled_time,
    status: row.status,
    notes: row.notes,
    createdAt: row.created_at,
    customerId: row.customer_id ?? null,
    priceCents: row.price_cents ?? null,
    paymentStatus: row.payment_status ?? 'unpaid'
  };
}

// Create a booking. Customers must be logged in and can only book for themselves;
// the admin may book for any customerId. Field names match CreateBookingRequest (camelCase).
router.post('/', requireRole('customer', 'admin'), async (req, res) => {
  const {
    handymanId,
    customerName,
    customerPhone,
    customerEmail,
    serviceDescription,
    scheduledTime,
    customerId: bodyCustomerId,
    durationHours
  } = req.body;
  // A logged-in customer can never book (or pay) on behalf of someone else
  const customerId = req.auth.role === 'customer' ? req.auth.id : bodyCustomerId;

  // Validation-first: required fields per the contract, checked before anything is written
  if (!handymanId || !customerName || !customerPhone || !serviceDescription || !scheduledTime) {
    return res.status(400).json({
      code: 'VALIDATION_ERROR',
      message: 'handymanId, customerName, customerPhone, serviceDescription, and scheduledTime are required'
    });
  }
  if (typeof handymanId !== 'number') {
    return res.status(400).json({
      code: 'VALIDATION_ERROR',
      message: 'handymanId must be a number'
    });
  }

  // Wallet fields are optional: without customerId this behaves exactly as before.
  if (customerId !== undefined && (!Number.isInteger(customerId) || customerId < 1)) {
    return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'customerId must be a positive integer' });
  }
  if (durationHours !== undefined && (typeof durationHours !== 'number' || !(durationHours > 0) || durationHours > 24)) {
    return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'durationHours must be a number above 0 and at most 24' });
  }

  try {
    let priceCents = null;
    if (customerId !== undefined) {
      const [handymen] = await db.query('SELECT hourly_rate FROM handymen WHERE id = ?', [handymanId]);
      if (handymen.length === 0) {
        return res.status(404).json({ code: 'RESOURCE_NOT_FOUND', message: 'Handyman not found' });
      }
      const [customers] = await db.query('SELECT id FROM customers WHERE id = ?', [customerId]);
      if (customers.length === 0) {
        return res.status(404).json({ code: 'RESOURCE_NOT_FOUND', message: 'Customer not found' });
      }
      // Price = hourly rate x hours (default 1 hour), stored in cents
      priceCents = Math.round(Number(handymen[0].hourly_rate) * 100 * (durationHours ?? 1));
    }

    const [result] = await db.query(
      `INSERT INTO bookings
      (handyman_id, customer_id, customer_name, customer_phone, customer_email, service_description, scheduled_time, status, notes, price_cents)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', NULL, ?)`,
      [handymanId, customerId ?? null, customerName, customerPhone, customerEmail || null, serviceDescription, scheduledTime, priceCents]
    );

    // Only if Team 6 agrees a registration route and PARTNER_REGISTER_BOOKINGS=true is set
    if (customerId !== undefined && process.env.PARTNER_REGISTER_BOOKINGS === 'true') {
      try {
        await mm.registerBooking(result.insertId, customerId, handymanId, priceCents);
      } catch (err) {
        console.error('could not register booking with MoneyMentor:', err.message);
      }
    }

    const [rows] = await db.query('SELECT * FROM bookings WHERE id = ?', [result.insertId]);
    res.status(201).json(toBookingResponse(rows[0]));
  } catch (err) {
    console.error('Database error:', err.sqlMessage || err.message);
    res.status(500).json({ error: 'Failed to create booking' });
  }
});

// Get all bookings — supports the contract's status and handymanId filters
// Partners (Team 8) send X-API-Key; our own app uses the admin login. Customers use /mine.
router.get('/', requirePartnerOrRole('admin'), async (req, res) => {
  const { status, handymanId } = req.query;

  if (status !== undefined && !ALLOWED_STATUSES.includes(status)) {
    return res.status(400).json({
      code: 'INVALID_QUERY_PARAM',
      message: `status must be one of: ${ALLOWED_STATUSES.join(', ')}`
    });
  }

  if (handymanId !== undefined && !/^\d+$/.test(handymanId)) {
    return res.status(400).json({
      code: 'INVALID_QUERY_PARAM',
      message: 'handymanId must be a positive integer'
    });
  }

  try {
    let sql = 'SELECT * FROM bookings';
    const conditions = [];
    const params = [];

    if (status) {
      conditions.push('status = ?');
      params.push(status);
    }
    if (handymanId !== undefined) {
      conditions.push('handyman_id = ?');
      params.push(Number(handymanId));
    }
    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    const [rows] = await db.query(sql, params);
    res.status(200).json(rows.map(toBookingResponse));
  } catch (err) {
    console.error('Database error:', err.sqlMessage || err.message);
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
});

// The logged-in customer's own bookings (must be declared before '/:id')
router.get('/mine', requireRole('customer'), async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM bookings WHERE customer_id = ? ORDER BY id DESC', [req.auth.id]);
    res.status(200).json(rows.map(toBookingResponse));
  } catch (err) {
    console.error('Database error:', err.sqlMessage || err.message);
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
});

// Get a single booking by ID
router.get('/:id', requirePartnerOrRole('admin'), async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await db.query('SELECT * FROM bookings WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({
        code: 'RESOURCE_NOT_FOUND',
        message: 'Booking not found'
      });
    }
    res.status(200).json(toBookingResponse(rows[0]));
  } catch (err) {
    console.error('Database error:', err.sqlMessage || err.message);
    res.status(500).json({ error: 'Failed to fetch booking' });
  }
});

// Update a booking's status or notes (admin only; completing a booking pays the handyman)
router.patch('/:id', requireRole('admin'), async (req, res) => {
  const { id } = req.params;
  const { status, notes } = req.body;

  if (status === undefined && notes === undefined) {
    return res.status(400).json({
      code: 'VALIDATION_ERROR',
      message: 'at least one of status or notes must be provided'
    });
  }
  if (status !== undefined && !ALLOWED_STATUSES.includes(status)) {
    return res.status(400).json({
      code: 'VALIDATION_ERROR',
      message: `status must be one of: ${ALLOWED_STATUSES.join(', ')}`
    });
  }

  try {
    // Check existence first — an update on a nonexistent ID must 404, not silently create/succeed
    const [existing] = await db.query('SELECT * FROM bookings WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({
        code: 'RESOURCE_NOT_FOUND',
        message: 'Booking not found'
      });
    }

    const booking = existing[0];
    const fields = [];
    const params = [];

    // Completing a customer booking pays the handyman from the customer's wallet FIRST.
    // If payment fails the booking is left untouched. The payment key is booking-{id},
    // so retrying a completion never charges twice.
    const completing = status === 'completed' && booking.status !== 'completed';
    if (completing && booking.customer_id != null && booking.payment_status !== 'paid') {
      try {
        const payment = await mm.payBooking(booking.id);
        fields.push("payment_status = 'paid'", 'payment_transaction_id = ?');
        params.push(payment.id);
      } catch (err) {
        if (!(err instanceof mm.PartnerError)) throw err;
        if (err.status === 404) {
          return res.status(409).json({
            code: 'PAYMENT_NOT_READY',
            message: 'This booking is not registered with MoneyMentor yet, so it cannot be paid.'
          });
        }
        return res.status(err.status).json({
          code: err.code === 'CONFLICT' ? 'PAYMENT_FAILED' : err.code,
          message: err.message
        });
      }
    }

    if (status !== undefined) {
      fields.push('status = ?');
      params.push(status);
    }
    if (notes !== undefined) {
      fields.push('notes = ?');
      params.push(notes);
    }
    params.push(id);

    await db.query(`UPDATE bookings SET ${fields.join(', ')} WHERE id = ?`, params);

    const [rows] = await db.query('SELECT * FROM bookings WHERE id = ?', [id]);
    res.status(200).json(toBookingResponse(rows[0]));
  } catch (err) {
    console.error('Database error:', err.sqlMessage || err.message);
    res.status(500).json({ error: 'Failed to update booking' });
  }
});

module.exports = router;