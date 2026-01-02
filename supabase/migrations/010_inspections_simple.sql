-- INSPECTIONS TABLE (simplified)
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  berth_code TEXT NOT NULL,
  inspector_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  inspector_name TEXT,
  status TEXT NOT NULL CHECK (status IN (
    'correct',
    'wrong_vessel',
    'illegal_mooring',
    'missing_vessel',
    'empty_ok'
  )),
  found_vessel_name TEXT,
  found_vessel_registration TEXT,
  expected_vessel_name TEXT,
  expected_vessel_registration TEXT,
  notes TEXT,
  photo_url TEXT,
  inspected_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_inspections_berth ON inspections(berth_code);
CREATE INDEX IF NOT EXISTS idx_inspections_inspector ON inspections(inspector_id);
CREATE INDEX IF NOT EXISTS idx_inspections_date ON inspections(inspected_at);
CREATE INDEX IF NOT EXISTS idx_inspections_status ON inspections(status);

-- RLS
ALTER TABLE inspections ENABLE ROW LEVEL SECURITY;

-- Policies (allow all for authenticated users)
DROP POLICY IF EXISTS "Inspections viewable by authenticated" ON inspections;
CREATE POLICY "Inspections viewable by authenticated"
  ON inspections FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Inspections insert by authenticated" ON inspections;
CREATE POLICY "Inspections insert by authenticated"
  ON inspections FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Inspections update by authenticated" ON inspections;
CREATE POLICY "Inspections update by authenticated"
  ON inspections FOR UPDATE TO authenticated USING (true);
