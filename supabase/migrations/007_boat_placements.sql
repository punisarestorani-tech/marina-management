-- Marina Management System - Boat Placements on Map
-- Run this in Supabase SQL Editor

-- =============================================
-- BOAT PLACEMENTS TABLE
-- Stores boat positions on the marina map
-- =============================================

CREATE TABLE IF NOT EXISTS boat_placements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Berth info
  berth_code TEXT NOT NULL,

  -- Position on map
  latitude DECIMAL(10, 7) NOT NULL,
  longitude DECIMAL(10, 7) NOT NULL,

  -- Boat display properties
  size TEXT NOT NULL CHECK (size IN ('xs', 's', 'm', 'l', 'xl')) DEFAULT 'm',
  rotation INTEGER DEFAULT 0 CHECK (rotation >= 0 AND rotation < 360),

  -- Vessel info (can be linked to vessels table or standalone)
  vessel_id UUID REFERENCES vessels(id) ON DELETE SET NULL,
  vessel_name TEXT,
  vessel_registration TEXT,
  vessel_image_url TEXT,

  -- Metadata
  placed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  placed_by_name TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_boat_placements_berth ON boat_placements(berth_code);
CREATE INDEX IF NOT EXISTS idx_boat_placements_vessel ON boat_placements(vessel_id);

-- RLS
ALTER TABLE boat_placements ENABLE ROW LEVEL SECURITY;

-- Everyone can view boat placements
CREATE POLICY "Boat placements viewable by authenticated users"
  ON boat_placements FOR SELECT
  TO authenticated
  USING (true);

-- Operators and above can manage boat placements
CREATE POLICY "Operators can manage boat placements"
  ON boat_placements FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('inspector', 'operator', 'manager', 'admin')
    )
  );

-- Updated at trigger
CREATE TRIGGER boat_placements_updated_at
  BEFORE UPDATE ON boat_placements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
