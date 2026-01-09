# Marina Management - Session Log (09.01.2026)

## Pregled izmjena u ovoj sesiji

---

### 1. Fix: Reset stanja inspekcijskog panela pri promjeni veza
**Commit:** `ca5535a`

**Problem:** Kada se na mapi klikne na zauzeti vez, prikaže se slika broda. Kada se zatim klikne na slobodan vez pored, i dalje se prikazuje slika prethodnog broda.

**Rješenje:** Dodan novi `useEffect` u `BerthInspectionPopup.tsx` koji resetuje sve stanje (reservation, isLoadingReservation, status, notes, itd.) kada se promijeni `marker.code`.

**Fajl:** `src/components/map/BerthInspectionPopup.tsx`

---

### 2. Prikaz informacija o plovilu u edit dialog za vezove
**Commit:** `accfcf4`

**Izmjena:** U popup prozoru za uređivanje veza (stranica Vezovi) sada se prikazuju detalji o plovilu koje je trenutno na vezu:
- Slika plovila (ako postoji)
- Ime broda i registracija
- Ime gosta
- Dužina plovila
- Period rezervacije

**Fajl:** `src/app/(dashboard)/berths/page.tsx`

---

### 3. Lightbox funkcionalnost za sve slike
**Commit:** `a9c3352`

**Nova komponenta:** `src/components/ui/image-lightbox.tsx`

**Funkcionalnost:**
- Klik na bilo koju sliku otvara je u punoj veličini
- Hover efekat sa zoom ikonom
- Zatvaranje klikom van slike ili na X dugme

**Ažurirane lokacije:**
- `BerthInspectionPopup.tsx` - slika broda u inspekcijskom panelu
- `berths/page.tsx` - slika plovila u edit dialogu
- `prijava-problema/page.tsx` - slike prijavljenih problema
- `photo-upload.tsx` - preview uploadovane slike

---

### 4. Slika plovila u edit dialog na stranici Plovila
**Commit:** `ba7fb4f`

**Izmjena:** U popup prozoru za uređivanje plovila sada se prikazuje:
- Slika plovila (ako postoji) sa lightbox funkcijom
- Mogućnost uploada nove slike

**Fajl:** `src/app/(dashboard)/vessels/page.tsx`

---

### 5. Dugme "Izmjeni sliku" u edit dialogu za plovila
**Commit:** `e68f197`

**Izmjena:** Dodana dva dugmeta:
- "Izmjeni sliku" - otvara upload komponentu za novu sliku
- "Ukloni sliku" - briše trenutnu sliku (crveni tekst)
- "Odustani" - vraća se na prikaz slike bez izmjene

**Fajl:** `src/app/(dashboard)/vessels/page.tsx`

---

### 6. Potpuna implementacija stranice Plaćanja
**Commit:** `665fb97`

**Kompletno prepravljena stranica** sa pravim podacima iz baze umjesto mock podataka.

**Funkcionalnosti:**
- Summary kartice: ukupno naplaćeno, djelimično plaćeno, neplaćeno
- Tabela sa svim rezervacijama i statusom plaćanja
- Dialog za evidentiranje uplate (iznos, način plaćanja, referenca, napomena)
- Dialog za historiju uplata sa listom svih uplata
- Automatsko ažuriranje statusa preko database triggera
- Pretraga i filtriranje po statusu plaćanja

**Fajl:** `src/app/(dashboard)/payments/page.tsx`

**Baza podataka:**
- Koristi `berth_bookings` tabelu za rezervacije
- Koristi `booking_payments` tabelu za evidenciju uplata
- Trigger `update_booking_payment_total` automatski ažurira `amount_paid` i `payment_status`

---

### 7. Prikaz perioda rezervacije u historiji uplata
**Commit:** `f994888`

**Izmjena:** U popup prozoru za historiju uplata sada se prikazuje:
- Period rezervacije (check-in do check-out)
- Ukupan broj dana i cijena po danu
- Za svaku uplatu: koji period (datumi) ta uplata pokriva
- Broj dana koje svaka uplata pokriva

**Fajl:** `src/app/(dashboard)/payments/page.tsx`

---

### 8. SQL migracija za demo podatke o uplatama
**Commit:** `7d2b460`

**Nova migracija:** `supabase/migrations/013_booking_payments_data.sql`

**Funkcionalnost:**
- Dinamički kreira uplate za sve rezervacije koje imaju `amount_paid > 0`
- Realistični načini plaćanja (gotovina, kartica, bank transfer)
- Realistični referentni brojevi (GOT-2601-XXXX, POS-2601-XXXX, BNK-2601-XXXX)
- Veći iznosi (>500€) imaju 40% šanse za podjelu u dvije rate

**Pokretanje:** Kopiraj sadržaj fajla i pokreni u Supabase SQL Editor

---

## TODO za nastavak

- [ ] Pokrenuti SQL migraciju `013_booking_payments_data.sql` u Supabase
- [ ] Testirati stranicu Plaćanja sa pravim podacima
- [ ] Pregledati ostale stranice (Rezervacije, Ugovori, Prekršaji, Izvještaji)

---

## Git commits (kronološki)

```
ca5535a Fix: Reset stanja inspekcijskog panela pri promjeni veza
accfcf4 Dodano prikazivanje informacija o plovilu u edit dialog za vezove
a9c3352 Dodana lightbox funkcionalnost za sve slike u aplikaciji
ba7fb4f Dodana slika plovila u edit dialog na stranici Plovila
e68f197 Dodano dugme 'Izmjeni sliku' u edit dialog za plovila
665fb97 Potpuna implementacija stranice Plaćanja
f994888 Dodano prikazivanje perioda rezervacije i pokrivenih dana u historiji uplata
7d2b460 Dodana SQL migracija za demo podatke o uplatama
```

---

## Ključni fajlovi izmijenjeni u ovoj sesiji

```
src/components/map/BerthInspectionPopup.tsx
src/components/ui/image-lightbox.tsx (NOVO)
src/components/ui/photo-upload.tsx
src/app/(dashboard)/berths/page.tsx
src/app/(dashboard)/vessels/page.tsx
src/app/(dashboard)/payments/page.tsx
src/app/(dashboard)/prijava-problema/page.tsx
supabase/migrations/013_booking_payments_data.sql (NOVO)
```
