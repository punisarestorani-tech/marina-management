-- Marina Management System - Test Users
-- =============================================
--
-- NAČIN KREIRANJA KORISNIKA:
--
-- 1. Idite na Supabase Dashboard > Authentication > Users
-- 2. Kliknite "Add user" > "Create new user"
-- 3. Unesite email i password za svakog korisnika
-- 4. Kliknite "Create user"
-- 5. Nakon kreiranja, pokrenite UPDATE ispod za svaki profil
--
-- =============================================
-- TEST KORISNICI - KREDENCIJALI
-- =============================================
--
-- +------------+------------------------+-------------+-------------+
-- | ULOGA      | EMAIL                  | PASSWORD    | IME         |
-- +------------+------------------------+-------------+-------------+
-- | Admin      | admin@marina.hr        | Admin123!   | Admin User  |
-- | Manager    | manager@marina.hr      | Manager123! | Manager     |
-- | Operator   | operator@marina.hr     | Operator123!| Operator    |
-- | Inspector  | inspector@marina.hr    | Inspector123!| Inspector  |
-- +------------+------------------------+-------------+-------------+
--
-- =============================================

-- Nakon kreiranja korisnika u Supabase Auth,
-- pokrenite ove UPDATE komande da postavite ispravne uloge:

-- Pronađi ID-ove korisnika
-- SELECT id, email FROM auth.users;

-- Ažuriraj uloge u profiles tabeli
-- (Zamijenite UUID-ove stvarnim ID-ovima iz auth.users)

-- UPDATE profiles SET role = 'admin', full_name = 'Admin User'
-- WHERE id = (SELECT id FROM auth.users WHERE email = 'admin@marina.hr');

-- UPDATE profiles SET role = 'manager', full_name = 'Manager Marina'
-- WHERE id = (SELECT id FROM auth.users WHERE email = 'manager@marina.hr');

-- UPDATE profiles SET role = 'operator', full_name = 'Operator Naplata'
-- WHERE id = (SELECT id FROM auth.users WHERE email = 'operator@marina.hr');

-- UPDATE profiles SET role = 'inspector', full_name = 'Inspektor Teren'
-- WHERE id = (SELECT id FROM auth.users WHERE email = 'inspector@marina.hr');


-- =============================================
-- ALTERNATIVA: Direktno kreiranje (ako nemate RLS probleme)
-- =============================================
-- Ako imate problema sa auth.users, možete koristiti Supabase Auth API
-- ili kreirati korisnike putem Supabase Dashboard-a

-- Provjera postojećih korisnika:
-- SELECT p.id, p.full_name, p.role, u.email
-- FROM profiles p
-- JOIN auth.users u ON p.id = u.id;
