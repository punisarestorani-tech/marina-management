-- Marina Management System - Additional Contracts Data
-- Uses subqueries to get actual IDs from database
-- Run this in Supabase SQL Editor

-- =====================
-- ADDITIONAL VESSELS - 12 novih plovila
-- =====================
INSERT INTO vessels (registration_number, name, type, length, width, draft, owner_name, owner_contact, flag_country) VALUES
  -- Mali brodovi za Ponton A
  ('MNE-1016-BD', 'Perast', 'sailboat', 7.5, 2.6, 1.2, 'Petar Martinovic', '+382 67 111 222', 'MNE'),
  ('CRO-2017-RI', 'Rijeka Star', 'motorboat', 8.5, 2.9, 1.0, 'Tomislav Babic', '+385 91 222 333', 'CRO'),
  ('MNE-1018-KT', 'Lovćen', 'motorboat', 6.8, 2.4, 0.9, 'Milos Radovic', '+382 68 333 444', 'MNE'),

  -- Srednji brodovi za Ponton B
  ('ITA-3019-GE', 'Genova Mare', 'yacht', 14.0, 4.3, 2.4, 'Giovanni Bianchi', '+39 335 444 555', 'ITA'),
  ('AUT-4020-VI', 'Vienna Dream', 'motorboat', 13.5, 4.0, 2.1, 'Wolfgang Huber', '+43 664 555 666', 'AUT'),
  ('SRB-5021-BG', 'Beograd', 'sailboat', 12.0, 3.8, 2.0, 'Dejan Nikolic', '+381 63 666 777', 'SRB'),

  -- Veliki brodovi za Ponton C
  ('SUI-6022-ZH', 'Swiss Lady', 'yacht', 19.0, 5.3, 3.2, 'Thomas Schneider', '+41 79 777 888', 'SUI'),
  ('NED-7023-AM', 'Amsterdam Queen', 'yacht', 17.5, 5.0, 2.9, 'Jan van der Berg', '+31 6 888 999', 'NED'),
  ('ESP-8024-BC', 'Barcelona Sol', 'catamaran', 16.0, 8.0, 1.9, 'Carlos Martinez', '+34 612 999 000', 'ESP'),

  -- Mega jahte za Ponton D
  ('BEL-9025-AN', 'Diamond Star', 'yacht', 30.0, 7.2, 4.2, 'Philippe Dupont', '+32 475 000 111', 'BEL'),
  ('RUS-0026-SP', 'Neva', 'yacht', 35.0, 7.8, 4.8, 'Sergei Volkov', '+7 921 111 222', 'RUS'),
  ('GBR-1027-LO', 'Thames Glory', 'yacht', 28.0, 6.8, 4.0, 'William Brown', '+44 7800 222 333', 'GBR')
ON CONFLICT (registration_number) DO NOTHING;

-- =====================
-- LEASE CONTRACTS - Using subqueries to get actual IDs
-- =====================

-- A-01: Jadran I (Marko Petrovic) - lokalni ribar
INSERT INTO lease_contracts (berth_id, vessel_id, owner_name, owner_email, owner_phone, start_date, end_date, annual_price, payment_schedule, status, notes)
SELECT b.id, v.id, 'Marko Petrovic', 'marko.petrovic@email.me', '+382 67 123 456', '2025-01-01', '2025-12-31', 15000.00, 'quarterly', 'active', 'Lokalni ribar - povlastica'
FROM berths b, vessels v
WHERE b.code = 'A-01' AND v.registration_number = 'MNE-1001-KT'
ON CONFLICT DO NOTHING;

-- A-03: Perast (Petar Martinovic)
INSERT INTO lease_contracts (berth_id, vessel_id, owner_name, owner_email, owner_phone, start_date, end_date, annual_price, payment_schedule, status, notes)
SELECT b.id, v.id, 'Petar Martinovic', 'petar.martinovic@email.me', '+382 67 111 222', '2025-03-01', '2026-02-28', 16000.00, 'quarterly', 'active', NULL
FROM berths b, vessels v
WHERE b.code = 'A-03' AND v.registration_number = 'MNE-1016-BD'
ON CONFLICT DO NOTHING;

-- A-04: Bella Vita (Marco Rossi) - talijanski vlasnik
INSERT INTO lease_contracts (berth_id, vessel_id, owner_name, owner_email, owner_phone, start_date, end_date, annual_price, payment_schedule, status, notes)
SELECT b.id, v.id, 'Marco Rossi', 'marco.rossi@email.it', '+39 333 456 789', '2025-04-01', '2026-03-31', 22000.00, 'monthly', 'active', 'Premium vez - struja i voda ukljuceni'
FROM berths b, vessels v
WHERE b.code = 'A-04' AND v.registration_number = 'ITA-2234-VE'
ON CONFLICT DO NOTHING;

-- A-05: Morska Vila (Ana Djurovic) - sezonski EXPIRED
INSERT INTO lease_contracts (berth_id, vessel_id, owner_name, owner_email, owner_phone, start_date, end_date, annual_price, payment_schedule, status, notes)
SELECT b.id, v.id, 'Ana Djurovic', 'ana.djurovic@email.me', '+382 68 234 567', '2025-05-01', '2025-10-31', 8000.00, 'upfront', 'expired', 'Sezonski ugovor - ljeto 2025'
FROM berths b, vessels v
WHERE b.code = 'A-05' AND v.registration_number = 'MNE-1002-BD'
ON CONFLICT DO NOTHING;

-- A-06: Rijeka Star (Tomislav Babic)
INSERT INTO lease_contracts (berth_id, vessel_id, owner_name, owner_email, owner_phone, start_date, end_date, annual_price, payment_schedule, status, notes)
SELECT b.id, v.id, 'Tomislav Babic', 'tomislav.babic@email.hr', '+385 91 222 333', '2025-01-01', '2025-12-31', 18500.00, 'quarterly', 'active', NULL
FROM berths b, vessels v
WHERE b.code = 'A-06' AND v.registration_number = 'CRO-2017-RI'
ON CONFLICT DO NOTHING;

-- A-07: Kotor Bay (Stefan Jovanovic)
INSERT INTO lease_contracts (berth_id, vessel_id, owner_name, owner_email, owner_phone, start_date, end_date, annual_price, payment_schedule, status, notes)
SELECT b.id, v.id, 'Stefan Jovanovic', 'stefan.jovanovic@email.me', '+382 68 345 678', '2025-01-01', '2025-12-31', 15500.00, 'quarterly', 'active', 'Stalni klijent od 2020'
FROM berths b, vessels v
WHERE b.code = 'A-07' AND v.registration_number = 'MNE-4015-KT'
ON CONFLICT DO NOTHING;

-- A-10: Lovćen (Milos Radovic)
INSERT INTO lease_contracts (berth_id, vessel_id, owner_name, owner_email, owner_phone, start_date, end_date, annual_price, payment_schedule, status, notes)
SELECT b.id, v.id, 'Milos Radovic', 'milos.radovic@email.me', '+382 68 333 444', '2025-06-01', '2026-05-31', 21000.00, 'monthly', 'active', NULL
FROM berths b, vessels v
WHERE b.code = 'A-10' AND v.registration_number = 'MNE-1018-KT'
ON CONFLICT DO NOTHING;

-- B-01: Boka Queen (Nikola Vuckovic)
INSERT INTO lease_contracts (berth_id, vessel_id, owner_name, owner_email, owner_phone, start_date, end_date, annual_price, payment_schedule, status, notes)
SELECT b.id, v.id, 'Nikola Vuckovic', 'nikola.vuckovic@email.me', '+382 69 567 890', '2025-01-01', '2025-12-31', 26000.00, 'quarterly', 'active', NULL
FROM berths b, vessels v
WHERE b.code = 'B-01' AND v.registration_number = 'MNE-2005-HN'
ON CONFLICT DO NOTHING;

-- B-02: Poseidon (Nikos Papadopoulos)
INSERT INTO lease_contracts (berth_id, vessel_id, owner_name, owner_email, owner_phone, start_date, end_date, annual_price, payment_schedule, status, notes)
SELECT b.id, v.id, 'Nikos Papadopoulos', 'nikos.papadopoulos@email.gr', '+30 697 678 901', '2025-01-01', '2025-12-31', 27500.00, 'quarterly', 'active', 'Grcka zastava'
FROM berths b, vessels v
WHERE b.code = 'B-02' AND v.registration_number = 'GRE-8812-PI'
ON CONFLICT DO NOTHING;

-- B-04: Genova Mare (Giovanni Bianchi)
INSERT INTO lease_contracts (berth_id, vessel_id, owner_name, owner_email, owner_phone, start_date, end_date, annual_price, payment_schedule, status, notes)
SELECT b.id, v.id, 'Giovanni Bianchi', 'giovanni.bianchi@email.it', '+39 335 444 555', '2025-02-01', '2026-01-31', 30000.00, 'quarterly', 'active', 'Premium klijent'
FROM berths b, vessels v
WHERE b.code = 'B-04' AND v.registration_number = 'ITA-3019-GE'
ON CONFLICT DO NOTHING;

-- B-05: Vienna Dream (Wolfgang Huber)
INSERT INTO lease_contracts (berth_id, vessel_id, owner_name, owner_email, owner_phone, start_date, end_date, annual_price, payment_schedule, status, notes)
SELECT b.id, v.id, 'Wolfgang Huber', 'wolfgang.huber@email.at', '+43 664 555 666', '2025-01-01', '2025-12-31', 28000.00, 'annual', 'active', 'Placeno godisnje unaprijed'
FROM berths b, vessels v
WHERE b.code = 'B-05' AND v.registration_number = 'AUT-4020-VI'
ON CONFLICT DO NOTHING;

-- B-06: Triglav (Jure Novak) - EXPIRED
INSERT INTO lease_contracts (berth_id, vessel_id, owner_name, owner_email, owner_phone, start_date, end_date, annual_price, payment_schedule, status, notes)
SELECT b.id, v.id, 'Jure Novak', 'jure.novak@email.si', '+386 41 789 012', '2025-04-01', '2025-09-30', 14000.00, 'upfront', 'expired', 'Sezonski ugovor - zavrsen'
FROM berths b, vessels v
WHERE b.code = 'B-06' AND v.registration_number = 'SLO-3321-KP'
ON CONFLICT DO NOTHING;

-- C-01: Cote dAzur (Pierre Dubois)
INSERT INTO lease_contracts (berth_id, vessel_id, owner_name, owner_email, owner_phone, start_date, end_date, annual_price, payment_schedule, status, notes)
SELECT b.id, v.id, 'Pierre Dubois', 'pierre.dubois@email.fr', '+33 6 901 234', '2025-01-01', '2025-12-31', 42000.00, 'quarterly', 'active', 'Jahta 18m - premium lokacija'
FROM berths b, vessels v
WHERE b.code = 'C-01' AND v.registration_number = 'FRA-7789-MC'
ON CONFLICT DO NOTHING;

-- C-04: Swiss Lady (Thomas Schneider)
INSERT INTO lease_contracts (berth_id, vessel_id, owner_name, owner_email, owner_phone, start_date, end_date, annual_price, payment_schedule, status, notes)
SELECT b.id, v.id, 'Thomas Schneider', 'thomas.schneider@email.ch', '+41 79 777 888', '2025-01-01', '2025-12-31', 52000.00, 'quarterly', 'active', 'VIP klijent - svi servisi ukljuceni'
FROM berths b, vessels v
WHERE b.code = 'C-04' AND v.registration_number = 'SUI-6022-ZH'
ON CONFLICT DO NOTHING;

-- D-02: Diamond Star (Philippe Dupont)
INSERT INTO lease_contracts (berth_id, vessel_id, owner_name, owner_email, owner_phone, start_date, end_date, annual_price, payment_schedule, status, notes)
SELECT b.id, v.id, 'Philippe Dupont', 'philippe.dupont@email.be', '+32 475 000 111', '2025-01-01', '2025-12-31', 85000.00, 'quarterly', 'active', 'Mega jahta 30m'
FROM berths b, vessels v
WHERE b.code = 'D-02' AND v.registration_number = 'BEL-9025-AN'
ON CONFLICT DO NOTHING;

-- =====================
-- PAYMENTS - Using contract lookups by berth code
-- =====================

-- Payments for A-01 (Marko Petrovic) - quarterly 3,750 EUR
INSERT INTO payments (contract_id, amount, due_date, paid_date, status, payment_method, receipt_number, notes)
SELECT lc.id, 3750.00, '2025-01-15', '2025-01-12', 'paid', 'cash', 'REC-2025-A01-Q1', 'Q1 2025'
FROM lease_contracts lc JOIN berths b ON lc.berth_id = b.id WHERE b.code = 'A-01' AND lc.start_date = '2025-01-01';

INSERT INTO payments (contract_id, amount, due_date, paid_date, status, payment_method, receipt_number, notes)
SELECT lc.id, 3750.00, '2025-04-15', '2025-04-14', 'paid', 'cash', 'REC-2025-A01-Q2', 'Q2 2025'
FROM lease_contracts lc JOIN berths b ON lc.berth_id = b.id WHERE b.code = 'A-01' AND lc.start_date = '2025-01-01';

INSERT INTO payments (contract_id, amount, due_date, paid_date, status, payment_method, receipt_number, notes)
SELECT lc.id, 3750.00, '2025-07-15', '2025-07-10', 'paid', 'bank_transfer', 'REC-2025-A01-Q3', 'Q3 2025'
FROM lease_contracts lc JOIN berths b ON lc.berth_id = b.id WHERE b.code = 'A-01' AND lc.start_date = '2025-01-01';

INSERT INTO payments (contract_id, amount, due_date, paid_date, status, payment_method, receipt_number, notes)
SELECT lc.id, 3750.00, '2025-10-15', '2025-10-15', 'paid', 'cash', 'REC-2025-A01-Q4', 'Q4 2025'
FROM lease_contracts lc JOIN berths b ON lc.berth_id = b.id WHERE b.code = 'A-01' AND lc.start_date = '2025-01-01';

-- Payments for A-03 (Petar Martinovic) - quarterly 4,000 EUR
INSERT INTO payments (contract_id, amount, due_date, paid_date, status, payment_method, receipt_number, notes)
SELECT lc.id, 4000.00, '2025-03-15', '2025-03-10', 'paid', 'bank_transfer', 'REC-2025-A03-Q1', 'Q1'
FROM lease_contracts lc JOIN berths b ON lc.berth_id = b.id WHERE b.code = 'A-03';

INSERT INTO payments (contract_id, amount, due_date, paid_date, status, payment_method, receipt_number, notes)
SELECT lc.id, 4000.00, '2025-06-15', '2025-06-12', 'paid', 'bank_transfer', 'REC-2025-A03-Q2', 'Q2'
FROM lease_contracts lc JOIN berths b ON lc.berth_id = b.id WHERE b.code = 'A-03';

INSERT INTO payments (contract_id, amount, due_date, paid_date, status, payment_method, receipt_number, notes)
SELECT lc.id, 4000.00, '2025-09-15', '2025-09-14', 'paid', 'bank_transfer', 'REC-2025-A03-Q3', 'Q3'
FROM lease_contracts lc JOIN berths b ON lc.berth_id = b.id WHERE b.code = 'A-03';

INSERT INTO payments (contract_id, amount, due_date, paid_date, status, payment_method, receipt_number, notes)
SELECT lc.id, 4000.00, '2025-12-15', '2025-12-10', 'paid', 'bank_transfer', 'REC-2025-A03-Q4', 'Q4'
FROM lease_contracts lc JOIN berths b ON lc.berth_id = b.id WHERE b.code = 'A-03';

-- Payments for A-04 (Marco Rossi) - monthly ~1,833 EUR
INSERT INTO payments (contract_id, amount, due_date, paid_date, status, payment_method, receipt_number, notes)
SELECT lc.id, 1833.33, '2025-04-01', '2025-03-28', 'paid', 'card', 'REC-2025-A04-M01', 'April'
FROM lease_contracts lc JOIN berths b ON lc.berth_id = b.id WHERE b.code = 'A-04';

INSERT INTO payments (contract_id, amount, due_date, paid_date, status, payment_method, receipt_number, notes)
SELECT lc.id, 1833.33, '2025-05-01', '2025-04-29', 'paid', 'card', 'REC-2025-A04-M02', 'Maj'
FROM lease_contracts lc JOIN berths b ON lc.berth_id = b.id WHERE b.code = 'A-04';

INSERT INTO payments (contract_id, amount, due_date, paid_date, status, payment_method, receipt_number, notes)
SELECT lc.id, 1833.33, '2025-06-01', '2025-05-30', 'paid', 'card', 'REC-2025-A04-M03', 'Jun'
FROM lease_contracts lc JOIN berths b ON lc.berth_id = b.id WHERE b.code = 'A-04';

INSERT INTO payments (contract_id, amount, due_date, paid_date, status, payment_method, receipt_number, notes)
SELECT lc.id, 1833.33, '2025-07-01', '2025-06-28', 'paid', 'card', 'REC-2025-A04-M04', 'Jul'
FROM lease_contracts lc JOIN berths b ON lc.berth_id = b.id WHERE b.code = 'A-04';

INSERT INTO payments (contract_id, amount, due_date, paid_date, status, payment_method, receipt_number, notes)
SELECT lc.id, 1833.33, '2025-08-01', '2025-07-30', 'paid', 'card', 'REC-2025-A04-M05', 'Avg'
FROM lease_contracts lc JOIN berths b ON lc.berth_id = b.id WHERE b.code = 'A-04';

INSERT INTO payments (contract_id, amount, due_date, paid_date, status, payment_method, receipt_number, notes)
SELECT lc.id, 1833.33, '2025-09-01', '2025-08-29', 'paid', 'card', 'REC-2025-A04-M06', 'Sep'
FROM lease_contracts lc JOIN berths b ON lc.berth_id = b.id WHERE b.code = 'A-04';

INSERT INTO payments (contract_id, amount, due_date, paid_date, status, payment_method, receipt_number, notes)
SELECT lc.id, 1833.33, '2025-10-01', '2025-09-28', 'paid', 'card', 'REC-2025-A04-M07', 'Okt'
FROM lease_contracts lc JOIN berths b ON lc.berth_id = b.id WHERE b.code = 'A-04';

INSERT INTO payments (contract_id, amount, due_date, paid_date, status, payment_method, receipt_number, notes)
SELECT lc.id, 1833.33, '2025-11-01', '2025-10-30', 'paid', 'card', 'REC-2025-A04-M08', 'Nov'
FROM lease_contracts lc JOIN berths b ON lc.berth_id = b.id WHERE b.code = 'A-04';

INSERT INTO payments (contract_id, amount, due_date, paid_date, status, payment_method, receipt_number, notes)
SELECT lc.id, 1833.33, '2025-12-01', '2025-11-28', 'paid', 'card', 'REC-2025-A04-M09', 'Dec'
FROM lease_contracts lc JOIN berths b ON lc.berth_id = b.id WHERE b.code = 'A-04';

INSERT INTO payments (contract_id, amount, due_date, paid_date, status, payment_method, receipt_number, notes)
SELECT lc.id, 1833.33, '2026-01-01', NULL, 'pending', NULL, NULL, 'Januar 2026 - ceka'
FROM lease_contracts lc JOIN berths b ON lc.berth_id = b.id WHERE b.code = 'A-04';

-- Payment for A-05 (Ana Djurovic) - upfront
INSERT INTO payments (contract_id, amount, due_date, paid_date, status, payment_method, receipt_number, notes)
SELECT lc.id, 8000.00, '2025-05-01', '2025-04-25', 'paid', 'bank_transfer', 'REC-2025-A05-FULL', 'Sezona 2025 - placeno unaprijed'
FROM lease_contracts lc JOIN berths b ON lc.berth_id = b.id WHERE b.code = 'A-05';

-- Payments for A-06 (Tomislav Babic) - quarterly 4,625 EUR
INSERT INTO payments (contract_id, amount, due_date, paid_date, status, payment_method, receipt_number, notes)
SELECT lc.id, 4625.00, '2025-01-15', '2025-01-10', 'paid', 'bank_transfer', 'REC-2025-A06-Q1', 'Q1'
FROM lease_contracts lc JOIN berths b ON lc.berth_id = b.id WHERE b.code = 'A-06';

INSERT INTO payments (contract_id, amount, due_date, paid_date, status, payment_method, receipt_number, notes)
SELECT lc.id, 4625.00, '2025-04-15', '2025-04-12', 'paid', 'bank_transfer', 'REC-2025-A06-Q2', 'Q2'
FROM lease_contracts lc JOIN berths b ON lc.berth_id = b.id WHERE b.code = 'A-06';

INSERT INTO payments (contract_id, amount, due_date, paid_date, status, payment_method, receipt_number, notes)
SELECT lc.id, 4625.00, '2025-07-15', '2025-07-14', 'paid', 'bank_transfer', 'REC-2025-A06-Q3', 'Q3'
FROM lease_contracts lc JOIN berths b ON lc.berth_id = b.id WHERE b.code = 'A-06';

INSERT INTO payments (contract_id, amount, due_date, paid_date, status, payment_method, receipt_number, notes)
SELECT lc.id, 4625.00, '2025-10-15', '2025-10-20', 'paid', 'bank_transfer', 'REC-2025-A06-Q4', 'Q4 - placeno sa zakasnjenjem'
FROM lease_contracts lc JOIN berths b ON lc.berth_id = b.id WHERE b.code = 'A-06';

-- Payments for A-07 (Stefan Jovanovic) - quarterly 3,875 EUR
INSERT INTO payments (contract_id, amount, due_date, paid_date, status, payment_method, receipt_number, notes)
SELECT lc.id, 3875.00, '2025-01-15', '2025-01-08', 'paid', 'cash', 'REC-2025-A07-Q1', 'Q1'
FROM lease_contracts lc JOIN berths b ON lc.berth_id = b.id WHERE b.code = 'A-07';

INSERT INTO payments (contract_id, amount, due_date, paid_date, status, payment_method, receipt_number, notes)
SELECT lc.id, 3875.00, '2025-04-15', '2025-04-10', 'paid', 'cash', 'REC-2025-A07-Q2', 'Q2'
FROM lease_contracts lc JOIN berths b ON lc.berth_id = b.id WHERE b.code = 'A-07';

INSERT INTO payments (contract_id, amount, due_date, paid_date, status, payment_method, receipt_number, notes)
SELECT lc.id, 3875.00, '2025-07-15', '2025-07-12', 'paid', 'cash', 'REC-2025-A07-Q3', 'Q3'
FROM lease_contracts lc JOIN berths b ON lc.berth_id = b.id WHERE b.code = 'A-07';

INSERT INTO payments (contract_id, amount, due_date, paid_date, status, payment_method, receipt_number, notes)
SELECT lc.id, 3875.00, '2025-10-15', '2025-10-10', 'paid', 'cash', 'REC-2025-A07-Q4', 'Q4'
FROM lease_contracts lc JOIN berths b ON lc.berth_id = b.id WHERE b.code = 'A-07';

-- Payments for A-10 (Milos Radovic) - monthly 1,750 EUR
INSERT INTO payments (contract_id, amount, due_date, paid_date, status, payment_method, receipt_number, notes)
SELECT lc.id, 1750.00, '2025-06-01', '2025-05-28', 'paid', 'bank_transfer', 'REC-2025-A10-M01', 'Jun'
FROM lease_contracts lc JOIN berths b ON lc.berth_id = b.id WHERE b.code = 'A-10';

INSERT INTO payments (contract_id, amount, due_date, paid_date, status, payment_method, receipt_number, notes)
SELECT lc.id, 1750.00, '2025-07-01', '2025-06-29', 'paid', 'bank_transfer', 'REC-2025-A10-M02', 'Jul'
FROM lease_contracts lc JOIN berths b ON lc.berth_id = b.id WHERE b.code = 'A-10';

INSERT INTO payments (contract_id, amount, due_date, paid_date, status, payment_method, receipt_number, notes)
SELECT lc.id, 1750.00, '2025-08-01', '2025-07-30', 'paid', 'bank_transfer', 'REC-2025-A10-M03', 'Avg'
FROM lease_contracts lc JOIN berths b ON lc.berth_id = b.id WHERE b.code = 'A-10';

INSERT INTO payments (contract_id, amount, due_date, paid_date, status, payment_method, receipt_number, notes)
SELECT lc.id, 1750.00, '2025-09-01', '2025-08-28', 'paid', 'bank_transfer', 'REC-2025-A10-M04', 'Sep'
FROM lease_contracts lc JOIN berths b ON lc.berth_id = b.id WHERE b.code = 'A-10';

INSERT INTO payments (contract_id, amount, due_date, paid_date, status, payment_method, receipt_number, notes)
SELECT lc.id, 1750.00, '2025-10-01', '2025-09-28', 'paid', 'bank_transfer', 'REC-2025-A10-M05', 'Okt'
FROM lease_contracts lc JOIN berths b ON lc.berth_id = b.id WHERE b.code = 'A-10';

INSERT INTO payments (contract_id, amount, due_date, paid_date, status, payment_method, receipt_number, notes)
SELECT lc.id, 1750.00, '2025-11-01', '2025-10-30', 'paid', 'bank_transfer', 'REC-2025-A10-M06', 'Nov'
FROM lease_contracts lc JOIN berths b ON lc.berth_id = b.id WHERE b.code = 'A-10';

INSERT INTO payments (contract_id, amount, due_date, paid_date, status, payment_method, receipt_number, notes)
SELECT lc.id, 1750.00, '2025-12-01', '2025-11-28', 'paid', 'bank_transfer', 'REC-2025-A10-M07', 'Dec'
FROM lease_contracts lc JOIN berths b ON lc.berth_id = b.id WHERE b.code = 'A-10';

INSERT INTO payments (contract_id, amount, due_date, paid_date, status, payment_method, receipt_number, notes)
SELECT lc.id, 1750.00, '2026-01-01', NULL, 'overdue', NULL, NULL, 'Januar 2026 - KASNI'
FROM lease_contracts lc JOIN berths b ON lc.berth_id = b.id WHERE b.code = 'A-10';

-- Payments for B-01 (Nikola Vuckovic) - quarterly 6,500 EUR
INSERT INTO payments (contract_id, amount, due_date, paid_date, status, payment_method, receipt_number, notes)
SELECT lc.id, 6500.00, '2025-01-15', '2025-01-12', 'paid', 'bank_transfer', 'REC-2025-B01-Q1', 'Q1'
FROM lease_contracts lc JOIN berths b ON lc.berth_id = b.id WHERE b.code = 'B-01';

INSERT INTO payments (contract_id, amount, due_date, paid_date, status, payment_method, receipt_number, notes)
SELECT lc.id, 6500.00, '2025-04-15', '2025-04-10', 'paid', 'bank_transfer', 'REC-2025-B01-Q2', 'Q2'
FROM lease_contracts lc JOIN berths b ON lc.berth_id = b.id WHERE b.code = 'B-01';

INSERT INTO payments (contract_id, amount, due_date, paid_date, status, payment_method, receipt_number, notes)
SELECT lc.id, 6500.00, '2025-07-15', '2025-07-15', 'paid', 'bank_transfer', 'REC-2025-B01-Q3', 'Q3'
FROM lease_contracts lc JOIN berths b ON lc.berth_id = b.id WHERE b.code = 'B-01';

INSERT INTO payments (contract_id, amount, due_date, paid_date, status, payment_method, receipt_number, notes)
SELECT lc.id, 6500.00, '2025-10-15', '2025-10-14', 'paid', 'bank_transfer', 'REC-2025-B01-Q4', 'Q4'
FROM lease_contracts lc JOIN berths b ON lc.berth_id = b.id WHERE b.code = 'B-01';

-- Payments for B-02 (Nikos Papadopoulos) - quarterly 6,875 EUR
INSERT INTO payments (contract_id, amount, due_date, paid_date, status, payment_method, receipt_number, notes)
SELECT lc.id, 6875.00, '2025-01-15', '2025-01-10', 'paid', 'bank_transfer', 'REC-2025-B02-Q1', 'Q1'
FROM lease_contracts lc JOIN berths b ON lc.berth_id = b.id WHERE b.code = 'B-02';

INSERT INTO payments (contract_id, amount, due_date, paid_date, status, payment_method, receipt_number, notes)
SELECT lc.id, 6875.00, '2025-04-15', '2025-04-08', 'paid', 'bank_transfer', 'REC-2025-B02-Q2', 'Q2'
FROM lease_contracts lc JOIN berths b ON lc.berth_id = b.id WHERE b.code = 'B-02';

INSERT INTO payments (contract_id, amount, due_date, paid_date, status, payment_method, receipt_number, notes)
SELECT lc.id, 6875.00, '2025-07-15', '2025-07-12', 'paid', 'bank_transfer', 'REC-2025-B02-Q3', 'Q3'
FROM lease_contracts lc JOIN berths b ON lc.berth_id = b.id WHERE b.code = 'B-02';

INSERT INTO payments (contract_id, amount, due_date, paid_date, status, payment_method, receipt_number, notes)
SELECT lc.id, 6875.00, '2025-10-15', '2025-10-10', 'paid', 'bank_transfer', 'REC-2025-B02-Q4', 'Q4'
FROM lease_contracts lc JOIN berths b ON lc.berth_id = b.id WHERE b.code = 'B-02';

-- Payments for B-04 (Giovanni Bianchi) - quarterly 7,500 EUR
INSERT INTO payments (contract_id, amount, due_date, paid_date, status, payment_method, receipt_number, notes)
SELECT lc.id, 7500.00, '2025-02-15', '2025-02-10', 'paid', 'bank_transfer', 'REC-2025-B04-Q1', 'Q1'
FROM lease_contracts lc JOIN berths b ON lc.berth_id = b.id WHERE b.code = 'B-04';

INSERT INTO payments (contract_id, amount, due_date, paid_date, status, payment_method, receipt_number, notes)
SELECT lc.id, 7500.00, '2025-05-15', '2025-05-12', 'paid', 'bank_transfer', 'REC-2025-B04-Q2', 'Q2'
FROM lease_contracts lc JOIN berths b ON lc.berth_id = b.id WHERE b.code = 'B-04';

INSERT INTO payments (contract_id, amount, due_date, paid_date, status, payment_method, receipt_number, notes)
SELECT lc.id, 7500.00, '2025-08-15', '2025-08-10', 'paid', 'bank_transfer', 'REC-2025-B04-Q3', 'Q3'
FROM lease_contracts lc JOIN berths b ON lc.berth_id = b.id WHERE b.code = 'B-04';

INSERT INTO payments (contract_id, amount, due_date, paid_date, status, payment_method, receipt_number, notes)
SELECT lc.id, 7500.00, '2025-11-15', '2025-11-12', 'paid', 'bank_transfer', 'REC-2025-B04-Q4', 'Q4'
FROM lease_contracts lc JOIN berths b ON lc.berth_id = b.id WHERE b.code = 'B-04';

-- Payment for B-05 (Wolfgang Huber) - annual upfront
INSERT INTO payments (contract_id, amount, due_date, paid_date, status, payment_method, receipt_number, notes)
SELECT lc.id, 28000.00, '2025-01-15', '2025-01-05', 'paid', 'bank_transfer', 'REC-2025-B05-FULL', '2025 - placeno unaprijed'
FROM lease_contracts lc JOIN berths b ON lc.berth_id = b.id WHERE b.code = 'B-05';

-- Payment for B-06 (Jure Novak) - seasonal upfront
INSERT INTO payments (contract_id, amount, due_date, paid_date, status, payment_method, receipt_number, notes)
SELECT lc.id, 14000.00, '2025-04-01', '2025-03-25', 'paid', 'bank_transfer', 'REC-2025-B06-FULL', 'Sezona 2025 - ugovor zavrsen'
FROM lease_contracts lc JOIN berths b ON lc.berth_id = b.id WHERE b.code = 'B-06';

-- Payments for C-01 (Pierre Dubois) - quarterly 10,500 EUR
INSERT INTO payments (contract_id, amount, due_date, paid_date, status, payment_method, receipt_number, notes)
SELECT lc.id, 10500.00, '2025-01-15', '2025-01-08', 'paid', 'bank_transfer', 'REC-2025-C01-Q1', 'Q1'
FROM lease_contracts lc JOIN berths b ON lc.berth_id = b.id WHERE b.code = 'C-01';

INSERT INTO payments (contract_id, amount, due_date, paid_date, status, payment_method, receipt_number, notes)
SELECT lc.id, 10500.00, '2025-04-15', '2025-04-10', 'paid', 'bank_transfer', 'REC-2025-C01-Q2', 'Q2'
FROM lease_contracts lc JOIN berths b ON lc.berth_id = b.id WHERE b.code = 'C-01';

INSERT INTO payments (contract_id, amount, due_date, paid_date, status, payment_method, receipt_number, notes)
SELECT lc.id, 10500.00, '2025-07-15', '2025-07-12', 'paid', 'bank_transfer', 'REC-2025-C01-Q3', 'Q3'
FROM lease_contracts lc JOIN berths b ON lc.berth_id = b.id WHERE b.code = 'C-01';

INSERT INTO payments (contract_id, amount, due_date, paid_date, status, payment_method, receipt_number, notes)
SELECT lc.id, 10500.00, '2025-10-15', NULL, 'overdue', NULL, NULL, 'Q4 - KASNI SA PLACANJEM'
FROM lease_contracts lc JOIN berths b ON lc.berth_id = b.id WHERE b.code = 'C-01';

-- Payments for C-04 (Thomas Schneider) - quarterly 13,000 EUR
INSERT INTO payments (contract_id, amount, due_date, paid_date, status, payment_method, receipt_number, notes)
SELECT lc.id, 13000.00, '2025-01-15', '2025-01-05', 'paid', 'bank_transfer', 'REC-2025-C04-Q1', 'Q1'
FROM lease_contracts lc JOIN berths b ON lc.berth_id = b.id WHERE b.code = 'C-04';

INSERT INTO payments (contract_id, amount, due_date, paid_date, status, payment_method, receipt_number, notes)
SELECT lc.id, 13000.00, '2025-04-15', '2025-04-05', 'paid', 'bank_transfer', 'REC-2025-C04-Q2', 'Q2'
FROM lease_contracts lc JOIN berths b ON lc.berth_id = b.id WHERE b.code = 'C-04';

INSERT INTO payments (contract_id, amount, due_date, paid_date, status, payment_method, receipt_number, notes)
SELECT lc.id, 13000.00, '2025-07-15', '2025-07-05', 'paid', 'bank_transfer', 'REC-2025-C04-Q3', 'Q3'
FROM lease_contracts lc JOIN berths b ON lc.berth_id = b.id WHERE b.code = 'C-04';

INSERT INTO payments (contract_id, amount, due_date, paid_date, status, payment_method, receipt_number, notes)
SELECT lc.id, 13000.00, '2025-10-15', '2025-10-05', 'paid', 'bank_transfer', 'REC-2025-C04-Q4', 'Q4'
FROM lease_contracts lc JOIN berths b ON lc.berth_id = b.id WHERE b.code = 'C-04';

-- Payments for D-02 (Philippe Dupont) - quarterly 21,250 EUR
INSERT INTO payments (contract_id, amount, due_date, paid_date, status, payment_method, receipt_number, notes)
SELECT lc.id, 21250.00, '2025-01-15', '2025-01-10', 'paid', 'bank_transfer', 'REC-2025-D02-Q1', 'Q1'
FROM lease_contracts lc JOIN berths b ON lc.berth_id = b.id WHERE b.code = 'D-02';

INSERT INTO payments (contract_id, amount, due_date, paid_date, status, payment_method, receipt_number, notes)
SELECT lc.id, 21250.00, '2025-04-15', '2025-04-08', 'paid', 'bank_transfer', 'REC-2025-D02-Q2', 'Q2'
FROM lease_contracts lc JOIN berths b ON lc.berth_id = b.id WHERE b.code = 'D-02';

INSERT INTO payments (contract_id, amount, due_date, paid_date, status, payment_method, receipt_number, notes)
SELECT lc.id, 21250.00, '2025-07-15', '2025-07-10', 'paid', 'bank_transfer', 'REC-2025-D02-Q3', 'Q3'
FROM lease_contracts lc JOIN berths b ON lc.berth_id = b.id WHERE b.code = 'D-02';

INSERT INTO payments (contract_id, amount, due_date, paid_date, status, payment_method, receipt_number, notes)
SELECT lc.id, 21250.00, '2025-10-15', '2025-10-12', 'paid', 'bank_transfer', 'REC-2025-D02-Q4', 'Q4'
FROM lease_contracts lc JOIN berths b ON lc.berth_id = b.id WHERE b.code = 'D-02';

-- =====================
-- SUMMARY - Statistika
-- =====================
SELECT '=== STATISTIKA UGOVORA ===' as info;
SELECT 'Ukupno ugovora: ' || COUNT(*) as info FROM lease_contracts;
SELECT 'Aktivnih ugovora: ' || COUNT(*) as info FROM lease_contracts WHERE status = 'active';
SELECT 'Isteklih ugovora: ' || COUNT(*) as info FROM lease_contracts WHERE status = 'expired';
SELECT 'Ukupna godisnja vrijednost aktivnih: ' || COALESCE(SUM(annual_price), 0) || ' EUR' as info FROM lease_contracts WHERE status = 'active';
SELECT 'Ukupno placanja: ' || COUNT(*) as info FROM payments;
SELECT 'Placenih: ' || COUNT(*) as info FROM payments WHERE status = 'paid';
SELECT 'Na cekanju: ' || COUNT(*) as info FROM payments WHERE status = 'pending';
SELECT 'Kasni: ' || COUNT(*) as info FROM payments WHERE status = 'overdue';
