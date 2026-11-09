const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const router = express.Router();
const db = require('../db');
const {
  signToken, requireRole, loginAllowed, recordLoginFailure, clearLoginFailures,
} = require('../auth');

const rounds = () => Number(process.env.BCRYPT_ROUNDS) || 10;
// Compared against when the email is unknown, so "no such user" takes as long as "wrong password"
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 4);
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const toCustomer = (row) => ({
  id: row.id, name: row.name, phone: row.phone, email: row.email, createdAt: row.created_at,
});
const bad = (res, message) => res.status(400).json({ code: 'VALIDATION_ERROR', message });
const digest = (v) => crypto.createHash('sha256').update(String(v)).digest();

// Customer sign-up. Returns a session token so the customer is logged in straight away.
router.post('/register', async (req, res) => {
  const { name, phone, email, password } = req.body || {};
  if (typeof name !== 'string' || !name.trim() || name.length > 100) return bad(res, 'name is required (max 100 characters)');
  if (typeof phone !== 'string' || !phone.trim() || phone.length > 20) return bad(res, 'phone is required (max 20 characters)');
  if (typeof email !== 'string' || !EMAIL.test(email.trim()) || email.length > 100) return bad(res, 'a valid email is required');
  if (typeof password !== 'string' || password.length < 8 || Buffer.byteLength(password) > 72) {
    return bad(res, 'password must be 8 to 72 characters');
  }
  const cleanEmail = email.trim().toLowerCase();
  try {
    const [existing] = await db.query('SELECT id FROM customers WHERE email = ?', [cleanEmail]);
    if (existing.length > 0) {
      return res.status(409).json({ code: 'CONFLICT', message: 'An account with this email already exists' });
    }
    const hash = await bcrypt.hash(password, rounds());
    const [result] = await db.query(
      'INSERT INTO customers (name, phone, email, password_hash) VALUES (?, ?, ?, ?)',
      [name.trim(), phone.trim(), cleanEmail, hash]
    );
    const [rows] = await db.query('SELECT * FROM customers WHERE id = ?', [result.insertId]);
    res.status(201).json({ token: signToken('customer', result.insertId), customer: toCustomer(rows[0]) });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ code: 'CONFLICT', message: 'An account with this email already exists' });
    }
    if (err.status === 503) return res.status(503).json({ code: 'AUTH_NOT_CONFIGURED', message: err.message });
    console.error('Database error:', err.sqlMessage || err.message);
    res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Could not create the account' });
  }
});

router.post('/login', async (req, res) => {
  if (!loginAllowed(req, res)) return;
  const { email, password } = req.body || {};
  if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) {
    return bad(res, 'email and password are required');
  }
  try {
    const [rows] = await db.query('SELECT * FROM customers WHERE email = ?', [email.trim().toLowerCase()]);
    const row = rows[0];
    const ok = await bcrypt.compare(password, (row && row.password_hash) || DUMMY_HASH);
    if (!row || !row.password_hash || !ok) {
      recordLoginFailure(req);
      return res.status(401).json({ code: 'INVALID_CREDENTIALS', message: 'Incorrect email or password' });
    }
    clearLoginFailures(req);
    res.json({ token: signToken('customer', row.id), customer: toCustomer(row) });
  } catch (err) {
    if (err.status === 503) return res.status(503).json({ code: 'AUTH_NOT_CONFIGURED', message: err.message });
    console.error('Database error:', err.sqlMessage || err.message);
    res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Could not log in' });
  }
});

// Admin login: one account, credentials come from server/.env (never from the database or git).
router.post('/admin/login', (req, res) => {
  if (!loginAllowed(req, res)) return;
  const expectedUser = process.env.ADMIN_USERNAME;
  const expectedPass = process.env.ADMIN_PASSWORD;
  if (!expectedUser || !expectedPass || expectedPass.length < 12) {
    return res.status(503).json({ code: 'AUTH_NOT_CONFIGURED', message: 'Admin login is not configured on the server.' });
  }
  const { username, password } = req.body || {};
  const ok =
    crypto.timingSafeEqual(digest(username ?? ''), digest(expectedUser)) &&
    crypto.timingSafeEqual(digest(password ?? ''), digest(expectedPass));
  if (!ok) {
    recordLoginFailure(req);
    return res.status(401).json({ code: 'INVALID_CREDENTIALS', message: 'Incorrect username or password' });
  }
  clearLoginFailures(req);
  try {
    res.json({ token: signToken('admin') });
  } catch (err) {
    res.status(503).json({ code: 'AUTH_NOT_CONFIGURED', message: err.message });
  }
});

// Who am I? Used by the client to check a saved session.
router.get('/me', requireRole('customer', 'admin'), async (req, res) => {
  if (req.auth.role === 'admin') return res.json({ role: 'admin' });
  try {
    const [rows] = await db.query('SELECT * FROM customers WHERE id = ?', [req.auth.id]);
    if (rows.length === 0) return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Account no longer exists' });
    res.json({ role: 'customer', customer: toCustomer(rows[0]) });
  } catch (err) {
    console.error('Database error:', err.sqlMessage || err.message);
    res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Could not load the account' });
  }
});

module.exports = router;
