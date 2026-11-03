const express = require('express');
const app = express();

let mode = 'ok'; // ok | slow | flaky | error
let calls = 0;

const goals = [
  { id: 1, handyman_id: 1, goal_amount: 1000, current_amount: 450, progress_percentage: 45 },
];

// Switch behaviour without restarting: curl.exe http://localhost:4000/__mode/slow
app.get('/__mode/:m', (req, res) => {
  mode = req.params.m;
  calls = 0;
  res.json({ mode });
});

app.get('/api/handymen/:id/savings-goals', async (req, res) => {
  calls += 1;
  console.log(`GET savings-goals (call ${calls}, mode ${mode})`);
  if (mode === 'slow') {
    await new Promise((r) => setTimeout(r, 10000)); // answers after 10 seconds
  }
  if (mode === 'flaky' && calls % 3 !== 0) {
    return res.status(503).json({ message: 'Try again' }); // fails twice, then works
  }
  if (mode === 'error') {
    return res.status(500).json({ message: 'Internal error' }); // always fails
  }
  res.json(goals);
});

app.listen(4000, () => console.log('Stand-in partner on http://localhost:4000'));