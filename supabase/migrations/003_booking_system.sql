-- Marina Management System - Booking System
-- Run this in Supabase SQL Editor

-- =============================================
-- BERTH TYPES & BOOKING TABLES
-- =============================================

-- Add berth_type to track if berth is for long-term or short-term rental
ALTER TABLE berths ADD COLUMN IF NOT EXISTS berth_type TEXT DEFAULT 'transit'
  CHECK (berth_type IN ('communal', 'transit'));

-- Add pricing columns to berths
ALTER TABLE berths ADD COLUMN IF NOT EXISTS daily_rate_summer DECIMAL(10,2) DEFAULT 0;
ALTER TABLE berths ADD COLUMN IF NOT EXISTS daily_rate_winter DECIMAL(10,2) DEFAULT 0;
ALTER TABLE berths ADD COLUMN IF NOT EXISTS weekly_rate DECIMAL(10,2) DEFAULT 0;
ALTER TABLE berths ADD COLUMN IF NOT EXISTS monthly_rate DECIMAL(10,2) DEFAULT 0;

-- =============================================
-- BOOKINGS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS berth_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Berth reference
  berth_id UUID REFERENCES berths(id) ON DELETE CASCADE,
  berth_code TEXT NOT NULL, -- Denormalized for easy display

  -- Booking dates
  check_in_date DATE NOT NULL,
  check_out_date DATE NOT NULL,
  actual_check_in TIMESTAMPTZ,
  actual_check_out TIMESTAMPTZ,

  -- Guest information
  guest_name TEXT NOT NULL,
  guest_email TEXT,
  guest_phone TEXT,
  guest_country TEXT,
  guest_address TEXT,
  guest_id_number TEXT, -- Passport or ID

  -- Vessel information
  vessel_name TEXT,
  vessel_registration TEXT,
  vessel_type TEXT CHECK (vessel_type IN ('sailboat', 'motorboat', 'yacht', 'catamaran', 'other')),
  vessel_length DECIMAL(5,2),
  vessel_width DECIMAL(5,2),
  vessel_draft DECIMAL(4,2),
  vessel_flag TEXT, -- Country flag

  -- Booking status
  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending',      -- Awaiting confirmation
    'confirmed',    -- Booking confirmed
    'checked_in',   -- Guest arrived
    'checked_out',  -- Guest departed
    'cancelled',    -- Booking cancelled
    'no_show'       -- Guest didn't arrive
  )),

  -- Pricing
  price_per_day DECIMAL(10,2) NOT NULL,
  total_nights INTEGER GENERATED ALWAYS AS (check_out_date - check_in_date) STORED,
  subtotal DECIMAL(12,2),
  discount_percent DECIMAL(5,2) DEFAULT 0,
  discount_amount DECIMAL(10,2) DEFAULT 0,
  tax_percent DECIMAL(5,2) DEFAULT 0,
  tax_amount DECIMAL(10,2) DEFAULT 0,
  total_amount DECIMAL(12,2) NOT NULL,

  -- Payment
  payment_status TEXT DEFAULT 'unpaid' CHECK (payment_status IN (
    'unpaid',
    'partial',
    'paid',
    'refunded'
  )),
  amount_paid DECIMAL(12,2) DEFAULT 0,
  payment_method TEXT,
  payment_notes TEXT,

  -- Additional info
  notes TEXT,
  internal_notes TEXT, -- Staff only notes
  source TEXT DEFAULT 'direct' CHECK (source IN (
    'direct',       -- Direct booking
    'phone',        -- Phone reservation
    'email',        -- Email reservation
    'online',       -- Online booking system
    'agent',        -- Travel agent
    'walk_in'       -- Walk-in guest
  )),

  -- Tracking
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  confirmed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,

  -- Constraints
  CONSTRAINT valid_dates CHECK (check_out_date > check_in_date),
  CONSTRAINT valid_payment CHECK (amount_paid >= 0 AND amount_paid <= total_amount)
);

-- Create index for fast date range queries
CREATE INDEX IF NOT EXISTS idx_bookings_dates ON berth_bookings(berth_id, check_in_date, check_out_date);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON berth_bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_check_in ON berth_bookings(check_in_date);

-- =============================================
-- BOOKING PAYMENTS TABLE (for tracking multiple payments)
-- =============================================

CREATE TABLE IF NOT EXISTS booking_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES berth_bookings(id) ON DELETE CASCADE,

  amount DECIMAL(12,2) NOT NULL,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method TEXT CHECK (payment_method IN (
    'cash',
    'card',
    'bank_transfer',
    'online',
    'other'
  )),

  reference_number TEXT,
  notes TEXT,

  recorded_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- BLOCKED DATES TABLE (for maintenance, private use, etc.)
-- =============================================

CREATE TABLE IF NOT EXISTS berth_blocked_dates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  berth_id UUID NOT NULL REFERENCES berths(id) ON DELETE CASCADE,

  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT NOT NULL CHECK (reason IN (
    'maintenance',
    'private',
    'seasonal_closure',
    'other'
  )),
  notes TEXT,

  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_block_dates CHECK (end_date >= start_date)
);

-- =============================================
-- SEASONAL PRICING TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS seasonal_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  name TEXT NOT NULL, -- e.g., "High Season 2024", "Low Season"
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,

  -- Price multiplier (1.0 = normal, 1.5 = 50% more, 0.8 = 20% discount)
  price_multiplier DECIMAL(4,2) DEFAULT 1.0,

  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_season_dates CHECK (end_date >= start_date)
);

-- Insert default seasons
INSERT INTO seasonal_pricing (name, start_date, end_date, price_multiplier) VALUES
  ('Glavna sezona', '2024-06-15', '2024-09-15', 1.5),
  ('Pred/Post sezona', '2024-04-01', '2024-06-14', 1.2),
  ('Pred/Post sezona', '2024-09-16', '2024-10-31', 1.2),
  ('Van sezone', '2024-11-01', '2025-03-31', 0.8)
ON CONFLICT DO NOTHING;

-- =============================================
-- HELPER FUNCTIONS
-- =============================================

-- Function to check if a berth is available for given dates
CREATE OR REPLACE FUNCTION is_berth_available(
  p_berth_id UUID,
  p_check_in DATE,
  p_check_out DATE,
  p_exclude_booking_id UUID DEFAULT NULL
) RETURNS BOOLEAN AS $$
BEGIN
  -- Check for overlapping bookings
  IF EXISTS (
    SELECT 1 FROM berth_bookings
    WHERE berth_id = p_berth_id
      AND status NOT IN ('cancelled', 'no_show')
      AND (p_exclude_booking_id IS NULL OR id != p_exclude_booking_id)
      AND (
        (check_in_date <= p_check_in AND check_out_date > p_check_in) OR
        (check_in_date < p_check_out AND check_out_date >= p_check_out) OR
        (check_in_date >= p_check_in AND check_out_date <= p_check_out)
      )
  ) THEN
    RETURN FALSE;
  END IF;

  -- Check for blocked dates
  IF EXISTS (
    SELECT 1 FROM berth_blocked_dates
    WHERE berth_id = p_berth_id
      AND (
        (start_date <= p_check_in AND end_date >= p_check_in) OR
        (start_date <= p_check_out AND end_date >= p_check_out) OR
        (start_date >= p_check_in AND end_date <= p_check_out)
      )
  ) THEN
    RETURN FALSE;
  END IF;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to get berth bookings for a date range
CREATE OR REPLACE FUNCTION get_berth_calendar(
  p_berth_id UUID,
  p_start_date DATE,
  p_end_date DATE
) RETURNS TABLE (
  booking_id UUID,
  check_in_date DATE,
  check_out_date DATE,
  guest_name TEXT,
  vessel_name TEXT,
  status TEXT,
  payment_status TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    b.id,
    b.check_in_date,
    b.check_out_date,
    b.guest_name,
    b.vessel_name,
    b.status,
    b.payment_status
  FROM berth_bookings b
  WHERE b.berth_id = p_berth_id
    AND b.status NOT IN ('cancelled', 'no_show')
    AND b.check_out_date >= p_start_date
    AND b.check_in_date <= p_end_date
  ORDER BY b.check_in_date;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- ROW LEVEL SECURITY POLICIES
-- =============================================

ALTER TABLE berth_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE berth_blocked_dates ENABLE ROW LEVEL SECURITY;

-- Everyone can view bookings
CREATE POLICY "Bookings viewable by authenticated users"
  ON berth_bookings FOR SELECT
  TO authenticated
  USING (true);

-- Operators and above can create bookings
CREATE POLICY "Operators can create bookings"
  ON berth_bookings FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('operator', 'manager', 'admin')
    )
  );

-- Operators and above can update bookings
CREATE POLICY "Operators can update bookings"
  ON berth_bookings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('operator', 'manager', 'admin')
    )
  );

-- Only managers and admins can delete bookings
CREATE POLICY "Managers can delete bookings"
  ON berth_bookings FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('manager', 'admin')
    )
  );

-- Similar policies for payments
CREATE POLICY "Payments viewable by authenticated users"
  ON booking_payments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Operators can manage payments"
  ON booking_payments FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('operator', 'manager', 'admin')
    )
  );

-- =============================================
-- TRIGGERS
-- =============================================

-- Update berth_bookings.updated_at on changes
CREATE OR REPLACE FUNCTION update_booking_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_booking_timestamp
  BEFORE UPDATE ON berth_bookings
  FOR EACH ROW
  EXECUTE FUNCTION update_booking_timestamp();

-- Update amount_paid when payment is added
CREATE OR REPLACE FUNCTION update_booking_payment_total()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE berth_bookings
  SET amount_paid = (
    SELECT COALESCE(SUM(amount), 0)
    FROM booking_payments
    WHERE booking_id = NEW.booking_id
  ),
  payment_status = CASE
    WHEN (SELECT COALESCE(SUM(amount), 0) FROM booking_payments WHERE booking_id = NEW.booking_id) >= total_amount THEN 'paid'
    WHEN (SELECT COALESCE(SUM(amount), 0) FROM booking_payments WHERE booking_id = NEW.booking_id) > 0 THEN 'partial'
    ELSE 'unpaid'
  END
  WHERE id = NEW.booking_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_payment_total
  AFTER INSERT OR UPDATE OR DELETE ON booking_payments
  FOR EACH ROW
  EXECUTE FUNCTION update_booking_payment_total();

-- =============================================
-- VIEWS FOR REPORTS
-- =============================================

-- Today's arrivals
CREATE OR REPLACE VIEW v_todays_arrivals AS
SELECT
  b.*,
  br.code as berth_display_code
FROM berth_bookings b
LEFT JOIN berths br ON b.berth_id = br.id
WHERE b.check_in_date = CURRENT_DATE
  AND b.status IN ('confirmed', 'pending');

-- Today's departures
CREATE OR REPLACE VIEW v_todays_departures AS
SELECT
  b.*,
  br.code as berth_display_code
FROM berth_bookings b
LEFT JOIN berths br ON b.berth_id = br.id
WHERE b.check_out_date = CURRENT_DATE
  AND b.status = 'checked_in';

-- Current guests (checked in)
CREATE OR REPLACE VIEW v_current_guests AS
SELECT
  b.*,
  br.code as berth_display_code,
  (b.check_out_date - CURRENT_DATE) as nights_remaining
FROM berth_bookings b
LEFT JOIN berths br ON b.berth_id = br.id
WHERE b.status = 'checked_in'
ORDER BY b.check_out_date;

-- Monthly revenue summary
CREATE OR REPLACE VIEW v_monthly_revenue AS
SELECT
  DATE_TRUNC('month', check_in_date) as month,
  COUNT(*) as total_bookings,
  SUM(total_nights) as total_nights,
  SUM(total_amount) as total_revenue,
  SUM(amount_paid) as collected_revenue,
  SUM(total_amount - amount_paid) as outstanding_amount
FROM berth_bookings
WHERE status NOT IN ('cancelled', 'no_show')
GROUP BY DATE_TRUNC('month', check_in_date)
ORDER BY month DESC;

-- Occupancy by berth
CREATE OR REPLACE VIEW v_berth_occupancy AS
SELECT
  br.id as berth_id,
  br.code as berth_code,
  br.berth_type,
  COUNT(b.id) as total_bookings,
  COALESCE(SUM(b.total_nights), 0) as booked_nights,
  COALESCE(SUM(b.total_amount), 0) as total_revenue
FROM berths br
LEFT JOIN berth_bookings b ON br.id = b.berth_id
  AND b.status NOT IN ('cancelled', 'no_show')
  AND b.check_in_date >= DATE_TRUNC('year', CURRENT_DATE)
GROUP BY br.id, br.code, br.berth_type
ORDER BY br.code;
