'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Calendar,
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  Ship,
  Users,
  TrendingUp,
  TrendingDown,
  Clock,
  Loader2,
  MoreHorizontal,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  CheckCircle2,
  XCircle,
  LogIn,
  LogOut,
  FileText,
  Download,
  Filter,
  ArrowUpDown,
  Anchor,
  Wallet,
  CalendarDays,
  AlertCircle,
  Eye,
  Edit,
  Ban,
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

type ViewTab = 'today' | 'upcoming' | 'calendar' | 'all';
type SortField = 'checkInDate' | 'guestName' | 'berthCode' | 'totalAmount';
type SortOrder = 'asc' | 'desc';

// Status icon component
function StatusIcon({ status }: { status: BookingStatus }) {
  switch (status) {
    case 'pending':
      return <Clock className="w-4 h-4" />;
    case 'confirmed':
      return <CheckCircle2 className="w-4 h-4" />;
    case 'checked_in':
      return <LogIn className="w-4 h-4" />;
    case 'checked_out':
      return <LogOut className="w-4 h-4" />;
    case 'cancelled':
      return <XCircle className="w-4 h-4" />;
    case 'no_show':
      return <AlertCircle className="w-4 h-4" />;
    default:
      return null;
  }
}

export default function BookingsPage() {
  const user = useAuthStore((state) => state.user);
  const [activeTab, setActiveTab] = useState<ViewTab>('today');
  const [selectedBerth, setSelectedBerth] = useState<string | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [berths, setBerths] = useState<BerthOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Form states
  const [showForm, setShowForm] = useState(false);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [newBookingDates, setNewBookingDates] = useState<{
    berthId: string;
    berthCode: string;
    checkIn: string;
    checkOut: string;
  } | null>(null);

  // Filters and sorting
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<BookingStatus | 'all'>('all');
  const [sortField, setSortField] = useState<SortField>('checkInDate');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  // Sheet for booking details
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  // Calendar month navigation
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());

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

  // Today's date
  const today = new Date().toISOString().split('T')[0];

  // Get today's stats with trends
  const stats = useMemo(() => {
    const todayArrivals = bookings.filter(
      (b) => b.checkInDate === today && ['confirmed', 'pending'].includes(b.status)
    );
    const todayDepartures = bookings.filter(
      (b) => b.checkOutDate === today && b.status === 'checked_in'
    );
    const currentGuests = bookings.filter((b) => b.status === 'checked_in');
    const pendingPayments = bookings.filter(
      (b) => b.paymentStatus !== 'paid' && !['cancelled', 'no_show'].includes(b.status)
    );

    // Calculate pending revenue
    const pendingRevenue = pendingPayments.reduce(
      (sum, b) => sum + (b.totalAmount - b.amountPaid), 0
    );

    // This week's bookings
    const weekFromNow = new Date();
    weekFromNow.setDate(weekFromNow.getDate() + 7);
    const weekStr = weekFromNow.toISOString().split('T')[0];
    const upcomingThisWeek = bookings.filter(
      (b) => b.checkInDate >= today && b.checkInDate <= weekStr &&
             ['confirmed', 'pending'].includes(b.status)
    );

    return {
      todayArrivals,
      todayDepartures,
      currentGuests,
      pendingPayments,
      pendingRevenue,
      upcomingThisWeek,
    };
  }, [bookings, today]);

  // Filter bookings by tab
  const getBookingsForTab = useCallback((tab: ViewTab) => {
    const weekFromNow = new Date();
    weekFromNow.setDate(weekFromNow.getDate() + 7);
    const weekStr = weekFromNow.toISOString().split('T')[0];

    switch (tab) {
      case 'today':
        return bookings.filter(
          (b) => (b.checkInDate === today || b.checkOutDate === today) &&
                 !['cancelled', 'no_show'].includes(b.status)
        );
      case 'upcoming':
        return bookings.filter(
          (b) => b.checkInDate >= today && ['confirmed', 'pending'].includes(b.status)
        );
      case 'all':
      default:
        return bookings;
    }
  }, [bookings, today]);

  // Apply filters and sorting
  const filteredBookings = useMemo(() => {
    let result = getBookingsForTab(activeTab);

    // Status filter
    if (statusFilter !== 'all') {
      result = result.filter((b) => b.status === statusFilter);
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter((b) =>
        b.guestName.toLowerCase().includes(query) ||
        b.vesselName?.toLowerCase().includes(query) ||
        b.berthCode.toLowerCase().includes(query) ||
        b.vesselRegistration?.toLowerCase().includes(query)
      );
    }

    // Sorting
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'checkInDate':
          comparison = a.checkInDate.localeCompare(b.checkInDate);
          break;
        case 'guestName':
          comparison = a.guestName.localeCompare(b.guestName);
          break;
        case 'berthCode':
          comparison = a.berthCode.localeCompare(b.berthCode);
          break;
        case 'totalAmount':
          comparison = a.totalAmount - b.totalAmount;
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [activeTab, statusFilter, searchQuery, sortField, sortOrder, getBookingsForTab]);

  // Handle new booking
  const handleNewBooking = (berthId: string, berthCode: string, checkIn: string, checkOut: string) => {
    setNewBookingDates({ berthId, berthCode, checkIn, checkOut });
    setEditingBooking(null);
    setShowForm(true);
  };

  // Handle booking click
  const handleBookingClick = (booking: Booking) => {
    setSelectedBooking(booking);
    setShowDetails(true);
  };

  // Handle edit booking
  const handleEditBooking = (booking: Booking) => {
    setEditingBooking(booking);
    setNewBookingDates(null);
    setShowDetails(false);
    setShowForm(true);
  };

  // Handle save booking
  const handleSaveBooking = async (data: BookingFormData) => {
    const supabase = getSupabaseClient();

    if (editingBooking) {
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

      setBookings((prev) =>
        prev.map((b) =>
          b.id === editingBooking.id
            ? { ...b, ...data, vesselImageUrl: data.vesselImageUrl, updatedAt: new Date().toISOString() }
            : b
        )
      );
    } else {
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
  const handleStatusChange = async (bookingId: string, status: BookingStatus) => {
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from('berth_bookings')
      .update({ status })
      .eq('id', bookingId);

    if (error) {
      alert('Greska: ' + error.message);
      return;
    }

    setBookings((prev) =>
      prev.map((b) =>
        b.id === bookingId
          ? { ...b, status, updatedAt: new Date().toISOString() }
          : b
      )
    );

    if (selectedBooking?.id === bookingId) {
      setSelectedBooking(prev => prev ? { ...prev, status } : null);
    }
  };

  // Handle payment
  const handlePayment = async (bookingId: string, amount: number) => {
    const booking = bookings.find(b => b.id === bookingId);
    if (!booking) return;

    const supabase = getSupabaseClient();
    const newAmountPaid = booking.amountPaid + amount;
    const newPaymentStatus =
      newAmountPaid >= booking.totalAmount
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
      .eq('id', bookingId);

    if (error) {
      alert('Greska: ' + error.message);
      return;
    }

    setBookings((prev) =>
      prev.map((b) =>
        b.id === bookingId
          ? {
              ...b,
              amountPaid: newAmountPaid,
              paymentStatus: newPaymentStatus,
              updatedAt: new Date().toISOString(),
            }
          : b
      )
    );

    if (selectedBooking?.id === bookingId) {
      setSelectedBooking(prev =>
        prev ? { ...prev, amountPaid: newAmountPaid, paymentStatus: newPaymentStatus } : null
      );
    }
  };

  // Toggle sort
  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
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
          <h1 className="text-2xl font-bold tracking-tight">Rezervacije</h1>
          <p className="text-muted-foreground">
            Upravljanje rezervacijama tranzitnih vezova
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Nova rezervacija
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today's Arrivals */}
        <Card className="p-4 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Danas dolazi</p>
              <p className="text-3xl font-bold">{stats.todayArrivals.length}</p>
              {stats.todayArrivals.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {stats.todayArrivals.slice(0, 3).map(b => (
                    <Badge
                      key={b.id}
                      variant="secondary"
                      className="text-xs cursor-pointer hover:bg-secondary/80"
                      onClick={() => handleBookingClick(b)}
                    >
                      {b.berthCode}
                    </Badge>
                  ))}
                  {stats.todayArrivals.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{stats.todayArrivals.length - 3}
                    </Badge>
                  )}
                </div>
              )}
            </div>
            <div className="p-2.5 bg-green-100 dark:bg-green-900/30 rounded-xl">
              <LogIn className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </Card>

        {/* Today's Departures */}
        <Card className="p-4 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Danas odlazi</p>
              <p className="text-3xl font-bold">{stats.todayDepartures.length}</p>
              {stats.todayDepartures.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {stats.todayDepartures.slice(0, 3).map(b => (
                    <Badge
                      key={b.id}
                      variant="secondary"
                      className="text-xs cursor-pointer hover:bg-secondary/80"
                      onClick={() => handleBookingClick(b)}
                    >
                      {b.berthCode}
                    </Badge>
                  ))}
                  {stats.todayDepartures.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{stats.todayDepartures.length - 3}
                    </Badge>
                  )}
                </div>
              )}
            </div>
            <div className="p-2.5 bg-orange-100 dark:bg-orange-900/30 rounded-xl">
              <LogOut className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
        </Card>

        {/* Current Guests */}
        <Card className="p-4 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Trenutno gostiju</p>
              <p className="text-3xl font-bold">{stats.currentGuests.length}</p>
              <p className="text-xs text-muted-foreground">
                od {transitBerths.length} vezova
              </p>
            </div>
            <div className="p-2.5 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
              <Anchor className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          {/* Occupancy bar */}
          <div className="mt-3">
            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all"
                style={{ width: `${transitBerths.length ? (stats.currentGuests.length / transitBerths.length) * 100 : 0}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {transitBerths.length ? Math.round((stats.currentGuests.length / transitBerths.length) * 100) : 0}% popunjenost
            </p>
          </div>
        </Card>

        {/* Pending Revenue */}
        <Card className="p-4 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Ceka naplatu</p>
              <p className="text-3xl font-bold">{formatCurrency(stats.pendingRevenue)}</p>
              <p className="text-xs text-muted-foreground">
                {stats.pendingPayments.length} rezervacija
              </p>
            </div>
            <div className="p-2.5 bg-amber-100 dark:bg-amber-900/30 rounded-xl">
              <Wallet className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
          </div>
        </Card>
      </div>

      {/* Quick Actions - Today's Activity */}
      {(stats.todayArrivals.length > 0 || stats.todayDepartures.length > 0) && (
        <Card className="p-4 border-l-4 border-l-blue-500">
          <div className="flex items-center gap-2 mb-3">
            <CalendarDays className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold">Danasnje aktivnosti</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {stats.todayArrivals.length > 0 && (
              <div>
                <p className="text-sm text-muted-foreground mb-2">Ocekivani dolasci</p>
                <div className="space-y-2">
                  {stats.todayArrivals.map(booking => (
                    <div
                      key={booking.id}
                      onClick={() => handleBookingClick(booking)}
                      className="flex items-center justify-between p-2 rounded-lg bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-800 flex items-center justify-center">
                          <Ship className="w-5 h-5 text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{booking.guestName}</p>
                          <p className="text-xs text-muted-foreground">
                            {booking.vesselName || 'N/A'} • Vez {booking.berthCode}
                          </p>
                        </div>
                      </div>
                      {booking.status === 'confirmed' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="bg-green-500 hover:bg-green-600 text-white border-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStatusChange(booking.id, 'checked_in');
                          }}
                        >
                          <LogIn className="w-4 h-4 mr-1" />
                          Check-in
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {stats.todayDepartures.length > 0 && (
              <div>
                <p className="text-sm text-muted-foreground mb-2">Ocekivani odlasci</p>
                <div className="space-y-2">
                  {stats.todayDepartures.map(booking => (
                    <div
                      key={booking.id}
                      onClick={() => handleBookingClick(booking)}
                      className="flex items-center justify-between p-2 rounded-lg bg-orange-50 dark:bg-orange-900/20 hover:bg-orange-100 dark:hover:bg-orange-900/30 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-800 flex items-center justify-center">
                          <Ship className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{booking.guestName}</p>
                          <p className="text-xs text-muted-foreground">
                            {booking.vesselName || 'N/A'} • Vez {booking.berthCode}
                          </p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="bg-orange-500 hover:bg-orange-600 text-white border-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStatusChange(booking.id, 'checked_out');
                        }}
                      >
                        <LogOut className="w-4 h-4 mr-1" />
                        Check-out
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Main Content with Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ViewTab)}>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <TabsList className="grid grid-cols-4 w-auto">
            <TabsTrigger value="today" className="gap-2">
              <CalendarDays className="w-4 h-4" />
              Danas
              {stats.todayArrivals.length + stats.todayDepartures.length > 0 && (
                <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-xs">
                  {stats.todayArrivals.length + stats.todayDepartures.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="upcoming" className="gap-2">
              <Clock className="w-4 h-4" />
              Nadolazece
              {stats.upcomingThisWeek.length > 0 && (
                <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-xs">
                  {stats.upcomingThisWeek.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="calendar" className="gap-2">
              <Calendar className="w-4 h-4" />
              Kalendar
            </TabsTrigger>
            <TabsTrigger value="all" className="gap-2">
              <FileText className="w-4 h-4" />
              Sve
            </TabsTrigger>
          </TabsList>

          {/* Filters */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Pretrazi gosta, plovilo..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-64"
              />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Filter className="w-4 h-4 mr-2" />
                  {statusFilter === 'all' ? 'Status' : BOOKING_STATUS_COLORS[statusFilter].label}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setStatusFilter('all')}>
                  Svi statusi
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {Object.entries(BOOKING_STATUS_COLORS).map(([status, config]) => (
                  <DropdownMenuItem
                    key={status}
                    onClick={() => setStatusFilter(status as BookingStatus)}
                  >
                    <div
                      className="w-2 h-2 rounded-full mr-2"
                      style={{ backgroundColor: config.text }}
                    />
                    {config.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Today Tab */}
        <TabsContent value="today" className="mt-4">
          {filteredBookings.length === 0 ? (
            <Card className="p-8 text-center">
              <CalendarDays className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">Nema aktivnosti za danas</p>
            </Card>
          ) : (
            <BookingTable
              bookings={filteredBookings}
              onBookingClick={handleBookingClick}
              onStatusChange={handleStatusChange}
              sortField={sortField}
              sortOrder={sortOrder}
              onSort={toggleSort}
            />
          )}
        </TabsContent>

        {/* Upcoming Tab */}
        <TabsContent value="upcoming" className="mt-4">
          {filteredBookings.length === 0 ? (
            <Card className="p-8 text-center">
              <Clock className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">Nema nadolazecih rezervacija</p>
            </Card>
          ) : (
            <BookingTable
              bookings={filteredBookings}
              onBookingClick={handleBookingClick}
              onStatusChange={handleStatusChange}
              sortField={sortField}
              sortOrder={sortOrder}
              onSort={toggleSort}
            />
          )}
        </TabsContent>

        {/* Calendar Tab */}
        <TabsContent value="calendar" className="mt-4">
          <Card className="p-4">
            {transitBerths.length > 0 ? (
              <BookingTimeline
                berths={transitBerths}
                bookings={bookings.filter(b => !['cancelled', 'no_show'].includes(b.status))}
                currentMonth={calendarMonth}
                onMonthChange={setCalendarMonth}
                onBookingClick={handleBookingClick}
                onCellClick={(berthId, berthCode, date) => {
                  const nextDay = new Date(date);
                  nextDay.setDate(nextDay.getDate() + 1);
                  handleNewBooking(berthId, berthCode, date, nextDay.toISOString().split('T')[0]);
                }}
              />
            ) : (
              <p className="text-center text-muted-foreground py-8">
                Nema vezova za prikaz
              </p>
            )}
          </Card>
        </TabsContent>

        {/* All Bookings Tab */}
        <TabsContent value="all" className="mt-4">
          {filteredBookings.length === 0 ? (
            <Card className="p-8 text-center">
              <Ship className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">Nema rezervacija</p>
            </Card>
          ) : (
            <BookingTable
              bookings={filteredBookings}
              onBookingClick={handleBookingClick}
              onStatusChange={handleStatusChange}
              sortField={sortField}
              sortOrder={sortOrder}
              onSort={toggleSort}
            />
          )}
        </TabsContent>
      </Tabs>

      {/* Booking Details Sheet */}
      <Sheet open={showDetails} onOpenChange={setShowDetails}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          {selectedBooking && (
            <>
              <SheetHeader>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                    <Ship className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <SheetTitle>{selectedBooking.guestName}</SheetTitle>
                    <SheetDescription>
                      {selectedBooking.vesselName || 'Plovilo nije navedeno'}
                    </SheetDescription>
                  </div>
                </div>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                {/* Status badges */}
                <div className="flex gap-2">
                  <Badge
                    className="gap-1"
                    style={{
                      backgroundColor: BOOKING_STATUS_COLORS[selectedBooking.status].bg,
                      color: BOOKING_STATUS_COLORS[selectedBooking.status].text,
                    }}
                  >
                    <StatusIcon status={selectedBooking.status} />
                    {BOOKING_STATUS_COLORS[selectedBooking.status].label}
                  </Badge>
                  <Badge
                    style={{
                      backgroundColor: PAYMENT_STATUS_COLORS[selectedBooking.paymentStatus].bg,
                      color: PAYMENT_STATUS_COLORS[selectedBooking.paymentStatus].text,
                    }}
                  >
                    {PAYMENT_STATUS_COLORS[selectedBooking.paymentStatus].label}
                  </Badge>
                </div>

                {/* Quick actions */}
                <div className="flex gap-2 flex-wrap">
                  {selectedBooking.status === 'pending' && (
                    <Button
                      size="sm"
                      onClick={() => handleStatusChange(selectedBooking.id, 'confirmed')}
                    >
                      <CheckCircle2 className="w-4 h-4 mr-1" />
                      Potvrdi
                    </Button>
                  )}
                  {selectedBooking.status === 'confirmed' && (
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700"
                      onClick={() => handleStatusChange(selectedBooking.id, 'checked_in')}
                    >
                      <LogIn className="w-4 h-4 mr-1" />
                      Check-in
                    </Button>
                  )}
                  {selectedBooking.status === 'checked_in' && (
                    <Button
                      size="sm"
                      className="bg-orange-600 hover:bg-orange-700"
                      onClick={() => handleStatusChange(selectedBooking.id, 'checked_out')}
                    >
                      <LogOut className="w-4 h-4 mr-1" />
                      Check-out
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEditBooking(selectedBooking)}
                  >
                    <Edit className="w-4 h-4 mr-1" />
                    Uredi
                  </Button>
                  {['pending', 'confirmed'].includes(selectedBooking.status) && (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleStatusChange(selectedBooking.id, 'cancelled')}
                    >
                      <Ban className="w-4 h-4 mr-1" />
                      Otkazi
                    </Button>
                  )}
                </div>

                {/* Booking info */}
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Vez</p>
                      <p className="font-medium">{selectedBooking.berthCode}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Nocenja</p>
                      <p className="font-medium">{selectedBooking.totalNights}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Dolazak</p>
                      <p className="font-medium">{formatDate(selectedBooking.checkInDate)}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Odlazak</p>
                      <p className="font-medium">{formatDate(selectedBooking.checkOutDate)}</p>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <p className="text-sm font-medium mb-2">Kontakt</p>
                    <div className="space-y-2 text-sm">
                      {selectedBooking.guestPhone && (
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4 text-muted-foreground" />
                          <a href={`tel:${selectedBooking.guestPhone}`} className="hover:underline">
                            {selectedBooking.guestPhone}
                          </a>
                        </div>
                      )}
                      {selectedBooking.guestEmail && (
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-muted-foreground" />
                          <a href={`mailto:${selectedBooking.guestEmail}`} className="hover:underline">
                            {selectedBooking.guestEmail}
                          </a>
                        </div>
                      )}
                      {selectedBooking.guestCountry && (
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-muted-foreground" />
                          <span>{selectedBooking.guestCountry}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Vessel info */}
                  <div className="border-t pt-4">
                    <p className="text-sm font-medium mb-2">Plovilo</p>
                    <div className="space-y-2 text-sm">
                      {selectedBooking.vesselName && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Ime</span>
                          <span className="font-medium">{selectedBooking.vesselName}</span>
                        </div>
                      )}
                      {selectedBooking.vesselRegistration && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Registracija</span>
                          <span className="font-medium">{selectedBooking.vesselRegistration}</span>
                        </div>
                      )}
                      {selectedBooking.vesselLength && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Duzina</span>
                          <span className="font-medium">{selectedBooking.vesselLength}m</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Payment info */}
                  <div className="border-t pt-4">
                    <p className="text-sm font-medium mb-2">Placanje</p>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Osnovica</span>
                        <span>{formatCurrency(selectedBooking.subtotal)}</span>
                      </div>
                      {selectedBooking.discountAmount > 0 && (
                        <div className="flex justify-between text-green-600">
                          <span>Popust ({selectedBooking.discountPercent}%)</span>
                          <span>-{formatCurrency(selectedBooking.discountAmount)}</span>
                        </div>
                      )}
                      {selectedBooking.taxAmount > 0 && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">PDV ({selectedBooking.taxPercent}%)</span>
                          <span>{formatCurrency(selectedBooking.taxAmount)}</span>
                        </div>
                      )}
                      <div className="flex justify-between font-bold pt-2 border-t">
                        <span>Ukupno</span>
                        <span>{formatCurrency(selectedBooking.totalAmount)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Placeno</span>
                        <span className="text-green-600">{formatCurrency(selectedBooking.amountPaid)}</span>
                      </div>
                      {selectedBooking.amountPaid < selectedBooking.totalAmount && (
                        <div className="flex justify-between font-medium text-amber-600">
                          <span>Preostalo</span>
                          <span>{formatCurrency(selectedBooking.totalAmount - selectedBooking.amountPaid)}</span>
                        </div>
                      )}
                    </div>

                    {/* Quick payment button */}
                    {selectedBooking.paymentStatus !== 'paid' && (
                      <Button
                        className="w-full mt-4"
                        variant="outline"
                        onClick={() => {
                          const remaining = selectedBooking.totalAmount - selectedBooking.amountPaid;
                          handlePayment(selectedBooking.id, remaining);
                        }}
                      >
                        <CreditCard className="w-4 h-4 mr-2" />
                        Naplati {formatCurrency(selectedBooking.totalAmount - selectedBooking.amountPaid)}
                      </Button>
                    )}
                  </div>

                  {/* Notes */}
                  {selectedBooking.notes && (
                    <div className="border-t pt-4">
                      <p className="text-sm font-medium mb-2">Napomene</p>
                      <p className="text-sm text-muted-foreground">{selectedBooking.notes}</p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

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
                onStatusChange={editingBooking ? (status) => handleStatusChange(editingBooking.id, status) : undefined}
                onPaymentRecord={editingBooking ? (amount) => handlePayment(editingBooking.id, amount) : undefined}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Booking Table Component
interface BookingTableProps {
  bookings: Booking[];
  onBookingClick: (booking: Booking) => void;
  onStatusChange: (bookingId: string, status: BookingStatus) => void;
  sortField: SortField;
  sortOrder: SortOrder;
  onSort: (field: SortField) => void;
}

function BookingTable({
  bookings,
  onBookingClick,
  onStatusChange,
  sortField,
  sortOrder,
  onSort,
}: BookingTableProps) {
  const today = new Date().toISOString().split('T')[0];

  return (
    <Card>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => onSort('berthCode')}
            >
              <div className="flex items-center gap-1">
                Vez
                {sortField === 'berthCode' && (
                  <ArrowUpDown className="w-4 h-4" />
                )}
              </div>
            </TableHead>
            <TableHead
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => onSort('guestName')}
            >
              <div className="flex items-center gap-1">
                Gost / Plovilo
                {sortField === 'guestName' && (
                  <ArrowUpDown className="w-4 h-4" />
                )}
              </div>
            </TableHead>
            <TableHead
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => onSort('checkInDate')}
            >
              <div className="flex items-center gap-1">
                Datumi
                {sortField === 'checkInDate' && (
                  <ArrowUpDown className="w-4 h-4" />
                )}
              </div>
            </TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Placanje</TableHead>
            <TableHead
              className="text-right cursor-pointer hover:bg-muted/50"
              onClick={() => onSort('totalAmount')}
            >
              <div className="flex items-center justify-end gap-1">
                Iznos
                {sortField === 'totalAmount' && (
                  <ArrowUpDown className="w-4 h-4" />
                )}
              </div>
            </TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {bookings.map((booking) => (
            <TableRow
              key={booking.id}
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => onBookingClick(booking)}
            >
              <TableCell>
                <div className="font-medium">{booking.berthCode}</div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                    <Ship className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                  </div>
                  <div>
                    <p className="font-medium">{booking.guestName}</p>
                    <p className="text-xs text-muted-foreground">
                      {booking.vesselName || '-'} {booking.vesselRegistration && `• ${booking.vesselRegistration}`}
                    </p>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <div className="text-sm">
                  <div className="flex items-center gap-1">
                    {booking.checkInDate === today && (
                      <span className="w-2 h-2 rounded-full bg-green-500" />
                    )}
                    {formatDate(booking.checkInDate)}
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    {booking.checkOutDate === today && (
                      <span className="w-2 h-2 rounded-full bg-orange-500" />
                    )}
                    {formatDate(booking.checkOutDate)}
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <Badge
                  variant="outline"
                  className="gap-1"
                  style={{
                    backgroundColor: BOOKING_STATUS_COLORS[booking.status].bg,
                    color: BOOKING_STATUS_COLORS[booking.status].text,
                    borderColor: 'transparent',
                  }}
                >
                  <StatusIcon status={booking.status} />
                  {BOOKING_STATUS_COLORS[booking.status].label}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge
                  variant="outline"
                  style={{
                    backgroundColor: PAYMENT_STATUS_COLORS[booking.paymentStatus].bg,
                    color: PAYMENT_STATUS_COLORS[booking.paymentStatus].text,
                    borderColor: 'transparent',
                  }}
                >
                  {PAYMENT_STATUS_COLORS[booking.paymentStatus].label}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <div className="font-medium">{formatCurrency(booking.totalAmount)}</div>
                {booking.amountPaid > 0 && booking.amountPaid < booking.totalAmount && (
                  <div className="text-xs text-amber-600">
                    -{formatCurrency(booking.totalAmount - booking.amountPaid)}
                  </div>
                )}
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={(e) => {
                      e.stopPropagation();
                      onBookingClick(booking);
                    }}>
                      <Eye className="w-4 h-4 mr-2" />
                      Pogledaj
                    </DropdownMenuItem>
                    {booking.status === 'pending' && (
                      <DropdownMenuItem onClick={(e) => {
                        e.stopPropagation();
                        onStatusChange(booking.id, 'confirmed');
                      }}>
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        Potvrdi
                      </DropdownMenuItem>
                    )}
                    {booking.status === 'confirmed' && (
                      <DropdownMenuItem onClick={(e) => {
                        e.stopPropagation();
                        onStatusChange(booking.id, 'checked_in');
                      }}>
                        <LogIn className="w-4 h-4 mr-2" />
                        Check-in
                      </DropdownMenuItem>
                    )}
                    {booking.status === 'checked_in' && (
                      <DropdownMenuItem onClick={(e) => {
                        e.stopPropagation();
                        onStatusChange(booking.id, 'checked_out');
                      }}>
                        <LogOut className="w-4 h-4 mr-2" />
                        Check-out
                      </DropdownMenuItem>
                    )}
                    {['pending', 'confirmed'].includes(booking.status) && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            onStatusChange(booking.id, 'cancelled');
                          }}
                        >
                          <XCircle className="w-4 h-4 mr-2" />
                          Otkazi
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
