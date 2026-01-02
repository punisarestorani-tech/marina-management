-- Marina Management System - Inspections (Simplified)
-- Run this in Supabase SQL Editor

-- =============================================
-- DAILY INSPECTIONS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  berth_id UUID,
  berth_code TEXT NOT NULL,
  inspector_id UUID,
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

CREATE INDEX IF NOT EXISTS idx_inspections_berth ON inspections(berth_code);
CREATE INDEX IF NOT EXISTS idx_inspections_date ON inspections(inspected_at);

-- =============================================
-- VIOLATIONS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS violations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id UUID,
  berth_id UUID,
  berth_code TEXT,
  location_description TEXT,
  violation_type TEXT NOT NULL CHECK (violation_type IN (
    'illegal_mooring',
    'wrong_berth',
    'overstay',
    'unpaid',
    'damage',
    'rules_violation',
    'other'
  )),
  vessel_name TEXT,
  vessel_registration TEXT,
  vessel_description TEXT,
  description TEXT NOT NULL,
  photo_urls TEXT[],
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN (
    'open',
    'in_progress',
    'resolved',
    'dismissed'
  )),
  resolution_notes TEXT,
  resolved_by UUID,
  resolved_at TIMESTAMPTZ,
  reported_by UUID,
  reported_by_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_violations_berth ON violations(berth_code);
CREATE INDEX IF NOT EXISTS idx_violations_status ON violations(status);

-- =============================================
-- DAMAGE REPORTS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS damage_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_type TEXT NOT NULL CHECK (location_type IN (
    'berth', 'pontoon', 'dock', 'facility', 'electrical', 'water', 'other'
  )),
  berth_id UUID,
  berth_code TEXT,
  location_description TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN (
    'electrical', 'plumbing', 'structural', 'safety', 'cleanliness', 'equipment', 'other'
  )),
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  photo_urls TEXT[],
  status TEXT NOT NULL DEFAULT 'reported' CHECK (status IN (
    'reported', 'acknowledged', 'in_progress', 'completed', 'cancelled'
  )),
  assigned_to UUID,
  assigned_to_name TEXT,
  resolution_notes TEXT,
  completed_by UUID,
  completed_at TIMESTAMPTZ,
  reported_by UUID,
  reported_by_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_damage_reports_status ON damage_reports(status);
CREATE INDEX IF NOT EXISTS idx_damage_reports_severity ON damage_reports(severity);

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

ALTER TABLE inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE violations ENABLE ROW LEVEL SECURITY;
ALTER TABLE damage_reports ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read and write
CREATE POLICY "Allow all for inspections" ON inspections FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for violations" ON violations FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for damage_reports" ON damage_reports FOR ALL TO authenticated USING (true) WITH CHECK (true);
