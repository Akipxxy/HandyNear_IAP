const express = require('express');
const router = express.Router();
const db = require('../db');
const mm = require('../moneymentor');

const MAX_CENTS = 1000000000;
const toCustomer = (row) => ({
  id: row.id, name: row.name, phone: row.phone, email: row.email, createdAt: row.created_at,
});

// Create a customer
router.post('/', async (req, res) => {
  const { name, phone, email } = req.body || {};
  if (typeof name !== 'string' || !name.trim() || name.length > 100 ||
      typeof phone !== 'string' || !phone.trim() || phone.length > 20) {
    return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'name (max 100) and phone (max 20) are required' });
  }
  if (email !== undefined && (typeof email !== 'string' || email.length > 100)) {
    return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'email must be a string of at most 100 characters' });
  }
  try {
    const [result] = await db.query(
      'INSERT INTO customers (name, phone, email) VALUES (?, ?, ?)',
      [name.trim(), phone.trim(), email || null]
    );
    const [rows] = await db.query('SELECT * FROM customers WHERE id = ?', [result.insertId]);
    res.status(201).json(toCustomer(rows[0]));
  } catch (err) {
    console.error('Database error:', err.sqlMessage || err.message);
    res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Failed to create customer' });
  }
});

// Loads the customer named in the URL, or answers 400/404
async function loadCustomer(req, res, next) {
  if (!/^[1-9]\d{0,9}$/.test(req.params.id)) {
    return res.status(400).json({ code: 'INVALID_ID', message: 'Customer ID must be a positive integer' });
  }
  try {
    const [rows] = await db.query('SELECT * FROM customers WHERE id = ?', [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ code: 'RESOURCE_NOT_FOUND', message: 'Customer not found' });
    }
    req.customer = rows[0];
    next();
  } catch (err) {
    console.error('Database error:', err.sqlMessage || err.message);
    res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Failed to load customer' });
  }
}

router.get('/:id', loadCustomer, (req, res) => res.json(toCustomer(req.customer)));

// Wallet: the money lives at MoneyMentor. We only pass requests through.
router.get('/:id/wallet', loadCustomer, async (req, res) => {
  try {
    res.set('Cache-Control', 'no-store').json(await mm.getWallet(req.customer.id));
  } catch (err) { mm.sendPartnerError(res, err); }
});

router.get('/:id/wallet/transactions', loadCustomer, async (req, res) => {
  try {
    res.set('Cache-Control', 'no-store').json(await mm.getTransactions(req.customer.id));
  } catch (err) { mm.sendPartnerError(res, err); }
});

router.post('/:id/wallet/topups', loadCustomer, async (req, res) => {
  const key = req.get('Idempotency-Key');
  if (!key || !/^[A-Za-z0-9_-]{1,100}$/.test(key)) {
    return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'Idempotency-Key header is required (1-100 letters, digits, - or _)' });
  }
  const body = req.body || {};
  if (Object.keys(body).length !== 1 || !Number.isSafeInteger(body.amountCents) ||
      body.amountCents < 1 || body.amountCents > MAX_CENTS) {
    return res.status(400).json({ code: 'VALIDATION_ERROR', message: `Send only amountCents, an integer from 1 to ${MAX_CENTS}` });
  }
  try {
    res.status(201).json(await mm.topUp(req.customer.id, body.amountCents, key));
  } catch (err) { mm.sendPartnerError(res, err); }
});

module.exports = router;