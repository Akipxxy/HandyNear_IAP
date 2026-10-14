const express = require('express');
const router = express.Router();
const db = require('../db');

// Maps a raw DB row to the contract's Handyman shape
function toHandymanResponse(row) {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    email: row.email,
    nationalId: row.national_id,
    serviceCategory: row.service_category,
    hourlyRate: parseFloat(row.hourly_rate),
    rating: row.rating === null ? null : parseFloat(row.rating),
    isAvailable: Boolean(row.is_available),
    location: row.location
  };
}

// Register a handyman
// Note: not part of openapi.yaml's contract (predates it, from the registration
// page) — left as-is, out of scope for the Week 5/6 contract work.
router.post('/', async (req, res) => {
  const { name, phone, email, national_id, service_category, hourly_rate, is_available, location } = req.body;
  try {
    const [result] = await db.query(
      'INSERT INTO handymen(name, phone, email, national_id, service_category, hourly_rate, is_available, location)VALUES(?,?,?,?,?,?,?,?)',
      [name, phone, email, national_id, service_category, hourly_rate, is_available, location]
    );
    res.status(201).json({ message: 'Handyman registered', id: result.insertId });
  } catch (err) {
    console.error('Database error:', err.sqlMessage || err.message);
    res.status(500).json({ error: 'Failed to register handyman' });
  }
});

// GET all handymen — supports the contract's serviceCategory and available filters
router.get('/', async (req, res) => {
  const { serviceCategory, available } = req.query;

  if (available !== undefined && available !== 'true' && available !== 'false') {
    return res.status(400).json({
      code: 'INVALID_QUERY_PARAM',
      message: 'available must be "true" or "false"'
    });
  }

  try {
    let sql = 'SELECT * FROM handymen WHERE 1=1';
    const params = [];

    if (serviceCategory) {
      sql += ' AND service_category = ?';
      params.push(serviceCategory);
    }
    if (available !== undefined) {
      sql += ' AND is_available = ?';
      params.push(available === 'true' ? 1 : 0);
    }

    const [rows] = await db.query(sql, params);
    res.status(200).json(rows.map(toHandymanResponse));
  } catch (err) {
    console.error('Database error:', err.sqlMessage || err.message);
    res.status(500).json({ error: 'Failed to fetch handymen' });
  }
});

// GET a single handyman by ID
router.get('/:id', async (req, res) => {
  const handymanId = req.params.id;
  try {
    const [rows] = await db.query('SELECT * FROM handymen WHERE id = ?', [handymanId]);
    if (rows.length === 0) {
      return res.status(404).json({
        code: 'RESOURCE_NOT_FOUND',
        message: 'Handyman not found'
      });
    }
    res.status(200).json(toHandymanResponse(rows[0]));
  } catch (err) {
    console.error('Database error:', err.message);
    res.status(500).json({ error: 'Failed to fetch handyman' });
  }
});

module.exports = router;