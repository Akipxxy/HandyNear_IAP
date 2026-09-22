const express = require('express');
const cors = require('cors');
require('dotenv').config();
const db = require('./db')

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('API is running');
});
app.get('/handymen', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM handymen');
    res.status(200).json(rows);
  } catch (err) {
    console.error('Database error:', err.message);
    res.status(500).json({ error: 'Failed to fetch handymen' });
  }
});
app.get('/bookings', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM bookings');
    res.status(200).json(rows);
  } catch (err) {
    console.error('Database error:', err.message);
    res.status(500).json({ error: 'Failed to fetch handymen' });
  }
});




const handymenRoutes = require('./routes/handymen');
app.use('/api/handymen', handymenRoutes);


const bookingRoutes = require('./routes/bookings');
app.use('/api/bookings', bookingRoutes);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://localhost:${PORT}`);
});