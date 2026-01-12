-- Migration: Add all pontoons A-F with berths
-- This ensures pontoons table is populated

-- =====================
-- PONTOONS A-F
-- =====================
INSERT INTO pontoons (id, name, code, is_active) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Ponton A', 'A', true),
  ('22222222-2222-2222-2222-222222222222', 'Ponton B', 'B', true),
  ('33333333-3333-3333-3333-333333333333', 'Ponton C', 'C', true),
  ('44444444-4444-4444-4444-444444444444', 'Ponton D', 'D', true),
  ('55555555-5555-5555-5555-555555555555', 'Ponton E', 'E', true),
  ('66666666-6666-6666-6666-666666666666', 'Ponton F', 'F', true)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  is_active = EXCLUDED.is_active;

-- =====================
-- BERTHS for pontoons that might be missing
-- =====================

-- Ponton A berths (A-01 to A-48)
DO $$
DECLARE
  i INTEGER;
  berth_code TEXT;
  berth_id UUID;
BEGIN
  FOR i IN 1..48 LOOP
    berth_code := 'A-' || LPAD(i::TEXT, 2, '0');
    berth_id := ('a' || LPAD(i::TEXT, 7, '0') || '-0000-0000-0000-000000000001')::UUID;

    INSERT INTO berths (id, pontoon_id, code, width, length, max_draft, daily_rate, status, has_water, has_electricity, max_vessel_length, max_vessel_width)
    VALUES (
      berth_id,
      '11111111-1111-1111-1111-111111111111',
      berth_code,
      3.0 + (i % 3) * 0.5,
      10.0 + (i % 5) * 2,
      2.5 + (i % 3) * 0.5,
      50 + (i % 4) * 10,
      'active',
      (i % 3) != 0,
      (i % 2) = 0,
      9.5 + (i % 5) * 2,
      2.7 + (i % 3) * 0.5
    )
    ON CONFLICT (code) DO NOTHING;
  END LOOP;
END $$;

-- Ponton B berths (B-01 to B-41)
DO $$
DECLARE
  i INTEGER;
  berth_code TEXT;
  berth_id UUID;
BEGIN
  FOR i IN 1..41 LOOP
    berth_code := 'B-' || LPAD(i::TEXT, 2, '0');
    berth_id := ('b' || LPAD(i::TEXT, 7, '0') || '-0000-0000-0000-000000000001')::UUID;

    INSERT INTO berths (id, pontoon_id, code, width, length, max_draft, daily_rate, status, has_water, has_electricity, max_vessel_length, max_vessel_width)
    VALUES (
      berth_id,
      '22222222-2222-2222-2222-222222222222',
      berth_code,
      4.0 + (i % 3) * 0.5,
      12.0 + (i % 5) * 2,
      3.0 + (i % 3) * 0.5,
      70 + (i % 4) * 10,
      'active',
      true,
      true,
      11.5 + (i % 5) * 2,
      3.5 + (i % 3) * 0.5
    )
    ON CONFLICT (code) DO NOTHING;
  END LOOP;
END $$;

-- Ponton C berths (C-01 to C-10)
DO $$
DECLARE
  i INTEGER;
  berth_code TEXT;
  berth_id UUID;
BEGIN
  FOR i IN 1..10 LOOP
    berth_code := 'C-' || LPAD(i::TEXT, 2, '0');
    berth_id := ('c' || LPAD(i::TEXT, 7, '0') || '-0000-0000-0000-000000000001')::UUID;

    INSERT INTO berths (id, pontoon_id, code, width, length, max_draft, daily_rate, status, has_water, has_electricity, max_vessel_length, max_vessel_width)
    VALUES (
      berth_id,
      '33333333-3333-3333-3333-333333333333',
      berth_code,
      5.0 + (i % 3) * 0.5,
      16.0 + (i % 5) * 2,
      4.0 + (i % 3) * 0.5,
      100 + (i % 4) * 20,
      'active',
      true,
      true,
      15.5 + (i % 5) * 2,
      4.5 + (i % 3) * 0.5
    )
    ON CONFLICT (code) DO NOTHING;
  END LOOP;
END $$;

-- Ponton D berths (D-01 to D-10)
DO $$
DECLARE
  i INTEGER;
  berth_code TEXT;
  berth_id UUID;
BEGIN
  FOR i IN 1..10 LOOP
    berth_code := 'D-' || LPAD(i::TEXT, 2, '0');
    berth_id := ('d' || LPAD(i::TEXT, 7, '0') || '-0000-0000-0000-000000000001')::UUID;

    INSERT INTO berths (id, pontoon_id, code, width, length, max_draft, daily_rate, status, has_water, has_electricity, max_vessel_length, max_vessel_width)
    VALUES (
      berth_id,
      '44444444-4444-4444-4444-444444444444',
      berth_code,
      6.0 + (i % 3) * 0.5,
      22.0 + (i % 5) * 4,
      5.0 + (i % 3) * 0.5,
      180 + (i % 4) * 40,
      'active',
      true,
      true,
      21.0 + (i % 5) * 4,
      5.5 + (i % 3) * 0.5
    )
    ON CONFLICT (code) DO NOTHING;
  END LOOP;
END $$;

-- Ponton E berths (E-40 to E-56)
DO $$
DECLARE
  i INTEGER;
  berth_code TEXT;
  berth_id UUID;
BEGIN
  FOR i IN 40..56 LOOP
    berth_code := 'E-' || LPAD(i::TEXT, 2, '0');
    berth_id := ('e' || LPAD(i::TEXT, 7, '0') || '-0000-0000-0000-000000000001')::UUID;

    INSERT INTO berths (id, pontoon_id, code, width, length, max_draft, daily_rate, status, has_water, has_electricity, max_vessel_length, max_vessel_width)
    VALUES (
      berth_id,
      '55555555-5555-5555-5555-555555555555',
      berth_code,
      3.5 + (i % 3) * 0.5,
      11.0 + (i % 5) * 2,
      2.8 + (i % 3) * 0.4,
      55 + (i % 4) * 10,
      'active',
      (i % 2) = 0,
      true,
      10.5 + (i % 5) * 2,
      3.2 + (i % 3) * 0.4
    )
    ON CONFLICT (code) DO NOTHING;
  END LOOP;
END $$;

-- Ponton F berths (F-01 to F-20)
DO $$
DECLARE
  i INTEGER;
  berth_code TEXT;
  berth_id UUID;
BEGIN
  FOR i IN 1..20 LOOP
    berth_code := 'F-' || LPAD(i::TEXT, 2, '0');
    berth_id := ('f1' || LPAD(i::TEXT, 6, '0') || '-0000-0000-0000-000000000001')::UUID;

    INSERT INTO berths (id, pontoon_id, code, width, length, max_draft, daily_rate, status, has_water, has_electricity, max_vessel_length, max_vessel_width)
    VALUES (
      berth_id,
      '66666666-6666-6666-6666-666666666666',
      berth_code,
      3.5 + (i % 3) * 0.5,
      10.0 + (i % 5) * 2,
      2.5 + (i % 3) * 0.5,
      50 + (i % 4) * 10,
      'active',
      (i % 3) != 0,
      (i % 2) = 0,
      9.5 + (i % 5) * 2,
      3.0 + (i % 3) * 0.5
    )
    ON CONFLICT (code) DO NOTHING;
  END LOOP;
END $$;

-- Verify
SELECT p.code, p.name, p.is_active, COUNT(b.id) as berth_count
FROM pontoons p
LEFT JOIN berths b ON b.pontoon_id = p.id
GROUP BY p.id, p.code, p.name, p.is_active
ORDER BY p.code;
