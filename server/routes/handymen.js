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
        res.json(rows);
    }
    catch(err){
        console.error('Database error:', err.sqlMessage || err.message);
            res.status(500).json({error: 'Failed to fetch handymen'});
        }
    });
    module.exports = router;

