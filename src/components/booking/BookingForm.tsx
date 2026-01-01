'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Loader2, Save, X, Calculator } from 'lucide-react';
import {
  Booking,
  BookingFormData,
  BookingStatus,
  PaymentStatus,
  VesselType,
  BookingSource,
  BOOKING_STATUS_COLORS,
  PAYMENT_STATUS_COLORS,
  calculateBookingTotal,
  getNightsBetween,
  formatCurrency,
} from '@/types/booking.types';

interface BookingFormProps {
  berthId: string;
  berthCode: string;
  defaultCheckIn?: string;
  defaultCheckOut?: string;
  defaultPricePerDay?: number;
  existingBooking?: Booking;
  onSave: (data: BookingFormData) => Promise<void>;
  onCancel: () => void;
  onStatusChange?: (status: BookingStatus) => Promise<void>;
  onPaymentRecord?: (amount: number) => Promise<void>;
}

export function BookingForm({
  berthId,
  berthCode,
  defaultCheckIn,
  defaultCheckOut,
  defaultPricePerDay = 50,
  existingBooking,
  onSave,
  onCancel,
  onStatusChange,
  onPaymentRecord,
}: BookingFormProps) {
  const isEditing = !!existingBooking;

  // Form state
  const [checkInDate, setCheckInDate] = useState(
    existingBooking?.checkInDate || defaultCheckIn || ''
  );
  const [checkOutDate, setCheckOutDate] = useState(
    existingBooking?.checkOutDate || defaultCheckOut || ''
  );
  const [guestName, setGuestName] = useState(existingBooking?.guestName || '');
  const [guestEmail, setGuestEmail] = useState(existingBooking?.guestEmail || '');
  const [guestPhone, setGuestPhone] = useState(existingBooking?.guestPhone || '');
  const [guestCountry, setGuestCountry] = useState(existingBooking?.guestCountry || '');
  const [vesselName, setVesselName] = useState(existingBooking?.vesselName || '');
  const [vesselRegistration, setVesselRegistration] = useState(
    existingBooking?.vesselRegistration || ''
  );
  const [vesselType, setVesselType] = useState<VesselType | ''>(
    existingBooking?.vesselType || ''
  );
  const [vesselLength, setVesselLength] = useState<string>(
    existingBooking?.vesselLength?.toString() || ''
  );
  const [pricePerDay, setPricePerDay] = useState<string>(
    existingBooking?.pricePerDay?.toString() || defaultPricePerDay.toString()
  );
  const [discountPercent, setDiscountPercent] = useState<string>(
    existingBooking?.discountPercent?.toString() || '0'
  );
  const [taxPercent, setTaxPercent] = useState<string>(
    existingBooking?.taxPercent?.toString() || '13'
  );
  const [notes, setNotes] = useState(existingBooking?.notes || '');
  const [source, setSource] = useState<BookingSource>(existingBooking?.source || 'direct');

  // Payment state
  const [paymentAmount, setPaymentAmount] = useState('');

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Calculate totals
  const nights = checkInDate && checkOutDate ? getNightsBetween(checkInDate, checkOutDate) : 0;
  const totals = calculateBookingTotal(
    parseFloat(pricePerDay) || 0,
    nights,
    parseFloat(discountPercent) || 0,
    parseFloat(taxPercent) || 0
  );

  // Handle form submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!checkInDate || !checkOutDate) {
      setError('Datum dolaska i odlaska su obavezni');
      return;
    }

    if (!guestName.trim()) {
      setError('Ime gosta je obavezno');
      return;
    }

    if (nights <= 0) {
      setError('Datum odlaska mora biti nakon datuma dolaska');
      return;
    }

    const formData: BookingFormData = {
      berthId,
      berthCode,
      checkInDate,
      checkOutDate,
      guestName: guestName.trim(),
      guestEmail: guestEmail.trim() || undefined,
      guestPhone: guestPhone.trim() || undefined,
      guestCountry: guestCountry.trim() || undefined,
      vesselName: vesselName.trim() || undefined,
      vesselRegistration: vesselRegistration.trim() || undefined,
      vesselType: vesselType || undefined,
      vesselLength: vesselLength ? parseFloat(vesselLength) : undefined,
      pricePerDay: parseFloat(pricePerDay) || 0,
      discountPercent: parseFloat(discountPercent) || 0,
      taxPercent: parseFloat(taxPercent) || 0,
      notes: notes.trim() || undefined,
      source,
    };

    try {
      setIsSubmitting(true);
      await onSave(formData);
    } catch (err) {
      setError('Greška pri spremanju rezervacije');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle status change
  const handleStatusChange = async (newStatus: BookingStatus) => {
    if (!onStatusChange) return;
    try {
      setIsSubmitting(true);
      await onStatusChange(newStatus);
    } catch (err) {
      setError('Greška pri promjeni statusa');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle payment
  const handleRecordPayment = async () => {
    if (!onPaymentRecord || !paymentAmount) return;
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      setError('Unesite validan iznos');
      return;
    }
    try {
      setIsSubmitting(true);
      await onPaymentRecord(amount);
      setPaymentAmount('');
    } catch (err) {
      setError('Greška pri evidentiranju uplate');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">
            {isEditing ? 'Uredi rezervaciju' : 'Nova rezervacija'}
          </h2>
          <p className="text-sm text-muted-foreground">Vez: {berthCode}</p>
        </div>
        <Button type="button" variant="ghost" size="icon" onClick={onCancel}>
          <X className="w-5 h-5" />
        </Button>
      </div>

      {/* Status badges for existing booking */}
      {isEditing && existingBooking && (
        <div className="flex gap-2">
          <span
            className="px-2 py-1 rounded text-sm font-medium"
            style={{
              backgroundColor: BOOKING_STATUS_COLORS[existingBooking.status].bg,
              color: BOOKING_STATUS_COLORS[existingBooking.status].text,
            }}
          >
            {BOOKING_STATUS_COLORS[existingBooking.status].label}
          </span>
          <span
            className="px-2 py-1 rounded text-sm font-medium"
            style={{
              backgroundColor: PAYMENT_STATUS_COLORS[existingBooking.paymentStatus].bg,
              color: PAYMENT_STATUS_COLORS[existingBooking.paymentStatus].text,
            }}
          >
            {PAYMENT_STATUS_COLORS[existingBooking.paymentStatus].label}
          </span>
        </div>
      )}

      {/* Dates */}
      <Card className="p-4">
        <h3 className="font-medium mb-3">Datumi</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="checkIn">Dolazak *</Label>
            <Input
              id="checkIn"
              type="date"
              value={checkInDate}
              onChange={(e) => setCheckInDate(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="checkOut">Odlazak *</Label>
            <Input
              id="checkOut"
              type="date"
              value={checkOutDate}
              onChange={(e) => setCheckOutDate(e.target.value)}
              min={checkInDate}
              required
            />
          </div>
        </div>
        {nights > 0 && (
          <p className="text-sm text-muted-foreground mt-2">
            Broj noćenja: <strong>{nights}</strong>
          </p>
        )}
      </Card>

      {/* Guest info */}
      <Card className="p-4">
        <h3 className="font-medium mb-3">Podaci o gostu</h3>
        <div className="space-y-3">
          <div>
            <Label htmlFor="guestName">Ime i prezime *</Label>
            <Input
              id="guestName"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              placeholder="npr. Marko Petrović"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="guestPhone">Telefon</Label>
              <Input
                id="guestPhone"
                type="tel"
                value={guestPhone}
                onChange={(e) => setGuestPhone(e.target.value)}
                placeholder="+382..."
              />
            </div>
            <div>
              <Label htmlFor="guestEmail">Email</Label>
              <Input
                id="guestEmail"
                type="email"
                value={guestEmail}
                onChange={(e) => setGuestEmail(e.target.value)}
                placeholder="email@example.com"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="guestCountry">Država</Label>
            <Input
              id="guestCountry"
              value={guestCountry}
              onChange={(e) => setGuestCountry(e.target.value)}
              placeholder="npr. Crna Gora"
            />
          </div>
        </div>
      </Card>

      {/* Vessel info */}
      <Card className="p-4">
        <h3 className="font-medium mb-3">Podaci o plovilu</h3>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="vesselName">Ime plovila</Label>
              <Input
                id="vesselName"
                value={vesselName}
                onChange={(e) => setVesselName(e.target.value)}
                placeholder="npr. Sea Spirit"
              />
            </div>
            <div>
              <Label htmlFor="vesselReg">Registracija</Label>
              <Input
                id="vesselReg"
                value={vesselRegistration}
                onChange={(e) => setVesselRegistration(e.target.value)}
                placeholder="npr. HR-1234-AB"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="vesselType">Tip plovila</Label>
              <select
                id="vesselType"
                value={vesselType}
                onChange={(e) => setVesselType(e.target.value as VesselType)}
                className="w-full h-10 px-3 border rounded-md bg-background"
              >
                <option value="">-- Izaberi --</option>
                <option value="sailboat">Jedrilica</option>
                <option value="motorboat">Motorna jahta</option>
                <option value="yacht">Jahta</option>
                <option value="catamaran">Katamaran</option>
                <option value="other">Ostalo</option>
              </select>
            </div>
            <div>
              <Label htmlFor="vesselLength">Dužina (m)</Label>
              <Input
                id="vesselLength"
                type="number"
                step="0.1"
                value={vesselLength}
                onChange={(e) => setVesselLength(e.target.value)}
                placeholder="npr. 12.5"
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Pricing */}
      <Card className="p-4">
        <h3 className="font-medium mb-3 flex items-center gap-2">
          <Calculator className="w-4 h-4" />
          Cijena
        </h3>
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label htmlFor="pricePerDay">Cijena/noć (€)</Label>
              <Input
                id="pricePerDay"
                type="number"
                step="0.01"
                value={pricePerDay}
                onChange={(e) => setPricePerDay(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="discount">Popust (%)</Label>
              <Input
                id="discount"
                type="number"
                step="1"
                min="0"
                max="100"
                value={discountPercent}
                onChange={(e) => setDiscountPercent(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="tax">PDV (%)</Label>
              <Input
                id="tax"
                type="number"
                step="1"
                value={taxPercent}
                onChange={(e) => setTaxPercent(e.target.value)}
              />
            </div>
          </div>

          {/* Totals */}
          <div className="border-t pt-3 space-y-1 text-sm">
            <div className="flex justify-between">
              <span>Osnovica ({nights} noći x {formatCurrency(parseFloat(pricePerDay) || 0)})</span>
              <span>{formatCurrency(totals.subtotal)}</span>
            </div>
            {totals.discountAmount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Popust ({discountPercent}%)</span>
                <span>-{formatCurrency(totals.discountAmount)}</span>
              </div>
            )}
            {totals.taxAmount > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <span>PDV ({taxPercent}%)</span>
                <span>{formatCurrency(totals.taxAmount)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-base pt-2 border-t">
              <span>UKUPNO</span>
              <span>{formatCurrency(totals.totalAmount)}</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Source and Notes */}
      <Card className="p-4">
        <div className="space-y-3">
          <div>
            <Label htmlFor="source">Izvor rezervacije</Label>
            <select
              id="source"
              value={source}
              onChange={(e) => setSource(e.target.value as BookingSource)}
              className="w-full h-10 px-3 border rounded-md bg-background"
            >
              <option value="direct">Direktno</option>
              <option value="phone">Telefon</option>
              <option value="email">Email</option>
              <option value="online">Online</option>
              <option value="agent">Agent</option>
              <option value="walk_in">Dolazak bez rezervacije</option>
            </select>
          </div>
          <div>
            <Label htmlFor="notes">Napomene</Label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full min-h-[80px] px-3 py-2 border rounded-md bg-background resize-y"
              placeholder="Dodatne napomene..."
            />
          </div>
        </div>
      </Card>

      {/* Status actions for existing booking */}
      {isEditing && existingBooking && onStatusChange && (
        <Card className="p-4">
          <h3 className="font-medium mb-3">Promijeni status</h3>
          <div className="flex flex-wrap gap-2">
            {existingBooking.status === 'pending' && (
              <Button
                type="button"
                variant="outline"
                onClick={() => handleStatusChange('confirmed')}
                disabled={isSubmitting}
              >
                Potvrdi
              </Button>
            )}
            {existingBooking.status === 'confirmed' && (
              <Button
                type="button"
                variant="outline"
                className="bg-green-50 hover:bg-green-100"
                onClick={() => handleStatusChange('checked_in')}
                disabled={isSubmitting}
              >
                Check-in
              </Button>
            )}
            {existingBooking.status === 'checked_in' && (
              <Button
                type="button"
                variant="outline"
                onClick={() => handleStatusChange('checked_out')}
                disabled={isSubmitting}
              >
                Check-out
              </Button>
            )}
            {['pending', 'confirmed'].includes(existingBooking.status) && (
              <Button
                type="button"
                variant="destructive"
                onClick={() => handleStatusChange('cancelled')}
                disabled={isSubmitting}
              >
                Otkaži
              </Button>
            )}
          </div>
        </Card>
      )}

      {/* Payment section for existing booking */}
      {isEditing && existingBooking && onPaymentRecord && (
        <Card className="p-4">
          <h3 className="font-medium mb-3">Evidentiraj uplatu</h3>
          <div className="flex items-center justify-between mb-3 text-sm">
            <span>Plaćeno: {formatCurrency(existingBooking.amountPaid)}</span>
            <span>
              Preostalo:{' '}
              {formatCurrency(existingBooking.totalAmount - existingBooking.amountPaid)}
            </span>
          </div>
          <div className="flex gap-2">
            <Input
              type="number"
              step="0.01"
              placeholder="Iznos"
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
            />
            <Button
              type="button"
              onClick={handleRecordPayment}
              disabled={isSubmitting || !paymentAmount}
            >
              Evidentiraj
            </Button>
          </div>
        </Card>
      )}

      {/* Error message */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Submit buttons */}
      <div className="flex gap-3">
        <Button type="submit" disabled={isSubmitting} className="flex-1">
          {isSubmitting ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          {isEditing ? 'Sačuvaj izmjene' : 'Kreiraj rezervaciju'}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Odustani
        </Button>
      </div>
    </form>
  );
}
