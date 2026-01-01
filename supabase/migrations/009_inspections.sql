-- Marina Management System - Inspections, Violations & Damage Reports
-- Run this in Supabase SQL Editor

-- =============================================
-- DAILY INSPECTIONS TABLE
-- Records daily berth inspections by inspectors
-- =============================================

CREATE TABLE IF NOT EXISTS inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Berth being inspected
  berth_id UUID REFERENCES berths(id) ON DELETE CASCADE,
  berth_code TEXT NOT NULL,

  -- Inspector info
  inspector_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  inspector_name TEXT,

  -- Inspection result
  status TEXT NOT NULL CHECK (status IN (
    'correct',           -- Ispravan brod na vezu
    'wrong_vessel',      -- Pogrešan brod
    'illegal_mooring',   -- Nelegalno vezivanje (vez slobodan ali ima brod)
    'missing_vessel',    -- Brod nije na vezu (vez zauzet ali prazan)
    'empty_ok'           -- Slobodan vez, prazan - OK
  )),

  -- Vessel info found during inspection
  found_vessel_name TEXT,
  found_vessel_registration TEXT,

  -- Expected vessel (from booking/contract)
  expected_vessel_name TEXT,
  expected_vessel_registration TEXT,

  -- Notes and evidence
  notes TEXT,
  photo_url TEXT,

  -- Timestamps
  inspected_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_inspections_berth ON inspections(berth_code);
CREATE INDEX IF NOT EXISTS idx_inspections_inspector ON inspections(inspector_id);
CREATE INDEX IF NOT EXISTS idx_inspections_date ON inspections(inspected_at);
CREATE INDEX IF NOT EXISTS idx_inspections_status ON inspections(status);

-- =============================================
-- VIOLATIONS TABLE
-- Records violations found during inspections
-- =============================================

CREATE TABLE IF NOT EXISTS violations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Related inspection (optional)
  inspection_id UUID REFERENCES inspections(id) ON DELETE SET NULL,

  -- Location
  berth_id UUID REFERENCES berths(id) ON DELETE SET NULL,
  berth_code TEXT,
  location_description TEXT,

  -- Violation details
  violation_type TEXT NOT NULL CHECK (violation_type IN (
    'illegal_mooring',    -- Nelegalno vezivanje
    'wrong_berth',        -- Plovilo na pogrešnom vezu
    'overstay',           -- Prekoračenje vremena
    'unpaid',             -- Neplaćena naknada
    'damage',             -- Oštećenje imovine
    'rules_violation',    -- Kršenje pravila marine
    'other'               -- Ostalo
  )),

  -- Vessel involved
  vessel_name TEXT,
  vessel_registration TEXT,
  vessel_description TEXT,

  -- Evidence
  description TEXT NOT NULL,
  photo_urls TEXT[], -- Array of photo URLs

  -- Status tracking
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN (
    'open',       -- Novo, nerješeno
    'in_progress', -- U obradi
    'resolved',   -- Riješeno
    'dismissed'   -- Odbačeno
  )),

  -- Resolution
  resolution_notes TEXT,
  resolved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,

  -- Reporter
  reported_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  reported_by_name TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_violations_berth ON violations(berth_code);
CREATE INDEX IF NOT EXISTS idx_violations_type ON violations(violation_type);
CREATE INDEX IF NOT EXISTS idx_violations_status ON violations(status);
CREATE INDEX IF NOT EXISTS idx_violations_date ON violations(created_at);

-- =============================================
-- DAMAGE REPORTS TABLE
-- Records damage/maintenance issues
-- =============================================

CREATE TABLE IF NOT EXISTS damage_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Location
  location_type TEXT NOT NULL CHECK (location_type IN (
    'berth',      -- Vez
    'pontoon',    -- Ponton
    'dock',       -- Gat
    'facility',   -- Objekt (toalet, tuš, itd.)
    'electrical', -- Električna instalacija
    'water',      -- Vodovodna instalacija
    'other'       -- Ostalo
  )),
  berth_id UUID REFERENCES berths(id) ON DELETE SET NULL,
  berth_code TEXT,
  location_description TEXT NOT NULL,

  -- Damage details
  category TEXT NOT NULL CHECK (category IN (
    'electrical',   -- Električni kvar
    'plumbing',     -- Vodovodni kvar
    'structural',   -- Konstrukcijski problem
    'safety',       -- Sigurnosni problem
    'cleanliness',  -- Čistoća
    'equipment',    -- Oprema
    'other'         -- Ostalo
  )),

  severity TEXT NOT NULL CHECK (severity IN (
    'low',      -- Niska - može čekati
    'medium',   -- Srednja - treba riješiti uskoro
    'high',     -- Visoka - hitno
    'critical'  -- Kritična - odmah!
  )),

  -- Description and evidence
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  photo_urls TEXT[], -- Array of photo URLs

  -- Status tracking
  status TEXT NOT NULL DEFAULT 'reported' CHECK (status IN (
    'reported',     -- Prijavljeno
    'acknowledged', -- Primljeno na znanje
    'in_progress',  -- U popravci
    'completed',    -- Završeno
    'cancelled'     -- Otkazano
  )),

  -- Assignment
  assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
  assigned_to_name TEXT,

  -- Resolution
  resolution_notes TEXT,
  completed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  completed_at TIMESTAMPTZ,

  -- Reporter
  reported_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  reported_by_name TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_damage_reports_location ON damage_reports(location_type);
CREATE INDEX IF NOT EXISTS idx_damage_reports_category ON damage_reports(category);
CREATE INDEX IF NOT EXISTS idx_damage_reports_severity ON damage_reports(severity);
CREATE INDEX IF NOT EXISTS idx_damage_reports_status ON damage_reports(status);
CREATE INDEX IF NOT EXISTS idx_damage_reports_date ON damage_reports(created_at);

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

ALTER TABLE inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE violations ENABLE ROW LEVEL SECURITY;
ALTER TABLE damage_reports ENABLE ROW LEVEL SECURITY;

-- Inspections policies
CREATE POLICY "Inspections viewable by authenticated users"
  ON inspections FOR SELECT TO authenticated USING (true);

CREATE POLICY "Inspectors can create inspections"
  ON inspections FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('inspector', 'operator', 'manager', 'admin')
    )
  );

CREATE POLICY "Inspectors can update own inspections"
  ON inspections FOR UPDATE TO authenticated
  USING (inspector_id = auth.uid() OR EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('manager', 'admin')
  ));

-- Violations policies
CREATE POLICY "Violations viewable by authenticated users"
  ON violations FOR SELECT TO authenticated USING (true);

CREATE POLICY "Staff can manage violations"
  ON violations FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('inspector', 'operator', 'manager', 'admin')
    )
  );

-- Damage reports policies
CREATE POLICY "Damage reports viewable by authenticated users"
  ON damage_reports FOR SELECT TO authenticated USING (true);

CREATE POLICY "Staff can manage damage reports"
  ON damage_reports FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('inspector', 'operator', 'manager', 'admin')
    )
  );

-- =============================================
-- TRIGGERS
-- =============================================

CREATE TRIGGER violations_updated_at
  BEFORE UPDATE ON violations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER damage_reports_updated_at
  BEFORE UPDATE ON damage_reports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
