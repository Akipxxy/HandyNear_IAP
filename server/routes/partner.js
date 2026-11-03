const express = require('express');
const router = express.Router();
const { fetchWithRetry } = require('../resilientFetch');

let lastGood = null; // { data, asOf }, kept in memory (lost on restart, which is fine here)

router.get('/savings-goals', async (req, res) => {
  const base = process.env.PARTNER_URL;
  const token = process.env.PARTNER_API_KEY;
  const handymanId = process.env.PARTNER_HANDYMAN_ID || '1';

  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  try {
    const r = await fetchWithRetry(
      `${base}/api/handymen/${handymanId}/savings-goals`,
      { headers },
      { timeoutMs: 1500, retries: 2, delayMs: 200 }
    );
    if (!r.ok) throw new Error(`partner returned ${r.status}`);

    const goals = await r.json();
    const data = goals.map((g) => ({
      id: g.id,
      goalAmount: g.goal_amount,
      currentAmount: g.current_amount,
      progressPercentage: g.progress_percentage,
    }));
    lastGood = { data, asOf: new Date().toISOString() };
    return res.json({ data, stale: false, asOf: lastGood.asOf });
  } catch (err) {
    const reason = err.name === 'TimeoutError'
      ? 'timeout'
      : (err.cause?.code || err.message);
    console.error('partner call failed:', reason); // never log the token
    if (lastGood) {
      return res.json({ data: lastGood.data, stale: true, asOf: lastGood.asOf });
    }
    return res.status(502).json({ message: 'Partner data unavailable' });
  }
});

module.exports = router;