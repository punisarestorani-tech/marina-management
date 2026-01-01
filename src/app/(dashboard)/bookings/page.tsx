'use client';

import { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Calendar,
  List,
  Plus,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Ship,
  Users,
  DollarSign,
  Clock,
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

// Demo data - in production this comes from API
const DEMO_BERTHS = [
  { id: 'b1', code: 'A-01', type: 'transit' as const, dailyRate: 50 },
  { id: 'b2', code: 'A-02', type: 'transit' as const, dailyRate: 55 },
  { id: 'b3', code: 'A-03', type: 'transit' as const, dailyRate: 60 },
  { id: 'b4', code: 'B-01', type: 'transit' as const, dailyRate: 70 },
  { id: 'b5', code: 'B-02', type: 'transit' as const, dailyRate: 75 },
  { id: 'b6', code: 'C-01', type: 'communal' as const, dailyRate: 0 },
];

const DEMO_BOOKINGS: Booking[] = [
  {
    id: '1',
    berthId: 'b1',
    berthCode: 'A-01',
    checkInDate: '2026-01-02',
    checkOutDate: '2026-01-05',
    guestName: 'Marco Rossi',
    guestEmail: 'marco@example.com',
    guestPhone: '+39 123 456 789',
    guestCountry: 'Italija',
    vesselName: 'Bella Mare',
    vesselRegistration: 'IT-1234',
    vesselType: 'sailboat',
    vesselLength: 12,
    status: 'checked_in',
    pricePerDay: 50,
    totalNights: 3,
    subtotal: 150,
    discountPercent: 0,
    discountAmount: 0,
    taxPercent: 13,
    taxAmount: 19.5,
    totalAmount: 169.5,
    paymentStatus: 'paid',
    amountPaid: 169.5,
    source: 'online',
    createdAt: '2025-12-15T10:00:00Z',
    updatedAt: '2026-01-02T14:00:00Z',
  },
  {
    id: '2',
    berthId: 'b2',
    berthCode: 'A-02',
    checkInDate: '2026-01-05',
    checkOutDate: '2026-01-10',
    guestName: 'Hans Mueller',
    guestEmail: 'hans@example.de',
    guestPhone: '+49 987 654 321',
    guestCountry: 'Njemačka',
    vesselName: 'Seestern',
    vesselRegistration: 'DE-5678',
    vesselType: 'motorboat',
    vesselLength: 15,
    status: 'confirmed',
    pricePerDay: 55,
    totalNights: 5,
    subtotal: 275,
    discountPercent: 10,
    discountAmount: 27.5,
    taxPercent: 13,
    taxAmount: 32.18,
    totalAmount: 279.68,
    paymentStatus: 'partial',
    amountPaid: 100,
    source: 'phone',
    createdAt: '2025-12-20T15:00:00Z',
    updatedAt: '2025-12-20T15:00:00Z',
  },
  {
    id: '3',
    berthId: 'b4',
    berthCode: 'B-01',
    checkInDate: '2026-01-08',
    checkOutDate: '2026-01-15',
    guestName: 'Jean Dupont',
    guestEmail: 'jean@example.fr',
    guestCountry: 'Francuska',
    vesselName: 'Liberté',
    vesselType: 'yacht',
    vesselLength: 18,
    status: 'pending',
    pricePerDay: 70,
    totalNights: 7,
    subtotal: 490,
    discountPercent: 0,
    discountAmount: 0,
    taxPercent: 13,
    taxAmount: 63.7,
    totalAmount: 553.7,
    paymentStatus: 'unpaid',
    amountPaid: 0,
    source: 'email',
    createdAt: '2025-12-28T09:00:00Z',
    updatedAt: '2025-12-28T09:00:00Z',
  },
];

type ViewMode = 'calendar' | 'timeline' | 'list';

export default function BookingsPage() {
  const user = useAuthStore((state) => state.user);
  const [viewMode, setViewMode] = useState<ViewMode>('timeline');
  const [selectedBerth, setSelectedBerth] = useState<string | null>(null);
  const [bookings, setBookings] = useState<Booking[]>(DEMO_BOOKINGS);
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
    const berth = DEMO_BERTHS.find((b) => b.id === berthId);
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
    // Simulate API call
    await new Promise((r) => setTimeout(r, 500));

    if (editingBooking) {
      // Update existing
      setBookings((prev) =>
        prev.map((b) =>
          b.id === editingBooking.id
            ? {
                ...b,
                ...data,
                totalNights:
                  (new Date(data.checkOutDate).getTime() - new Date(data.checkInDate).getTime()) /
                  (1000 * 60 * 60 * 24),
                updatedAt: new Date().toISOString(),
              }
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

      const newBooking: Booking = {
        id: `booking-${Date.now()}`,
        berthId: data.berthId,
        berthCode: data.berthCode,
        checkInDate: data.checkInDate,
        checkOutDate: data.checkOutDate,
        guestName: data.guestName,
        guestEmail: data.guestEmail,
        guestPhone: data.guestPhone,
        guestCountry: data.guestCountry,
        vesselName: data.vesselName,
        vesselRegistration: data.vesselRegistration,
        vesselType: data.vesselType,
        vesselLength: data.vesselLength,
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

    setShowForm(false);
    setEditingBooking(null);
    setNewBookingDates(null);
  };

  // Handle status change
  const handleStatusChange = async (status: BookingStatus) => {
    if (!editingBooking) return;
    await new Promise((r) => setTimeout(r, 300));
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
    await new Promise((r) => setTimeout(r, 300));
    const newAmountPaid = editingBooking.amountPaid + amount;
    const newPaymentStatus =
      newAmountPaid >= editingBooking.totalAmount
        ? 'paid'
        : newAmountPaid > 0
        ? 'partial'
        : 'unpaid';

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
              <p className="text-sm text-muted-foreground">Čeka naplatu</p>
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
              placeholder="Pretraži..."
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
            <option value="pending">Na čekanju</option>
            <option value="confirmed">Potvrđeno</option>
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
          <BookingTimeline
            berths={DEMO_BERTHS.filter((b) => b.type === 'transit')}
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
        </Card>
      )}

      {/* Calendar view for single berth */}
      {viewMode === 'calendar' && (
        <div className="grid grid-cols-3 gap-4">
          <Card className="p-4">
            <h3 className="font-semibold mb-3">Odaberi vez</h3>
            <div className="space-y-1">
              {DEMO_BERTHS.filter((b) => b.type === 'transit').map((berth) => (
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
                    {formatCurrency(berth.dailyRate)}/noć
                  </span>
                </button>
              ))}
            </div>
          </Card>

          <div className="col-span-2">
            {selectedBerth ? (
              <BookingCalendar
                berthCode={DEMO_BERTHS.find((b) => b.id === selectedBerth)?.code || ''}
                bookings={filteredBookings.filter((b) => b.berthId === selectedBerth)}
                onBookingClick={handleBookingClick}
                onNewBooking={(start, end) => {
                  const berth = DEMO_BERTHS.find((b) => b.id === selectedBerth);
                  if (berth) {
                    handleNewBooking(berth.id, berth.code, start, end);
                  }
                }}
              />
            ) : (
              <Card className="p-8 text-center text-muted-foreground">
                Odaberite vez za prikaz kalendara
              </Card>
            )}
          </div>
        </div>
      )}

      {/* List view */}
      {viewMode === 'list' && (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium">Vez</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Gost</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Plovilo</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Dolazak</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Odlazak</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Plaćanje</th>
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
          </div>
        </Card>
      )}

      {/* Booking form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <BookingForm
                berthId={newBookingDates?.berthId || editingBooking?.berthId || DEMO_BERTHS[0].id}
                berthCode={
                  newBookingDates?.berthCode || editingBooking?.berthCode || DEMO_BERTHS[0].code
                }
                defaultCheckIn={newBookingDates?.checkIn}
                defaultCheckOut={newBookingDates?.checkOut}
                defaultPricePerDay={
                  DEMO_BERTHS.find(
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
