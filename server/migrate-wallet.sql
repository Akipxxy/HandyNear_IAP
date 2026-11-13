-- Run ONCE on an existing handynear database (phpMyAdmin > SQL tab, or the mysql command line).
-- Adds customers, price and payment fields to bookings, and the demo rows.
USE handynear;

CREATE TABLE IF NOT EXISTS customers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  email VARCHAR(100),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS customer_id INT NULL,
  ADD COLUMN IF NOT EXISTS price_cents INT NULL,
  ADD COLUMN IF NOT EXISTS payment_status ENUM('unpaid','paid') NOT NULL DEFAULT 'unpaid',
  ADD COLUMN IF NOT EXISTS payment_transaction_id INT NULL;

INSERT INTO customers (id, name, phone, email) VALUES
  (1, 'Sarah Mwangi', '+254798765432', 'sarah@example.com'),
  (2, 'David Kamau',  '+254701234567', 'david@example.com')
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- Booking 1 matches the demo booking Team 6 registers: customer 1, handyman 1, KES 500
UPDATE bookings SET customer_id = 1, price_cents = 50000 WHERE id = 1;
UPDATE bookings SET customer_id = 2, price_cents = 90000 WHERE id = 2;

-- Booking 3: already completed and paid, so ShieldBox always has a completed booking to read
INSERT INTO bookings (id, handyman_id, customer_id, customer_name, customer_phone, customer_email,
                      service_description, scheduled_time, status, price_cents, payment_status)
VALUES (3, 1, 1, 'Sarah Mwangi', '+254798765432', 'sarah@example.com',
        'Replace bathroom tap', '2026-10-25 09:00:00', 'completed', 150000, 'paid')
ON DUPLICATE KEY UPDATE status = VALUES(status), payment_status = VALUES(payment_status);
