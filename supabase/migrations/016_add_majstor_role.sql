-- Marina Management System - Add Majstor (Technician) Role
-- Run this in Supabase SQL Editor

-- =============================================
-- UPDATE PROFILES CHECK CONSTRAINT
-- =============================================

-- Drop existing constraint
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

-- Add new constraint including majstor role
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('inspector', 'majstor', 'operator', 'manager', 'admin'));

-- =============================================
-- ADD COMPLETION PHOTOS COLUMN TO DAMAGE_REPORTS
-- =============================================

ALTER TABLE damage_reports ADD COLUMN IF NOT EXISTS completion_photo_urls TEXT[];

-- =============================================
-- ADD INDEX FOR FASTER ASSIGNED_TO QUERIES
-- =============================================

CREATE INDEX IF NOT EXISTS idx_damage_reports_assigned_to ON damage_reports(assigned_to);

-- =============================================
-- UPDATE RLS POLICIES FOR MAJSTOR ACCESS
-- =============================================

-- Allow majstor to view their assigned damage reports
DROP POLICY IF EXISTS "Majstor can view assigned reports" ON damage_reports;
CREATE POLICY "Majstor can view assigned reports" ON damage_reports
  FOR SELECT
  TO authenticated
  USING (
    assigned_to = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('manager', 'admin')
    )
  );

-- Allow majstor to update their assigned reports (for completion)
DROP POLICY IF EXISTS "Majstor can update assigned reports" ON damage_reports;
CREATE POLICY "Majstor can update assigned reports" ON damage_reports
  FOR UPDATE
  TO authenticated
  USING (
    assigned_to = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('manager', 'admin')
    )
  )
  WITH CHECK (
    assigned_to = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('manager', 'admin')
    )
  );
