-- Urban Clippers schema (MySQL 8 / TiDB compatible).
-- Safe to run more than once: every table uses IF NOT EXISTS.
-- Run it with `npm run db:setup`, or paste it into the TiDB Cloud SQL Editor
-- after selecting the urban_clippers database.

CREATE TABLE IF NOT EXISTS barbers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(60) NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS services (
  id INT AUTO_INCREMENT PRIMARY KEY,
  category VARCHAR(40) NOT NULL,
  name VARCHAR(100) NOT NULL,
  description VARCHAR(240) NOT NULL DEFAULT '',
  price_bdt INT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  CONSTRAINT chk_service_price CHECK (price_bdt >= 0)
);

-- One row per weekday. 0 = Sunday ... 6 = Saturday.
CREATE TABLE IF NOT EXISTS shop_hours (
  weekday TINYINT NOT NULL PRIMARY KEY,
  is_closed TINYINT(1) NOT NULL DEFAULT 0,
  open_time TIME NOT NULL,
  close_time TIME NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(80) NOT NULL,
  email VARCHAR(160) NULL,
  phone VARCHAR(20) NULL,
  password_hash VARCHAR(100) NULL,
  role ENUM('client','admin') NOT NULL DEFAULT 'client',
  is_demo TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_users_email (email),
  UNIQUE KEY uq_users_phone (phone)
);
-- Clients sign in with their phone number and a one-time code: no email, no password.
-- Staff (admin) accounts still use email + password, so those two columns stay in the table but are optional.

-- A barber who is unchecked for a date has a row here. No row means working.
CREATE TABLE IF NOT EXISTS barber_days_off (
  barber_id INT NOT NULL,
  off_date DATE NOT NULL,
  PRIMARY KEY (barber_id, off_date),
  CONSTRAINT fk_off_barber FOREIGN KEY (barber_id) REFERENCES barbers(id)
);

CREATE TABLE IF NOT EXISTS bookings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(12) NOT NULL,
  user_id INT NULL,
  customer_name VARCHAR(80) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  barber_id INT NOT NULL,
  slot_date DATE NOT NULL,
  slot_time TIME NOT NULL,
  status ENUM('booked','completed','cancelled','no_show') NOT NULL DEFAULT 'booked',
  source ENUM('online','walkin') NOT NULL DEFAULT 'online',
  hours TINYINT NOT NULL DEFAULT 1,
  barber_requested TINYINT(1) NOT NULL DEFAULT 0,
  total_bdt INT NOT NULL,
  note VARCHAR(200) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_bookings_code (code),
  INDEX idx_bookings_day (slot_date, status),
  INDEX idx_bookings_phone (phone, status),
  INDEX idx_bookings_user (user_id),
  CONSTRAINT fk_bookings_barber FOREIGN KEY (barber_id) REFERENCES barbers(id),
  CONSTRAINT fk_bookings_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Prices are copied at booking time so later price edits never change old bookings.
CREATE TABLE IF NOT EXISTS booking_services (
  booking_id INT NOT NULL,
  service_id INT NOT NULL,
  service_name VARCHAR(100) NOT NULL,
  price_bdt INT NOT NULL,
  PRIMARY KEY (booking_id, service_id),
  CONSTRAINT fk_bs_booking FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
);

-- THE DOUBLE-BOOKING GUARD.
-- A live booking owns one row here per hour it needs: (barber, date, hour). A 2-hour booking owns two rows.
-- The UNIQUE key makes it impossible for two bookings to hold the same barber at the same time,
-- no matter how many requests arrive at once. Cancelling a booking deletes its row, which frees the slot.
CREATE TABLE IF NOT EXISTS booking_slots (
  id INT AUTO_INCREMENT PRIMARY KEY,
  barber_id INT NOT NULL,
  slot_date DATE NOT NULL,
  slot_time TIME NOT NULL,
  booking_id INT NOT NULL,
  UNIQUE KEY uq_barber_slot (barber_id, slot_date, slot_time),
  INDEX idx_slot_booking (booking_id),
  CONSTRAINT fk_slot_barber FOREIGN KEY (barber_id) REFERENCES barbers(id),
  CONSTRAINT fk_slot_booking FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
);

-- Fixed-window rate limiting that works on serverless hosts (no shared memory needed).
CREATE TABLE IF NOT EXISTS rate_limits (
  key_name VARCHAR(120) NOT NULL,
  window_start BIGINT NOT NULL,
  hits INT NOT NULL DEFAULT 1,
  PRIMARY KEY (key_name, window_start)
);

-- One-time sign-in codes. Only a keyed hash of the code is stored, never the code itself.
CREATE TABLE IF NOT EXISTS otp_codes (
  phone VARCHAR(20) NOT NULL PRIMARY KEY,
  code_hash CHAR(64) NOT NULL,
  expires_at BIGINT NOT NULL,
  sent_at BIGINT NOT NULL,
  attempts INT NOT NULL DEFAULT 0
);
