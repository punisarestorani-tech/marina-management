'use client';

import { useState, useEffect } from 'react';
import { X, Ship, Calendar, Droplets, Zap, Ruler, User, Phone, ChevronLeft, ChevronRight, Plus, Check, Clock, ClipboardCheck, AlertTriangle, CheckCircle, XCircle, HelpCircle, Loader2, Wrench, Camera } from 'lucide-react';
import { useViewModeStore } from '@/stores/viewModeStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useAuthStore } from '@/stores/authStore';
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
  const viewMode = useViewModeStore((state) => state.viewMode);
  const isMobileView = viewMode === 'mobile';
  const user = useAuthStore((state) => state.user);

  // Inspection state
  const [todayInspection, setTodayInspection] = useState<any>(null);
  const [isSavingInspection, setIsSavingInspection] = useState(false);
  const [inspectionSuccess, setInspectionSuccess] = useState(false);
  const [showIssueForm, setShowIssueForm] = useState(false);
  const [issueForm, setIssueForm] = useState({
    found_vessel_name: '',
    found_vessel_registration: '',
    notes: '',
  });

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

  // Fetch today's inspection for this berth
  useEffect(() => {
    async function fetchTodayInspection() {
      const supabase = getSupabaseClient();
      const today = new Date().toISOString().split('T')[0];

      const { data } = await supabase
        .from('inspections')
        .select('*')
        .eq('berth_code', marker.code)
        .gte('inspected_at', today)
        .order('inspected_at', { ascending: false })
        .limit(1)
        .single();

      if (data) {
        setTodayInspection(data);
      }
    }
    fetchTodayInspection();
  }, [marker.code]);

  // Save inspection
  const handleInspection = async (status: string) => {
    setIsSavingInspection(true);
    setInspectionSuccess(false);

    try {
      const supabase = getSupabaseClient();

      const inspectionData = {
        berth_code: marker.code,
        berth_id: berthDetails?.id || null,
        inspector_id: user?.id,
        inspector_name: user?.full_name,
        status: status,
        expected_vessel_name: currentBooking?.vessel_name || null,
        expected_vessel_registration: currentBooking?.vessel_registration || null,
        found_vessel_name: issueForm.found_vessel_name || null,
        found_vessel_registration: issueForm.found_vessel_registration || null,
        notes: issueForm.notes || null,
      };

      const { data, error } = await supabase
        .from('inspections')
        .insert(inspectionData)
        .select()
        .single();

      if (error) {
        alert('Greška: ' + error.message);
        return;
      }

      setTodayInspection(data);
      setInspectionSuccess(true);
      setShowIssueForm(false);
      setIssueForm({ found_vessel_name: '', found_vessel_registration: '', notes: '' });

      // Auto-create violation if issue found
      if (['wrong_vessel', 'illegal_mooring'].includes(status)) {
        await supabase.from('violations').insert({
          inspection_id: data.id,
          berth_code: marker.code,
          violation_type: status === 'illegal_mooring' ? 'illegal_mooring' : 'wrong_berth',
          vessel_name: issueForm.found_vessel_name || null,
          vessel_registration: issueForm.found_vessel_registration || null,
          description: issueForm.notes || `Pronađeno prilikom inspekcije veza ${marker.code}`,
          reported_by: user?.id,
          reported_by_name: user?.full_name,
        });
      }

      // Hide success after 3 seconds
      setTimeout(() => setInspectionSuccess(false), 3000);
    } catch (err) {
      alert('Greška: ' + (err as Error).message);
    } finally {
      setIsSavingInspection(false);
    }
  };

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
    <Card className={`
      absolute z-[1001] overflow-hidden shadow-xl
      ${isMobileView
        ? 'left-0 right-0 bottom-0 w-full rounded-b-none max-h-[70vh]'
        : 'left-4 top-14 w-96 max-h-[calc(100vh-5rem)]'
      }
    `}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className={`flex items-center gap-2 ${isMobileView ? 'text-base' : 'text-lg'}`}>
            Vez {marker.code}
            <Badge className={statusInfo.color}>{statusInfo.label}</Badge>
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className={`overflow-y-auto ${isMobileView ? 'max-h-[calc(70vh-4rem)] pb-6' : 'max-h-[calc(100vh-12rem)]'}`}>
        <Tabs defaultValue="inspection" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="inspection" className="text-xs sm:text-sm">
              <ClipboardCheck className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
              Inspekcija
            </TabsTrigger>
            <TabsTrigger value="details" className="text-xs sm:text-sm">Detalji</TabsTrigger>
            <TabsTrigger value="calendar" className="text-xs sm:text-sm">Kalendar</TabsTrigger>
          </TabsList>

          {/* Inspection Tab */}
          <TabsContent value="inspection" className="space-y-4 mt-0">
            {/* Already inspected today */}
            {todayInspection && !inspectionSuccess ? (
              <div className="rounded-lg bg-green-50 dark:bg-green-950 p-4 text-center">
                <CheckCircle className="w-10 h-10 text-green-500 mx-auto mb-2" />
                <p className="font-medium text-green-700 dark:text-green-300">
                  Već pregledano danas
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Status: {todayInspection.status === 'correct' ? '✅ Ispravno' :
                    todayInspection.status === 'empty_ok' ? '✅ Prazan - OK' :
                    todayInspection.status === 'wrong_vessel' ? '⚠️ Pogrešan brod' :
                    todayInspection.status === 'illegal_mooring' ? '🚨 Nelegalno' :
                    todayInspection.status === 'missing_vessel' ? '❓ Brod nije na vezu' : todayInspection.status}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => setTodayInspection(null)}
                >
                  Ponovi inspekciju
                </Button>
              </div>
            ) : inspectionSuccess ? (
              <div className="rounded-lg bg-green-50 dark:bg-green-950 p-4 text-center">
                <CheckCircle className="w-10 h-10 text-green-500 mx-auto mb-2" />
                <p className="font-medium text-green-700 dark:text-green-300">
                  Inspekcija sačuvana!
                </p>
              </div>
            ) : (
              <>
                {/* Expected vessel info */}
                {currentBooking ? (
                  <div className="rounded-lg bg-blue-50 dark:bg-blue-950 p-3">
                    <p className="text-xs text-blue-600 dark:text-blue-400 font-medium mb-1">
                      OČEKIVANO PLOVILO:
                    </p>
                    <div className="flex items-center gap-2">
                      <Ship className="w-5 h-5 text-blue-600" />
                      <div>
                        <p className="font-bold">{currentBooking.vessel_name || 'Nepoznato ime'}</p>
                        {currentBooking.vessel_registration && (
                          <p className="text-sm text-muted-foreground">{currentBooking.vessel_registration}</p>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Gost: {currentBooking.guest_name}
                    </p>
                  </div>
                ) : (
                  <div className="rounded-lg bg-gray-100 dark:bg-gray-800 p-3 text-center">
                    <p className="text-sm text-muted-foreground">
                      Nema aktivne rezervacije - vez bi trebao biti prazan
                    </p>
                  </div>
                )}

                {/* Quick inspection buttons */}
                {!showIssueForm ? (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-center mb-3">Šta ste pronašli?</p>

                    {currentBooking ? (
                      <>
                        {/* Occupied berth options */}
                        <Button
                          className="w-full h-14 text-left justify-start bg-green-500 hover:bg-green-600"
                          onClick={() => handleInspection('correct')}
                          disabled={isSavingInspection}
                        >
                          <CheckCircle className="w-6 h-6 mr-3" />
                          <div>
                            <p className="font-medium">Ispravan brod</p>
                            <p className="text-xs opacity-80">Očekivano plovilo je na vezu</p>
                          </div>
                        </Button>

                        <Button
                          className="w-full h-14 text-left justify-start bg-orange-500 hover:bg-orange-600"
                          onClick={() => setShowIssueForm(true)}
                          disabled={isSavingInspection}
                        >
                          <AlertTriangle className="w-6 h-6 mr-3" />
                          <div>
                            <p className="font-medium">Pogrešan brod</p>
                            <p className="text-xs opacity-80">Drugo plovilo na vezu</p>
                          </div>
                        </Button>

                        <Button
                          className="w-full h-14 text-left justify-start bg-yellow-500 hover:bg-yellow-600 text-black"
                          onClick={() => handleInspection('missing_vessel')}
                          disabled={isSavingInspection}
                        >
                          <HelpCircle className="w-6 h-6 mr-3" />
                          <div>
                            <p className="font-medium">Brod nije na vezu</p>
                            <p className="text-xs opacity-80">Vez prazan, a ne bi trebao biti</p>
                          </div>
                        </Button>
                      </>
                    ) : (
                      <>
                        {/* Free berth options */}
                        <Button
                          className="w-full h-14 text-left justify-start bg-green-500 hover:bg-green-600"
                          onClick={() => handleInspection('empty_ok')}
                          disabled={isSavingInspection}
                        >
                          <CheckCircle className="w-6 h-6 mr-3" />
                          <div>
                            <p className="font-medium">Prazan - OK</p>
                            <p className="text-xs opacity-80">Vez je slobodan kako treba</p>
                          </div>
                        </Button>

                        <Button
                          className="w-full h-14 text-left justify-start bg-red-500 hover:bg-red-600"
                          onClick={() => setShowIssueForm(true)}
                          disabled={isSavingInspection}
                        >
                          <XCircle className="w-6 h-6 mr-3" />
                          <div>
                            <p className="font-medium">Nelegalno vezivanje</p>
                            <p className="text-xs opacity-80">Neovlašteno plovilo na vezu</p>
                          </div>
                        </Button>
                      </>
                    )}

                    {isSavingInspection && (
                      <div className="flex items-center justify-center py-2">
                        <Loader2 className="w-5 h-5 animate-spin mr-2" />
                        <span className="text-sm">Čuvam...</span>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Issue reporting form */
                  <div className="space-y-3 p-3 bg-orange-50 dark:bg-orange-950 rounded-lg">
                    <p className="text-sm font-medium text-orange-700 dark:text-orange-300">
                      Opišite pronađeno plovilo:
                    </p>

                    <div>
                      <Label className="text-xs">Ime plovila</Label>
                      <Input
                        value={issueForm.found_vessel_name}
                        onChange={(e) => setIssueForm({ ...issueForm, found_vessel_name: e.target.value })}
                        placeholder="npr. Sea Dream"
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label className="text-xs">Registracija</Label>
                      <Input
                        value={issueForm.found_vessel_registration}
                        onChange={(e) => setIssueForm({ ...issueForm, found_vessel_registration: e.target.value })}
                        placeholder="npr. KO-123-AB"
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label className="text-xs">Napomena</Label>
                      <Textarea
                        value={issueForm.notes}
                        onChange={(e) => setIssueForm({ ...issueForm, notes: e.target.value })}
                        placeholder="Dodatne informacije..."
                        rows={2}
                        className="mt-1"
                      />
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => setShowIssueForm(false)}
                      >
                        Nazad
                      </Button>
                      <Button
                        className="flex-1 bg-red-500 hover:bg-red-600"
                        onClick={() => handleInspection(currentBooking ? 'wrong_vessel' : 'illegal_mooring')}
                        disabled={isSavingInspection}
                      >
                        {isSavingInspection ? (
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 mr-2" />
                        )}
                        Prijavi
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </TabsContent>

          {/* Details Tab */}
          <TabsContent value="details" className="space-y-4 mt-0">
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
                <div className={`flex gap-4 ${isMobileView ? 'flex-col gap-2' : 'items-center'}`}>
                  <div className={`flex items-center gap-1.5 ${berthDetails.has_water ? 'text-blue-500' : 'text-gray-300'}`}>
                    <Droplets className="w-5 h-5 flex-shrink-0" />
                    <span className="text-sm">{berthDetails.has_water ? 'Voda' : 'Bez vode'}</span>
                  </div>
                  <div className={`flex items-center gap-1.5 ${berthDetails.has_electricity ? 'text-yellow-500' : 'text-gray-300'}`}>
                    <Zap className="w-5 h-5 flex-shrink-0" />
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
          <TabsContent value="calendar" className="mt-0">
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
