const express = require('express');
const router = express.Router();

router.get('/savings-goals', async (req, res) => {
  const base = process.env.PARTNER_URL;
  const token = process.env.PARTNER_API_KEY;
  const handymanId = process.env.PARTNER_HANDYMAN_ID || '1';

  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  try {
    const r = await fetch(`${base}/api/handymen/${handymanId}/savings-goals`, { headers });
    if (!r.ok) {
      console.error('partner returned', r.status); // status only, never the token
      return res.status(502).json({ message: 'Partner data unavailable' });
    }
    const goals = await r.json();
    res.json(goals.map((g) => ({
      id: g.id,
      goalAmount: g.goal_amount,
      currentAmount: g.current_amount,
      progressPercentage: g.progress_percentage,
    })));
  } catch (err) {
    console.error('partner call failed:', err.cause?.code || err.message);
    res.status(502).json({ message: 'Partner data unavailable' });
  }
});

module.exports = router;