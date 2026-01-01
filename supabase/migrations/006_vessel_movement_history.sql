-- Marina Management System - Vessel Movement History
-- Run this in Supabase SQL Editor

-- =============================================
-- VESSEL MOVEMENT HISTORY TABLE
-- Records all berth changes for vessels
-- =============================================

CREATE TABLE IF NOT EXISTS vessel_movement_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Vessel info (denormalized for history preservation)
  vessel_id UUID REFERENCES vessels(id) ON DELETE SET NULL,
  vessel_registration TEXT NOT NULL,
  vessel_name TEXT,

  -- Movement details
  from_berth_code TEXT, -- NULL if first arrival
  to_berth_code TEXT NOT NULL,

  -- Timestamps
  moved_at TIMESTAMPTZ DEFAULT NOW(),

  -- Reason for movement
  reason TEXT CHECK (reason IN (
    'arrival',           -- First arrival to marina
    'relocation',        -- Moving to different berth
    'maintenance',       -- Moving for maintenance
    'size_adjustment',   -- Moving to better fitting berth
    'customer_request',  -- Customer requested move
    'weather',           -- Weather-related move
    'departure',         -- Leaving marina
    'other'
  )) DEFAULT 'relocation',

  -- Additional info
  notes TEXT,

  -- Who made the change
  moved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  moved_by_name TEXT, -- Denormalized for history

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_vessel_movement_vessel ON vessel_movement_history(vessel_id);
CREATE INDEX IF NOT EXISTS idx_vessel_movement_registration ON vessel_movement_history(vessel_registration);
CREATE INDEX IF NOT EXISTS idx_vessel_movement_date ON vessel_movement_history(moved_at DESC);
CREATE INDEX IF NOT EXISTS idx_vessel_movement_to_berth ON vessel_movement_history(to_berth_code);

-- RLS
ALTER TABLE vessel_movement_history ENABLE ROW LEVEL SECURITY;

-- Everyone can view movement history
CREATE POLICY "Movement history viewable by authenticated users"
  ON vessel_movement_history FOR SELECT
  TO authenticated
  USING (true);

-- Operators and above can create movement records
CREATE POLICY "Operators can create movement records"
  ON vessel_movement_history FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('inspector', 'operator', 'manager', 'admin')
    )
  );

-- =============================================
-- VIEW: Vessel current location
-- =============================================
CREATE OR REPLACE VIEW v_vessel_current_locations AS
SELECT DISTINCT ON (vessel_registration)
  vessel_id,
  vessel_registration,
  vessel_name,
  to_berth_code as current_berth,
  moved_at as arrived_at,
  reason as last_movement_reason
FROM vessel_movement_history
WHERE reason != 'departure'
ORDER BY vessel_registration, moved_at DESC;

-- =============================================
-- VIEW: Recent movements (last 30 days)
-- =============================================
CREATE OR REPLACE VIEW v_recent_movements AS
SELECT
  vmh.*,
  v.type as vessel_type,
  v.length as vessel_length
FROM vessel_movement_history vmh
LEFT JOIN vessels v ON vmh.vessel_id = v.id
WHERE vmh.moved_at >= NOW() - INTERVAL '30 days'
ORDER BY vmh.moved_at DESC;

-- =============================================
-- FUNCTION: Record vessel movement
-- =============================================
CREATE OR REPLACE FUNCTION record_vessel_movement(
  p_vessel_registration TEXT,
  p_vessel_name TEXT,
  p_from_berth TEXT,
  p_to_berth TEXT,
  p_reason TEXT DEFAULT 'relocation',
  p_notes TEXT DEFAULT NULL,
  p_moved_by_name TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_vessel_id UUID;
  v_movement_id UUID;
  v_user_name TEXT;
BEGIN
  -- Get vessel ID if exists
  SELECT id INTO v_vessel_id
  FROM vessels
  WHERE registration_number = p_vessel_registration;

  -- Get user name if not provided
  IF p_moved_by_name IS NULL THEN
    SELECT full_name INTO v_user_name
    FROM profiles
    WHERE id = auth.uid();
  ELSE
    v_user_name := p_moved_by_name;
  END IF;

  -- Insert movement record
  INSERT INTO vessel_movement_history (
    vessel_id,
    vessel_registration,
    vessel_name,
    from_berth_code,
    to_berth_code,
    reason,
    notes,
    moved_by,
    moved_by_name
  ) VALUES (
    v_vessel_id,
    p_vessel_registration,
    p_vessel_name,
    p_from_berth,
    p_to_berth,
    p_reason,
    p_notes,
    auth.uid(),
    v_user_name
  ) RETURNING id INTO v_movement_id;

  RETURN v_movement_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
