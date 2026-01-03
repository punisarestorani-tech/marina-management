'use client';

import { useState, useMemo, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Calendar,
  List,
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  Ship,
  Users,
  DollarSign,
  Clock,
  Loader2,
} from 'lucide-react';
import { BookingCalendar, BookingTimeline } from '@/components/booking/BookingCalendar';
import { BookingForm } from '@/components/booking/BookingForm';
import {
  Booking,
  BookingFormData,
  BookingStatus,
  BOOKING_STATUS_COLORS,
  PAYMENT_STATUS_COLORS,
  formatDate,
  formatCurrency,
} from '@/types/booking.types';
import { useAuthStore } from '@/stores/authStore';
import { getSupabaseClient } from '@/lib/supabase/client';

interface BerthOption {
  id: string;
  code: string;
  type: 'transit' | 'communal';
  dailyRate: number;
}

type ViewMode = 'calendar' | 'timeline' | 'list';

export default function BookingsPage() {
  const user = useAuthStore((state) => state.user);
  const [viewMode, setViewMode] = useState<ViewMode>('timeline');
  const [selectedBerth, setSelectedBerth] = useState<string | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [berths, setBerths] = useState<BerthOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [newBookingDates, setNewBookingDates] = useState<{
    berthId: string;
    berthCode: string;
    checkIn: string;
    checkOut: string;
  } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<BookingStatus | 'all'>('all');
  const [timelineStart, setTimelineStart] = useState(() => {
    const today = new Date();
    today.setDate(today.getDate() - 2);
    return today.toISOString().split('T')[0];
  });

  // Load berths and bookings from database
  useEffect(() => {
    const loadData = async () => {
      try {
        const supabase = getSupabaseClient();

        // Load berths
        const { data: berthsData } = await supabase
          .from('berths')
          .select('id, code, berth_type, daily_rate_summer')
          .eq('status', 'active')
          .order('code');

        if (berthsData) {
          setBerths(berthsData.map(b => ({
            id: b.id,
            code: b.code,
            type: (b.berth_type || 'transit') as 'transit' | 'communal',
            dailyRate: b.daily_rate_summer || 50,
          })));
        }

        // Load bookings
        const { data: bookingsData } = await supabase
          .from('berth_bookings')
          .select('*')
          .order('check_in_date', { ascending: true });

        if (bookingsData) {
          setBookings(bookingsData.map(b => ({
            id: b.id,
            berthId: b.berth_id,
            berthCode: b.berth_code,
            checkInDate: b.check_in_date,
            checkOutDate: b.check_out_date,
            guestName: b.guest_name,
            guestEmail: b.guest_email,
            guestPhone: b.guest_phone,
            guestCountry: b.guest_country,
            vesselName: b.vessel_name,
            vesselRegistration: b.vessel_registration,
            vesselType: b.vessel_type,
            vesselLength: b.vessel_length,
            vesselImageUrl: b.vessel_image_url,
            status: b.status as BookingStatus,
            pricePerDay: Number(b.price_per_day),
            totalNights: b.total_nights,
            subtotal: Number(b.subtotal),
            discountPercent: Number(b.discount_percent || 0),
            discountAmount: Number(b.discount_amount || 0),
            taxPercent: Number(b.tax_percent || 0),
            taxAmount: Number(b.tax_amount || 0),
            totalAmount: Number(b.total_amount),
            paymentStatus: b.payment_status,
            amountPaid: Number(b.amount_paid || 0),
            source: b.source,
            notes: b.notes,
            createdAt: b.created_at,
            updatedAt: b.updated_at,
          })));
        }
      } catch (err) {
        console.error('Error loading data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  // Get today's stats
  const todayStats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const arrivals = bookings.filter(
      (b) => b.checkInDate === today && ['confirmed', 'pending'].includes(b.status)
    );
    const departures = bookings.filter(
      (b) => b.checkOutDate === today && b.status === 'checked_in'
    );
    const currentGuests = bookings.filter((b) => b.status === 'checked_in');
    const pendingPayments = bookings.filter((b) => b.paymentStatus !== 'paid');

    return { arrivals, departures, currentGuests, pendingPayments };
  }, [bookings]);

  // Filter bookings
  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      if (statusFilter !== 'all' && b.status !== statusFilter) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          b.guestName.toLowerCase().includes(query) ||
          b.vesselName?.toLowerCase().includes(query) ||
          b.berthCode.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [bookings, statusFilter, searchQuery]);

  // Handle new booking
  const handleNewBooking = (berthId: string, berthCode: string, checkIn: string, checkOut: string) => {
    setNewBookingDates({
      berthId,
      berthCode,
      checkIn,
      checkOut,
    });
    setEditingBooking(null);
    setShowForm(true);
  };

  // Handle booking click
  const handleBookingClick = (booking: Booking) => {
    setEditingBooking(booking);
    setNewBookingDates(null);
    setShowForm(true);
  };

  // Handle save booking
  const handleSaveBooking = async (data: BookingFormData) => {
    const supabase = getSupabaseClient();

    if (editingBooking) {
      // Update existing
      const { error } = await supabase
        .from('berth_bookings')
        .update({
          berth_code: data.berthCode,
          check_in_date: data.checkInDate,
          check_out_date: data.checkOutDate,
          guest_name: data.guestName,
          guest_email: data.guestEmail,
          guest_phone: data.guestPhone,
          guest_country: data.guestCountry,
          vessel_name: data.vesselName,
          vessel_registration: data.vesselRegistration,
          vessel_type: data.vesselType,
          vessel_length: data.vesselLength,
          vessel_image_url: data.vesselImageUrl,
          price_per_day: data.pricePerDay,
          discount_percent: data.discountPercent || 0,
          tax_percent: data.taxPercent || 0,
          notes: data.notes,
          source: data.source,
        })
        .eq('id', editingBooking.id);

      if (error) {
        alert('Greska: ' + error.message);
        return;
      }

      // Update local state
      setBookings((prev) =>
        prev.map((b) =>
          b.id === editingBooking.id
            ? { ...b, ...data, vesselImageUrl: data.vesselImageUrl, updatedAt: new Date().toISOString() }
            : b
        )
      );
    } else {
      // Create new
      const nights =
        (new Date(data.checkOutDate).getTime() - new Date(data.checkInDate).getTime()) /
        (1000 * 60 * 60 * 24);
      const subtotal = data.pricePerDay * nights;
      const discountAmount = subtotal * ((data.discountPercent || 0) / 100);
      const afterDiscount = subtotal - discountAmount;
      const taxAmount = afterDiscount * ((data.taxPercent || 0) / 100);
      const totalAmount = afterDiscount + taxAmount;

      const { data: newData, error } = await supabase
        .from('berth_bookings')
        .insert({
          berth_id: data.berthId,
          berth_code: data.berthCode,
          check_in_date: data.checkInDate,
          check_out_date: data.checkOutDate,
          guest_name: data.guestName,
          guest_email: data.guestEmail,
          guest_phone: data.guestPhone,
          guest_country: data.guestCountry,
          vessel_name: data.vesselName,
          vessel_registration: data.vesselRegistration,
          vessel_type: data.vesselType,
          vessel_length: data.vesselLength,
          vessel_image_url: data.vesselImageUrl,
          price_per_day: data.pricePerDay,
          subtotal: subtotal,
          discount_percent: data.discountPercent || 0,
          discount_amount: discountAmount,
          tax_percent: data.taxPercent || 0,
          tax_amount: taxAmount,
          total_amount: totalAmount,
          notes: data.notes,
          source: data.source || 'direct',
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) {
        alert('Greska: ' + error.message);
        return;
      }

      if (newData) {
        const newBooking: Booking = {
          id: newData.id,
          berthId: newData.berth_id,
          berthCode: newData.berth_code,
          checkInDate: newData.check_in_date,
          checkOutDate: newData.check_out_date,
          guestName: newData.guest_name,
          guestEmail: newData.guest_email,
          guestPhone: newData.guest_phone,
          guestCountry: newData.guest_country,
          vesselName: newData.vessel_name,
          vesselRegistration: newData.vessel_registration,
          vesselType: newData.vessel_type,
          vesselLength: newData.vessel_length,
          vesselImageUrl: newData.vessel_image_url,
          status: 'pending',
          pricePerDay: data.pricePerDay,
          totalNights: nights,
          subtotal,
          discountPercent: data.discountPercent || 0,
          discountAmount,
          taxPercent: data.taxPercent || 0,
          taxAmount,
          totalAmount,
          paymentStatus: 'unpaid',
          amountPaid: 0,
          source: data.source || 'direct',
          notes: data.notes,
          createdBy: user?.id,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        setBookings((prev) => [...prev, newBooking]);
      }
    }

    setShowForm(false);
    setEditingBooking(null);
    setNewBookingDates(null);
  };

  // Handle status change
  const handleStatusChange = async (status: BookingStatus) => {
    if (!editingBooking) return;

    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from('berth_bookings')
      .update({ status })
      .eq('id', editingBooking.id);

    if (error) {
      alert('Greska: ' + error.message);
      return;
    }

    setBookings((prev) =>
      prev.map((b) =>
        b.id === editingBooking.id
          ? { ...b, status, updatedAt: new Date().toISOString() }
          : b
      )
    );
    setEditingBooking((prev) => (prev ? { ...prev, status } : null));
  };

  // Handle payment
  const handlePayment = async (amount: number) => {
    if (!editingBooking) return;

    const supabase = getSupabaseClient();
    const newAmountPaid = editingBooking.amountPaid + amount;
    const newPaymentStatus =
      newAmountPaid >= editingBooking.totalAmount
        ? 'paid'
        : newAmountPaid > 0
        ? 'partial'
        : 'unpaid';

    const { error } = await supabase
      .from('berth_bookings')
      .update({
        amount_paid: newAmountPaid,
        payment_status: newPaymentStatus,
      })
      .eq('id', editingBooking.id);

    if (error) {
      alert('Greska: ' + error.message);
      return;
    }

    setBookings((prev) =>
      prev.map((b) =>
        b.id === editingBooking.id
          ? {
              ...b,
              amountPaid: newAmountPaid,
              paymentStatus: newPaymentStatus,
              updatedAt: new Date().toISOString(),
            }
          : b
      )
    );
    setEditingBooking((prev) =>
      prev ? { ...prev, amountPaid: newAmountPaid, paymentStatus: newPaymentStatus } : null
    );
  };

  if (!user) return null;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const transitBerths = berths.filter(b => b.type === 'transit');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Rezervacije</h1>
          <p className="text-muted-foreground">Upravljanje rezervacijama vezova</p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Nova rezervacija
        </Button>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
              <Users className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Danas dolazi</p>
              <p className="text-2xl font-bold">{todayStats.arrivals.length}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 dark:bg-red-900 rounded-lg">
              <Clock className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Danas odlazi</p>
              <p className="text-2xl font-bold">{todayStats.departures.length}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <Ship className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Trenutno gostiju</p>
              <p className="text-2xl font-bold">{todayStats.currentGuests.length}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
              <DollarSign className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Ceka naplatu</p>
              <p className="text-2xl font-bold">{todayStats.pendingPayments.length}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* View controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === 'timeline' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('timeline')}
          >
            <Calendar className="w-4 h-4 mr-1" />
            Timeline
          </Button>
          <Button
            variant={viewMode === 'calendar' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('calendar')}
          >
            <Calendar className="w-4 h-4 mr-1" />
            Kalendar
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('list')}
          >
            <List className="w-4 h-4 mr-1" />
            Lista
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Pretrazi..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 w-64"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as BookingStatus | 'all')}
            className="h-10 px-3 border rounded-md bg-background"
          >
            <option value="all">Svi statusi</option>
            <option value="pending">Na cekanju</option>
            <option value="confirmed">Potvrdjeno</option>
            <option value="checked_in">Prijavljeni</option>
            <option value="checked_out">Odjavljeni</option>
            <option value="cancelled">Otkazano</option>
          </select>
        </div>
      </div>

      {/* Timeline view */}
      {viewMode === 'timeline' && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Pregled po vezovima</h3>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  const d = new Date(timelineStart);
                  d.setDate(d.getDate() - 7);
                  setTimelineStart(d.toISOString().split('T')[0]);
                }}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm min-w-[100px] text-center">
                {formatDate(timelineStart)}
              </span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  const d = new Date(timelineStart);
                  d.setDate(d.getDate() + 7);
                  setTimelineStart(d.toISOString().split('T')[0]);
                }}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
          {transitBerths.length > 0 ? (
            <BookingTimeline
              berths={transitBerths}
              bookings={filteredBookings}
              startDate={timelineStart}
              days={21}
              onBookingClick={handleBookingClick}
              onCellClick={(berthId, berthCode, date) => {
                const nextDay = new Date(date);
                nextDay.setDate(nextDay.getDate() + 1);
                handleNewBooking(berthId, berthCode, date, nextDay.toISOString().split('T')[0]);
              }}
            />
          ) : (
            <p className="text-center text-muted-foreground py-8">
              Nema vezova za prikaz. Dodajte vezove u bazu.
            </p>
          )}
        </Card>
      )}

      {/* Calendar view for single berth */}
      {viewMode === 'calendar' && (
        <div className="grid grid-cols-3 gap-4">
          <Card className="p-4">
            <h3 className="font-semibold mb-3">Izaberi vez</h3>
            <div className="space-y-1">
              {transitBerths.map((berth) => (
                <button
                  key={berth.id}
                  onClick={() => setSelectedBerth(berth.id)}
                  className={`
                    w-full text-left px-3 py-2 rounded-lg transition-colors
                    ${
                      selectedBerth === berth.id
                        ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                        : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                    }
                  `}
                >
                  <span className="font-medium">{berth.code}</span>
                  <span className="text-sm text-muted-foreground ml-2">
                    {formatCurrency(berth.dailyRate)}/noc
                  </span>
                </button>
              ))}
            </div>
          </Card>

          <div className="col-span-2">
            {selectedBerth ? (
              <BookingCalendar
                berthCode={berths.find((b) => b.id === selectedBerth)?.code || ''}
                bookings={filteredBookings.filter((b) => b.berthId === selectedBerth)}
                onBookingClick={handleBookingClick}
                onNewBooking={(start, end) => {
                  const berth = berths.find((b) => b.id === selectedBerth);
                  if (berth) {
                    handleNewBooking(berth.id, berth.code, start, end);
                  }
                }}
              />
            ) : (
              <Card className="p-8 text-center text-muted-foreground">
                Izaberite vez za prikaz kalendara
              </Card>
            )}
          </div>
        </div>
      )}

      {/* List view */}
      {viewMode === 'list' && (
        <Card>
          <div className="overflow-x-auto">
            {filteredBookings.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Ship className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p>Nema rezervacija</p>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium">Vez</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Gost</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Plovilo</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Dolazak</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Odlazak</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Placanje</th>
                    <th className="px-4 py-3 text-right text-sm font-medium">Iznos</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredBookings.map((booking) => (
                    <tr
                      key={booking.id}
                      onClick={() => handleBookingClick(booking)}
                      className="hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                    >
                      <td className="px-4 py-3 font-medium">{booking.berthCode}</td>
                      <td className="px-4 py-3">
                        <div>{booking.guestName}</div>
                        <div className="text-xs text-muted-foreground">{booking.guestCountry}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div>{booking.vesselName || '-'}</div>
                        <div className="text-xs text-muted-foreground">
                          {booking.vesselRegistration}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">{formatDate(booking.checkInDate)}</td>
                      <td className="px-4 py-3 text-sm">{formatDate(booking.checkOutDate)}</td>
                      <td className="px-4 py-3">
                        <span
                          className="px-2 py-1 rounded text-xs font-medium"
                          style={{
                            backgroundColor: BOOKING_STATUS_COLORS[booking.status].bg,
                            color: BOOKING_STATUS_COLORS[booking.status].text,
                          }}
                        >
                          {BOOKING_STATUS_COLORS[booking.status].label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="px-2 py-1 rounded text-xs font-medium"
                          style={{
                            backgroundColor: PAYMENT_STATUS_COLORS[booking.paymentStatus].bg,
                            color: PAYMENT_STATUS_COLORS[booking.paymentStatus].text,
                          }}
                        >
                          {PAYMENT_STATUS_COLORS[booking.paymentStatus].label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        {formatCurrency(booking.totalAmount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Card>
      )}

      {/* Booking form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <BookingForm
                berthId={newBookingDates?.berthId || editingBooking?.berthId || berths[0]?.id || ''}
                berthCode={
                  newBookingDates?.berthCode || editingBooking?.berthCode || berths[0]?.code || ''
                }
                defaultCheckIn={newBookingDates?.checkIn}
                defaultCheckOut={newBookingDates?.checkOut}
                defaultPricePerDay={
                  berths.find(
                    (b) => b.id === (newBookingDates?.berthId || editingBooking?.berthId)
                  )?.dailyRate || 50
                }
                existingBooking={editingBooking || undefined}
                onSave={handleSaveBooking}
                onCancel={() => {
                  setShowForm(false);
                  setEditingBooking(null);
                  setNewBookingDates(null);
                }}
                onStatusChange={editingBooking ? handleStatusChange : undefined}
                onPaymentRecord={editingBooking ? handlePayment : undefined}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
