const express = require('express');
const router = express.Router();
const db = require('../db');

// GET all students
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM students');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch students' });
  }
});

// POST a new student
router.post('/', async (req, res) => {
  const { name, email, course, year_of_study } = req.body;

  // Basic validation
  if (!name || !email || !course || !year_of_study) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  try {
    const sql = 'INSERT INTO students (name, email, course, year_of_study) VALUES (?, ?, ?, ?)';
    const [result] = await db.query(sql, [name, email, course, year_of_study]);

    // Return the created student with its generated ID
    res.status(201).json({
      id: result.insertId,
      name,
      email,
      course,
      year_of_study: Number(year_of_study),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to add student' });
  }
});

module.exports = router;