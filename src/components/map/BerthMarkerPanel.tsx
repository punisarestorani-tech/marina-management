'use client';

import { useState, useEffect } from 'react';
import { X, Ship, Calendar, Droplets, Zap, Ruler, User, Phone, ChevronLeft, ChevronRight, Plus, Check, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BerthMarker } from '@/types/boat.types';
import { Booking, BOOKING_STATUS_COLORS, PAYMENT_STATUS_COLORS } from '@/types/booking.types';
import { getSupabaseClient } from '@/lib/supabase/client';
import { format, addDays, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, isSameDay, addMonths, subMonths } from 'date-fns';
import { hr } from 'date-fns/locale';

interface BerthMarkerPanelProps {
  marker: BerthMarker;
  onClose: () => void;
  onNewBooking?: (berthCode: string) => void;
}

interface BerthDetails {
  id: string;
  code: string;
  width: number | null;
  length: number | null;
  max_draft: number | null;
  daily_rate: number | null;
  has_water: boolean;
  has_electricity: boolean;
  max_vessel_length: number | null;
  max_vessel_width: number | null;
}

interface BookingData {
  id: string;
  berth_code: string;
  check_in_date: string;
  check_out_date: string;
  guest_name: string;
  guest_phone: string | null;
  guest_country: string | null;
  vessel_name: string | null;
  vessel_registration: string | null;
  status: string;
  payment_status: string;
  total_amount: number;
  amount_paid: number;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  free: { label: 'Slobodan', color: 'bg-green-500' },
  occupied: { label: 'Zauzet', color: 'bg-red-500' },
  reserved: { label: 'Rezervisan', color: 'bg-yellow-500' },
  maintenance: { label: 'Održavanje', color: 'bg-gray-400' },
};

export function BerthMarkerPanel({ marker, onClose, onNewBooking }: BerthMarkerPanelProps) {
  const [berthDetails, setBerthDetails] = useState<BerthDetails | null>(null);
  const [bookings, setBookings] = useState<BookingData[]>([]);
  const [currentBooking, setCurrentBooking] = useState<BookingData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Fetch berth details and bookings
  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      const supabase = getSupabaseClient();
      const today = new Date().toISOString().split('T')[0];

      try {
        // Fetch berth details
        const { data: berth } = await supabase
          .from('berths')
          .select('*')
          .eq('code', marker.code)
          .single();

        if (berth) {
          setBerthDetails(berth);
        }

        // Fetch bookings for this berth (current month + next 2 months)
        const startDate = startOfMonth(subMonths(new Date(), 1)).toISOString().split('T')[0];
        const endDate = endOfMonth(addMonths(new Date(), 2)).toISOString().split('T')[0];

        const { data: bookingsData } = await supabase
          .from('berth_bookings')
          .select('*')
          .eq('berth_code', marker.code)
          .gte('check_out_date', startDate)
          .lte('check_in_date', endDate)
          .not('status', 'in', '("cancelled","no_show")')
          .order('check_in_date', { ascending: true });

        if (bookingsData) {
          setBookings(bookingsData);

          // Find current booking
          const current = bookingsData.find((b) => {
            return b.check_in_date <= today && b.check_out_date > today &&
              ['checked_in', 'confirmed', 'pending'].includes(b.status);
          });
          setCurrentBooking(current || null);
        }
      } catch (error) {
        console.error('Error fetching berth data:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [marker.code]);

  // Get status badge
  const statusInfo = STATUS_LABELS[marker.status] || STATUS_LABELS.free;

  // Calendar helpers
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Get booking for a specific day
  const getBookingForDay = (date: Date): BookingData | null => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return bookings.find((b) => {
      return b.check_in_date <= dateStr && b.check_out_date > dateStr;
    }) || null;
  };

  // Get day status color
  const getDayColor = (date: Date): string => {
    const booking = getBookingForDay(date);
    if (!booking) return '';

    switch (booking.status) {
      case 'checked_in':
        return 'bg-red-500 text-white';
      case 'confirmed':
        return 'bg-yellow-500 text-white';
      case 'pending':
        return 'bg-yellow-300 text-black';
      default:
        return 'bg-gray-200';
    }
  };

  return (
    <Card className="absolute left-4 top-14 z-[1000] w-96 max-h-[calc(100vh-5rem)] overflow-hidden shadow-xl">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            Vez {marker.code}
            <Badge className={statusInfo.color}>{statusInfo.label}</Badge>
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="overflow-y-auto max-h-[calc(100vh-12rem)]">
        <Tabs defaultValue="details" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="details">Detalji</TabsTrigger>
            <TabsTrigger value="calendar">Kalendar</TabsTrigger>
          </TabsList>

          {/* Details Tab */}
          <TabsContent value="details" className="space-y-4 mt-4">
            {/* Current Booking */}
            {currentBooking && (
              <div className="rounded-lg bg-blue-50 dark:bg-blue-950 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                    {currentBooking.status === 'checked_in' ? 'Trenutni gost' : 'Rezervacija'}
                  </span>
                  <Badge style={{
                    backgroundColor: BOOKING_STATUS_COLORS[currentBooking.status as keyof typeof BOOKING_STATUS_COLORS]?.bg,
                    color: BOOKING_STATUS_COLORS[currentBooking.status as keyof typeof BOOKING_STATUS_COLORS]?.text,
                  }}>
                    {BOOKING_STATUS_COLORS[currentBooking.status as keyof typeof BOOKING_STATUS_COLORS]?.label || currentBooking.status}
                  </Badge>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">{currentBooking.guest_name}</span>
                  </div>
                  {currentBooking.guest_phone && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Phone className="w-3 h-3" />
                      <span>{currentBooking.guest_phone}</span>
                    </div>
                  )}
                  {currentBooking.vessel_name && (
                    <div className="flex items-center gap-2 text-sm">
                      <Ship className="w-3 h-3 text-muted-foreground" />
                      <span>{currentBooking.vessel_name}</span>
                      {currentBooking.vessel_registration && (
                        <span className="text-muted-foreground">({currentBooking.vessel_registration})</span>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 text-sm pt-1 border-t">
                  <Calendar className="w-3 h-3 text-muted-foreground" />
                  <span>
                    {format(new Date(currentBooking.check_in_date), 'dd.MM.')} - {format(new Date(currentBooking.check_out_date), 'dd.MM.yyyy')}
                  </span>
                </div>

                <div className="flex items-center justify-between text-sm pt-1">
                  <span>Plaćanje:</span>
                  <Badge style={{
                    backgroundColor: PAYMENT_STATUS_COLORS[currentBooking.payment_status as keyof typeof PAYMENT_STATUS_COLORS]?.bg,
                    color: PAYMENT_STATUS_COLORS[currentBooking.payment_status as keyof typeof PAYMENT_STATUS_COLORS]?.text,
                  }}>
                    {PAYMENT_STATUS_COLORS[currentBooking.payment_status as keyof typeof PAYMENT_STATUS_COLORS]?.label}
                    {currentBooking.payment_status === 'partial' && ` (${currentBooking.amount_paid}/${currentBooking.total_amount} EUR)`}
                  </Badge>
                </div>
              </div>
            )}

            {/* Berth Details */}
            {berthDetails ? (
              <div className="space-y-3">
                {/* Amenities */}
                <div className="flex items-center gap-4">
                  <div className={`flex items-center gap-1.5 ${berthDetails.has_water ? 'text-blue-500' : 'text-gray-300'}`}>
                    <Droplets className="w-5 h-5" />
                    <span className="text-sm">{berthDetails.has_water ? 'Voda' : 'Bez vode'}</span>
                  </div>
                  <div className={`flex items-center gap-1.5 ${berthDetails.has_electricity ? 'text-yellow-500' : 'text-gray-300'}`}>
                    <Zap className="w-5 h-5" />
                    <span className="text-sm">{berthDetails.has_electricity ? 'Struja' : 'Bez struje'}</span>
                  </div>
                </div>

                {/* Dimensions */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-lg bg-muted p-2">
                    <div className="text-muted-foreground text-xs">Dimenzije veza</div>
                    <div className="font-medium">
                      {berthDetails.length || '-'}m x {berthDetails.width || '-'}m
                    </div>
                  </div>
                  <div className="rounded-lg bg-muted p-2">
                    <div className="text-muted-foreground text-xs">Max plovilo</div>
                    <div className="font-medium">
                      {berthDetails.max_vessel_length || '-'}m x {berthDetails.max_vessel_width || '-'}m
                    </div>
                  </div>
                  <div className="rounded-lg bg-muted p-2">
                    <div className="text-muted-foreground text-xs">Max gaz</div>
                    <div className="font-medium">{berthDetails.max_draft || '-'}m</div>
                  </div>
                  <div className="rounded-lg bg-muted p-2">
                    <div className="text-muted-foreground text-xs">Cijena/dan</div>
                    <div className="font-medium">{berthDetails.daily_rate || '-'} EUR</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground text-center py-4">
                {isLoading ? 'Učitavam...' : 'Nema podataka o vezu u bazi'}
              </div>
            )}

            {/* New Booking Button */}
            {marker.status === 'free' && onNewBooking && (
              <Button className="w-full mt-4" onClick={() => onNewBooking(marker.code)}>
                <Plus className="w-4 h-4 mr-2" />
                Nova rezervacija
              </Button>
            )}
          </TabsContent>

          {/* Calendar Tab */}
          <TabsContent value="calendar" className="mt-4">
            {/* Month Navigation */}
            <div className="flex items-center justify-between mb-4">
              <Button variant="outline" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="font-medium">
                {format(currentMonth, 'LLLL yyyy', { locale: hr })}
              </span>
              <Button variant="outline" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1 text-center text-xs">
              {['Po', 'Ut', 'Sr', 'Če', 'Pe', 'Su', 'Ne'].map((day) => (
                <div key={day} className="py-1 font-medium text-muted-foreground">
                  {day}
                </div>
              ))}

              {/* Empty cells for days before month start */}
              {Array.from({ length: (monthStart.getDay() + 6) % 7 }).map((_, i) => (
                <div key={`empty-${i}`} className="py-1" />
              ))}

              {/* Calendar days */}
              {calendarDays.map((day) => {
                const booking = getBookingForDay(day);
                const dayColor = getDayColor(day);
                const isCurrentDay = isToday(day);

                return (
                  <div
                    key={day.toISOString()}
                    className={`
                      py-1 rounded text-xs cursor-default relative
                      ${dayColor}
                      ${isCurrentDay && !dayColor ? 'ring-2 ring-blue-500' : ''}
                      ${!dayColor ? 'hover:bg-muted' : ''}
                    `}
                    title={booking ? `${booking.guest_name} (${booking.status})` : 'Slobodno'}
                  >
                    {format(day, 'd')}
                    {booking && isSameDay(new Date(booking.check_in_date), day) && (
                      <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-400 rounded-full" title="Check-in" />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-3 mt-4 text-xs">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-red-500" />
                <span>Prijavljen</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-yellow-500" />
                <span>Potvrđeno</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-yellow-300" />
                <span>Na čekanju</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded ring-2 ring-blue-500" />
                <span>Danas</span>
              </div>
            </div>

            {/* Upcoming Bookings List */}
            {bookings.length > 0 && (
              <div className="mt-4 pt-4 border-t">
                <h4 className="text-sm font-medium mb-2">Nadolazeće rezervacije</h4>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {bookings
                    .filter((b) => b.check_in_date >= new Date().toISOString().split('T')[0])
                    .slice(0, 5)
                    .map((booking) => (
                      <div key={booking.id} className="text-xs p-2 rounded bg-muted">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{booking.guest_name}</span>
                          <Badge variant="outline" className="text-[10px]">
                            {BOOKING_STATUS_COLORS[booking.status as keyof typeof BOOKING_STATUS_COLORS]?.label || booking.status}
                          </Badge>
                        </div>
                        <div className="text-muted-foreground mt-1">
                          {format(new Date(booking.check_in_date), 'dd.MM.')} - {format(new Date(booking.check_out_date), 'dd.MM.yyyy')}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
