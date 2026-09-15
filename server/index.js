const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('API is running');
});

const handymenRoutes = require('./routes/handymen');
app.use('/api/handymen', handymenRoutes);


const bookingRoutes = require('./routes/bookings');
app.use('/api/bookings', bookingRoutes);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://localhost:${PORT}`);
});