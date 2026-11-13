// Gives an EXISTING customer a login password (used for the seeded demo customers 1 and 2).
// Usage, from server/:   node set-password.js 1 "a-password-of-8-to-72-characters"
require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('./db');

(async () => {
  const [id, password] = process.argv.slice(2);
  if (!/^[1-9]\d*$/.test(id || '') || !password || password.length < 8 || Buffer.byteLength(password) > 72) {
    console.error('Usage: node set-password.js <customerId> "<password 8-72 characters>"');
    process.exitCode = 1;
    return;
  }
  const hash = await bcrypt.hash(password, 10);
  const [result] = await db.query('UPDATE customers SET password_hash = ? WHERE id = ?', [hash, Number(id)]);
  if (result.affectedRows === 0) {
    console.error(`No customer with id ${id}.`);
    process.exitCode = 1;
  } else {
    const [[c]] = await db.query('SELECT name, email FROM customers WHERE id = ?', [Number(id)]);
    console.log(`Password set for customer ${id}: ${c.name} (${c.email}). They can now log in with that email.`);
  }
})()
  .catch((err) => { console.error('FAILED:', err.code || err.message); process.exitCode = 1; })
  .finally(() => db.end());
