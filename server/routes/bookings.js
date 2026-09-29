const express = require('express');
const router = express.Router();
const db = require('../db');

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
    createdAt: row.created_at
  };
}

// Create a booking — field names match the contract's CreateBookingRequest (camelCase)
router.post('/', async (req, res) => {
  const {
    handymanId,
    customerName,
    customerPhone,
    customerEmail,
    serviceDescription,
    scheduledTime
  } = req.body;

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

  try {
    const [result] = await db.query(
      `INSERT INTO bookings
      (handyman_id, customer_name, customer_phone, customer_email, service_description, scheduled_time, status, notes)
      VALUES (?, ?, ?, ?, ?, ?, 'pending', NULL)`,
      [handymanId, customerName, customerPhone, customerEmail || null, serviceDescription, scheduledTime]
    );

    const [rows] = await db.query('SELECT * FROM bookings WHERE id = ?', [result.insertId]);
    res.status(201).json(toBookingResponse(rows[0]));
  } catch (err) {
    console.error('Database error:', err.sqlMessage || err.message);
    res.status(500).json({ error: 'Failed to create booking' });
  }
});

// Get all bookings — supports the contract's status filter
router.get('/', async (req, res) => {
  const { status } = req.query;

  if (status !== undefined && !ALLOWED_STATUSES.includes(status)) {
    return res.status(400).json({
      code: 'INVALID_QUERY_PARAM',
      message: `status must be one of: ${ALLOWED_STATUSES.join(', ')}`
    });
  }

  try {
    let sql = 'SELECT * FROM bookings';
    const params = [];
    if (status) {
      sql += ' WHERE status = ?';
      params.push(status);
    }
    const [rows] = await db.query(sql, params);
    res.status(200).json(rows.map(toBookingResponse));
  } catch (err) {
    console.error('Database error:', err.sqlMessage || err.message);
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
});

// Get a single booking by ID
router.get('/:id', async (req, res) => {
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

// Update a booking's status or notes
router.patch('/:id', async (req, res) => {
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

    const fields = [];
    const params = [];
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