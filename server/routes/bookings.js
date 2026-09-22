const express = require('express');
const router = express.Router();
const db = require('../db');

// Create a booking
router.post('/', async (req, res) => {
  const {
    handyman_id,
    customer_name,
    customer_phone,
    customer_email,
    service_description,
    scheduled_time,
    status,
    notes
  } = req.body;

  try {
    const [result] = await db.query(
      `INSERT INTO bookings 
      (handyman_id, customer_name, customer_phone, customer_email, service_description, scheduled_time, status, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [handyman_id, customer_name, customer_phone, customer_email, service_description, scheduled_time, status, notes]
    );

    res.status(201).json({
      message: 'Booking created successfully',
      id: result.insertId
    });
  } catch (err) {
    console.error('Database error:', err.sqlMessage || err.message);
    res.status(500).json({ error: 'Failed to create booking' });
  }
});

// Get all bookings
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM bookings');
     const bookings = rows.map(row => ({
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
    }));
    res.status(200).json(bookings);
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
        message: 'RECOURCE_NOT_FOUND',
        error: 'Booking not found' });
    }

    const booking = rows.map(row => ({
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
    }))[0]; // only one record expected

    res.status(200).json(booking);
  } catch (err) {
    console.error('Database error:', err.sqlMessage || err.message);
    res.status(500).json({ error: 'Failed to fetch booking' });
  }
});


module.exports = router;
