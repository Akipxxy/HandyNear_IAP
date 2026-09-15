const express = require('express');
const router = express.Router();
const db = require('../db');

// Create a booking
router.post('/', async (req, res) => {
  const { handyman_id, customer_name, customer_phone, customer_email, job_description, booking_date } = req.body;
  try {
    const [result] = await db.query(
      'INSERT INTO bookings (handyman_id, customer_name, customer_phone, customer_email, job_description, booking_date) VALUES (?, ?, ?, ?, ?, ?)',
      [handyman_id, customer_name, customer_phone, customer_email, job_description, booking_date]
    );
    res.status(201).json({ message: 'Booking created', id: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create booking' });
  }
});

// Get all bookings
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM bookings');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
});

module.exports = router;
