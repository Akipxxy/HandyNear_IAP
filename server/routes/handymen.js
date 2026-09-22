const express = require('express');
const router = express.Router();
const db = require('../db');
//Register a handyman
router.post('/',async(req,res)=>{
    const { name, phone, email, national_id , service_category, hourly_rate, is_available, location}= req.body;
    console.log(req.body);
    try{
    const [result]=await db.query(
        'INSERT INTO handymen(name, phone, email, national_id, service_category, hourly_rate, is_available, location)VALUES(?,?,?,?,?,?,?,?)',
        [name, phone, email, national_id, service_category, hourly_rate, is_available, location]
    );
    res.status(201).json({message: 'Handyman registered', id:result.insertId});
}
catch (err){
     console.error('Database error:', err.sqlMessage || err.message);
    res.status(500).json({error:'Failed to reqister handyman'
    });
}

});
//GET all handymen
router.get('/',async(req, res)=>{
    try{
        const[rows]=await db.query('Select* FROM handymen');
        const response = rows.map(row => ({
      id: row.id,
      name: row.name,
      phone: row.phone,
      email: row.email,
      nationalId: row.national_id,
      serviceCategory: row.service_category,
      hourlyRate: parseFloat(row.hourly_rate),
      rating: row.rating,
      isAvailable: Boolean(row.is_available),
      location: row.location
    }));
    res.status(200).json(response);
    }
    catch(err){
        console.error('Database error:', err.sqlMessage || err.message);
            res.status(500).json({error: 'Failed to fetch handymen'});
        }
    });

    router.get('/:id', async (req, res) => {
  const handymanId = req.params.id;
  try {
    const [rows] = await db.query('SELECT * FROM handymen WHERE id = ?', [handymanId]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Handyman not found' });
    }

    const handyman = {
      id: rows[0].id,
      name: rows[0].name,
      phone: rows[0].phone,
      email: rows[0].email,
      nationalId: rows[0].national_id,
      serviceCategory: rows[0].service_category,
      hourlyRate: rows[0].hourly_rate,
      rating: rows[0].rating,
      isAvailable: Boolean(rows[0].is_available),
      location: rows[0].location
    };

    res.status(200).json(handyman);
  } catch (err) {
    console.error('Database error:', err.message);
    res.status(500).json({ error: 'Failed to fetch handyman' });
  }
});

    module.exports = router;

