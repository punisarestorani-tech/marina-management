-- Evidencija uplata za rezervacije
-- Realistični podaci za prezentaciju
-- Run this in Supabase SQL Editor

-- Prvo obrisi postojece uplate (ako ih ima) da izbjegnemo duplikate
DELETE FROM booking_payments;

-- Unesi uplate za sve rezervacije koje imaju uplacen iznos
DO $$
DECLARE
  v_booking RECORD;
  v_payment_methods TEXT[] := ARRAY['cash', 'card', 'bank_transfer'];
  v_method TEXT;
  v_ref_prefix TEXT;
  v_payment_date DATE;
  v_remaining DECIMAL;
  v_first_payment DECIMAL;
  v_notes_arr TEXT[] := ARRAY[
    'Placeno prilikom check-in',
    'Uplata gotovinom',
    'Uplata karticom',
    'Bankovni transfer',
    'Avansna uplata',
    'Kompletna uplata',
    'Depozit za rezervaciju',
    'Rata placanja',
    'Online uplata'
  ];
BEGIN
  -- Pronadji sve rezervacije koje imaju uplacen iznos
  FOR v_booking IN
    SELECT id, berth_code, amount_paid, total_amount, check_in_date, guest_name, payment_status
    FROM berth_bookings
    WHERE amount_paid > 0
    ORDER BY check_in_date, berth_code
  LOOP
    -- Odaberi nasumicni nacin placanja
    v_method := v_payment_methods[1 + floor(random() * 3)::INTEGER];

    -- Postavi datum placanja (0-5 dana prije check-in)
    v_payment_date := v_booking.check_in_date - (floor(random() * 5))::INTEGER;

    -- Ako je datum u buducnosti, stavi danasnji
    IF v_payment_date > CURRENT_DATE THEN
      v_payment_date := CURRENT_DATE - (floor(random() * 3))::INTEGER;
    END IF;

    -- Postavi prefix za referencu
    CASE v_method
      WHEN 'cash' THEN v_ref_prefix := 'GOT-';
      WHEN 'card' THEN v_ref_prefix := 'POS-';
      ELSE v_ref_prefix := 'BNK-';
    END CASE;

    -- Ako je kompletno placeno, mozda podijeli na vise uplata
    IF v_booking.payment_status = 'paid' AND v_booking.amount_paid > 500 AND random() < 0.4 THEN
      -- 40% sanse za dvije uplate kod vecih iznosa
      v_first_payment := ROUND((v_booking.amount_paid * (0.4 + random() * 0.3))::DECIMAL, 2);
      v_remaining := v_booking.amount_paid - v_first_payment;

      -- Prva uplata
      INSERT INTO booking_payments (booking_id, amount, payment_date, payment_method, reference_number, notes)
      VALUES (
        v_booking.id,
        v_first_payment,
        v_payment_date - 3,
        v_method,
        v_ref_prefix || TO_CHAR(v_payment_date, 'YYMM') || '-' || LPAD(floor(random() * 9999)::TEXT, 4, '0'),
        'Prva rata - ' || v_booking.berth_code
      );

      -- Druga uplata (moze biti drugi nacin placanja)
      v_method := v_payment_methods[1 + floor(random() * 3)::INTEGER];
      CASE v_method
        WHEN 'cash' THEN v_ref_prefix := 'GOT-';
        WHEN 'card' THEN v_ref_prefix := 'POS-';
        ELSE v_ref_prefix := 'BNK-';
      END CASE;

      INSERT INTO booking_payments (booking_id, amount, payment_date, payment_method, reference_number, notes)
      VALUES (
        v_booking.id,
        v_remaining,
        v_payment_date,
        v_method,
        v_ref_prefix || TO_CHAR(v_payment_date, 'YYMM') || '-' || LPAD(floor(random() * 9999)::TEXT, 4, '0'),
        'Ostatak iznosa - ' || v_booking.berth_code
      );
    ELSE
      -- Jedna uplata
      INSERT INTO booking_payments (booking_id, amount, payment_date, payment_method, reference_number, notes)
      VALUES (
        v_booking.id,
        v_booking.amount_paid,
        v_payment_date,
        v_method,
        v_ref_prefix || TO_CHAR(v_payment_date, 'YYMM') || '-' || LPAD(floor(random() * 9999)::TEXT, 4, '0'),
        CASE
          WHEN v_booking.payment_status = 'paid' THEN 'Kompletna uplata'
          WHEN v_booking.payment_status = 'partial' THEN 'Djelimicna uplata - depozit'
          ELSE 'Uplata'
        END || ' - ' || v_booking.berth_code
      );
    END IF;

  END LOOP;

  RAISE NOTICE 'Uplate uspjesno unesene!';
END $$;

-- Prikazi unesene uplate
SELECT
  bp.payment_date as "Datum",
  bb.berth_code as "Vez",
  bb.guest_name as "Gost",
  bp.amount as "Iznos",
  CASE bp.payment_method
    WHEN 'cash' THEN 'Gotovina'
    WHEN 'card' THEN 'Kartica'
    WHEN 'bank_transfer' THEN 'Bank. prijenos'
    ELSE bp.payment_method
  END as "Nacin",
  bp.reference_number as "Referenca",
  bp.notes as "Napomena"
FROM booking_payments bp
JOIN berth_bookings bb ON bp.booking_id = bb.id
ORDER BY bp.payment_date DESC, bb.berth_code
LIMIT 50;
