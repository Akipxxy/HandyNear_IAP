const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.disable('x-powered-by');

app.use(cors());
app.use(express.json());

// Week 12 monitoring and Week 9 rate limit: before every route
const { requestLog } = require('./monitor');
const { rateLimit } = require('./rateLimit');
app.use(requestLog);
app.use('/api', rateLimit);

app.get('/', (req, res) => {
  res.send('API is running');
});

const handymenRoutes = require('./routes/handymen');
app.use('/api/handymen', handymenRoutes);

const bookingRoutes = require('./routes/bookings');
app.use('/api/bookings', bookingRoutes);

const customerRoutes = require('./routes/customers');
app.use('/api/customers', customerRoutes);

const statsRoutes = require('./routes/stats');
app.use('/api/stats', statsRoutes);

const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

// JSON error responses instead of HTML stack traces
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ code: 'INVALID_JSON', message: 'Request body is not valid JSON' });
  }
  console.error(err);
  res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Something went wrong' });
});

module.exports = app;