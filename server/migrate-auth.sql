-- Run ONCE on an existing handynear database (phpMyAdmin > SQL tab). Adds customer login support.
USE handynear;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS password_hash VARCHAR(100) NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_customers_email ON customers (email);
