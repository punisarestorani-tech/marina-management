-- Test booking data
-- Run this in Supabase SQL Editor to test berth status colors

-- First, let's see what berths exist
SELECT id, code, status FROM berths LIMIT 10;

-- Insert a test booking (checked_in = RED on map)
INSERT INTO berth_bookings (
  berth_code,
  check_in_date,
  check_out_date,
  guest_name,
  guest_email,
  guest_phone,
  guest_country,
  vessel_name,
  vessel_registration,
  vessel_type,
  status,
  price_per_day,
  total_amount,
  payment_status,
  source
) VALUES (
  'A-01',
  CURRENT_DATE,
  CURRENT_DATE + INTERVAL '3 days',
  'Marko Markovic',
  'marko@example.com',
  '+382 67 123 456',
  'Montenegro',
  'Sea Spirit',
  'MNE-1234-AB',
  'sailboat',
  'checked_in',  -- This will make berth RED
  50.00,
  150.00,
  'paid',
  'direct'
);

-- Insert a reserved booking (confirmed = YELLOW on map)
INSERT INTO berth_bookings (
  berth_code,
  check_in_date,
  check_out_date,
  guest_name,
  guest_country,
  vessel_name,
  status,
  price_per_day,
  total_amount,
  payment_status,
  source
) VALUES (
  'A-02',
  CURRENT_DATE,
  CURRENT_DATE + INTERVAL '2 days',
  'Ivan Ivanovic',
  'Croatia',
  'Blue Wave',
  'confirmed',  -- This will make berth YELLOW
  60.00,
  120.00,
  'unpaid',
  'phone'
);

-- Verify bookings were created
SELECT
  berth_code,
  guest_name,
  status,
  check_in_date,
  check_out_date
FROM berth_bookings
WHERE check_in_date <= CURRENT_DATE
  AND check_out_date > CURRENT_DATE;
