const express = require('express');
const router = express.Router();
const { requireRole } = require('../auth');
const { getStats } = require('../monitor');

// Admin only. Numbers since the server started (in memory, reset on restart).
router.get('/', requireRole('admin'), (req, res) => res.status(200).json(getStats()));

module.exports = router;
