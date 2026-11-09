CREATE DATABASE IF NOT EXISTS handynear;
USE handynear;

CREATE TABLE IF NOT EXISTS handymen (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  phone VARCHAR(20),
  email VARCHAR(100),
  national_id VARCHAR(20),
  service_category VARCHAR(50) NOT NULL,
  hourly_rate DECIMAL(10,2) NOT NULL,
  rating DECIMAL(2,1) DEFAULT NULL,
  is_available TINYINT(1) NOT NULL DEFAULT 1,
  location VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS customers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  email VARCHAR(100),
  password_hash VARCHAR(100) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_customers_email (email)
);

CREATE TABLE IF NOT EXISTS bookings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  handyman_id INT NOT NULL,
  customer_id INT NULL,
  customer_name VARCHAR(100) NOT NULL,
  customer_phone VARCHAR(20) NOT NULL,
  customer_email VARCHAR(100),
  service_description TEXT NOT NULL,
  scheduled_time DATETIME NOT NULL,
  status ENUM('pending','confirmed','completed','cancelled') NOT NULL DEFAULT 'pending',
  notes TEXT,
  price_cents INT NULL,
  payment_status ENUM('unpaid','paid') NOT NULL DEFAULT 'unpaid',
  payment_transaction_id INT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (handyman_id) REFERENCES handymen(id),
  FOREIGN KEY (customer_id) REFERENCES customers(id)
);

INSERT INTO handymen (name, phone, email, national_id, service_category, hourly_rate, rating, is_available, location) VALUES
('John Mwangi',   '+254712345678', 'john@example.com',  '12345678', 'Plumbing',   1500.00, 4.5, 1, 'Westlands, Nairobi'),
('Grace Wanjiru', '+254723456789', 'grace@example.com', '23456789', 'Electrical', 1800.00, 4.8, 1, 'Kilimani, Nairobi'),
('Peter Otieno',  '+254734567890', 'peter@example.com', '34567890', 'Carpentry',  1200.00, 4.2, 0, 'Lavington, Nairobi');

INSERT INTO customers (id, name, phone, email) VALUES
(1, 'Sarah Mwangi', '+254798765432', 'sarah@example.com'),
(2, 'David Kamau',  '+254701234567', 'david@example.com');

INSERT INTO bookings (id, handyman_id, customer_id, customer_name, customer_phone, customer_email, service_description, scheduled_time, status, notes, price_cents, payment_status) VALUES
(1, 1, 1, 'Sarah Mwangi', '+254798765432', 'sarah@example.com', 'Leaking kitchen sink faucet repair', '2026-10-20 14:30:00', 'confirmed', NULL, 50000,  'unpaid'),
(2, 2, 2, 'David Kamau',  '+254701234567', 'david@example.com', 'Install ceiling light fittings',     '2026-10-22 10:00:00', 'pending',   NULL, 90000,  'unpaid'),
(3, 1, 1, 'Sarah Mwangi', '+254798765432', 'sarah@example.com', 'Replace bathroom tap',              '2026-10-25 09:00:00', 'completed', NULL, 150000, 'paid');