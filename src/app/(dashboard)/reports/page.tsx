'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Download,
  Ship,
  Euro,
  Users,
  Clock,
  Loader2,
  RefreshCw,
  Anchor,
} from 'lucide-react';
import { format, subDays, eachDayOfInterval } from 'date-fns';
import { hr } from 'date-fns/locale';
import { getSupabaseClient } from '@/lib/supabase/client';

interface BookingData {
  id: string;
  berth_code: string;
  guest_name: string;
  guest_email: string | null;
  guest_phone: string | null;
  vessel_name: string | null;
  vessel_registration: string | null;
  check_in_date: string;
  check_out_date: string;
  total_amount: number;
  amount_paid: number;
  payment_status: string;
  status: string;
}

interface OccupancyData {
  date: string;
  occupied: number;
  reserved: number;
  free: number;
}

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState('daily');
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);
  const [bookings, setBookings] = useState<BookingData[]>([]);
  const [occupancyData, setOccupancyData] = useState<OccupancyData[]>([]);
  const [totalBerths, setTotalBerths] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch all data
  const fetchData = async () => {
    setIsLoading(true);
    try {
      const supabase = getSupabaseClient();

      // Fetch bookings
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('berth_bookings')
        .select('id, berth_code, guest_name, guest_email, guest_phone, vessel_name, vessel_registration, check_in_date, check_out_date, total_amount, amount_paid, payment_status, status')
        .in('status', ['confirmed', 'checked_in', 'pending', 'checked_out'])
        .order('check_in_date', { ascending: false });

      if (bookingsError) {
        console.error('Error loading bookings:', bookingsError);
      } else {
        setBookings(bookingsData || []);
      }

      // Fetch total berths count
      const { count: berthCount } = await supabase
        .from('berths')
        .select('id', { count: 'exact', head: true });

      setTotalBerths(berthCount || 0);

      // Fetch daily occupancy for last 7 days
      const last7Days = eachDayOfInterval({
        start: subDays(new Date(), 6),
        end: new Date(),
      });

      const occupancyResults: OccupancyData[] = [];

      for (const day of last7Days) {
        const dateStr = day.toISOString().split('T')[0];

        // Count occupied berths for this day
        const { data: dayOccupancy } = await supabase
          .from('daily_occupancy')
          .select('status')
          .eq('date', dateStr);

        const occupied = dayOccupancy?.filter(o => o.status === 'occupied').length || 0;
        const reserved = dayOccupancy?.filter(o => o.status === 'reserved').length || 0;
        const free = (berthCount || 0) - occupied - reserved;

        occupancyResults.push({
          date: dateStr,
          occupied,
          reserved,
          free: Math.max(0, free),
        });
      }

      setOccupancyData(occupancyResults);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Calculate stats from real data
  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];

    const todaysArrivals = bookings.filter(
      (b) => b.check_in_date === today && ['confirmed', 'pending'].includes(b.status)
    );
    const todaysDepartures = bookings.filter(
      (b) => b.check_out_date === today && b.status === 'checked_in'
    );
    const currentGuests = bookings.filter((b) => {
      const checkIn = b.check_in_date;
      const checkOut = b.check_out_date;
      return b.status === 'checked_in' ||
        (checkIn <= today && checkOut >= today && ['confirmed', 'checked_in'].includes(b.status));
    });
    const pendingPayments = bookings.filter(
      (b) => b.payment_status !== 'paid' && !['cancelled', 'no_show', 'checked_out'].includes(b.status)
    );

    const totalRevenue = bookings
      .filter((b) => !['cancelled', 'no_show'].includes(b.status))
      .reduce((sum, b) => sum + (b.total_amount || 0), 0);

    const collectedRevenue = bookings
      .filter((b) => !['cancelled', 'no_show'].includes(b.status))
      .reduce((sum, b) => sum + (b.amount_paid || 0), 0);

    const outstandingAmount = totalRevenue - collectedRevenue;

    // Revenue by berth
    const byBerth = bookings.reduce((acc, b) => {
      if (!acc[b.berth_code]) acc[b.berth_code] = { bookings: 0, revenue: 0, paid: 0 };
      acc[b.berth_code].bookings++;
      acc[b.berth_code].revenue += b.total_amount || 0;
      acc[b.berth_code].paid += b.amount_paid || 0;
      return acc;
    }, {} as Record<string, { bookings: number; revenue: number; paid: number }>);

    return {
      todaysArrivals,
      todaysDepartures,
      currentGuests,
      pendingPayments,
      totalRevenue,
      collectedRevenue,
      outstandingAmount,
      byBerth,
    };
  }, [bookings]);

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('hr-HR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' EUR';
  };

  const formatDate = (dateStr: string) => {
    return format(new Date(dateStr), 'dd.MM.yyyy', { locale: hr });
  };

  const getPaymentBadge = (status: string, paid: number, total: number) => {
    if (status === 'paid' || paid >= total) {
      return <span className="px-2 py-1 rounded text-xs bg-green-100 text-green-800">Plaćeno</span>;
    }
    if (status === 'partial' || paid > 0) {
      return <span className="px-2 py-1 rounded text-xs bg-yellow-100 text-yellow-800">Djelimično</span>;
    }
    return <span className="px-2 py-1 rounded text-xs bg-red-100 text-red-800">Neplaćeno</span>;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Izvještaji</h1>
          <p className="text-muted-foreground">
            Statistike i analize rezervacija marine
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchData} disabled={isLoading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Osvježi
          </Button>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Izvezi Excel
          </Button>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="w-4 h-4 text-green-500" />
              Danas dolazi
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.todaysArrivals.length}</div>
            <p className="text-xs text-muted-foreground">novih gostiju</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="w-4 h-4 text-red-500" />
              Danas odlazi
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.todaysDepartures.length}</div>
            <p className="text-xs text-muted-foreground">check-out</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Ship className="w-4 h-4 text-blue-500" />
              Trenutno gostiju
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.currentGuests.length}</div>
            <p className="text-xs text-muted-foreground">
              na vezovima
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Euro className="w-4 h-4 text-yellow-500" />
              Nenaplaćeno
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.outstandingAmount)}</div>
            <p className="text-xs text-muted-foreground">
              {stats.pendingPayments.length} rezervacija
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="daily">Dnevni izvještaj</TabsTrigger>
          <TabsTrigger value="occupancy">Zauzetost</TabsTrigger>
          <TabsTrigger value="revenue">Prihodi</TabsTrigger>
        </TabsList>

        {/* Daily Report */}
        <TabsContent value="daily" className="space-y-4">
          <div className="flex items-center gap-4 mb-4">
            <label className="text-sm font-medium">Datum:</label>
            <input
              type="date"
              value={reportDate}
              onChange={(e) => setReportDate(e.target.value)}
              className="px-3 py-2 border rounded-md"
            />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {/* Arrivals */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="w-5 h-5 text-green-500" />
                  Dolasci ({stats.todaysArrivals.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {stats.todaysArrivals.length > 0 ? (
                  <div className="space-y-3">
                    {stats.todaysArrivals.map((booking) => (
                      <div key={booking.id} className="flex items-center justify-between p-2 bg-green-50 dark:bg-green-900/20 rounded">
                        <div>
                          <p className="font-medium">{booking.guest_name}</p>
                          <p className="text-sm text-muted-foreground">
                            {booking.vessel_name || booking.vessel_registration || 'N/A'} • {booking.berth_code}
                          </p>
                        </div>
                        {getPaymentBadge(booking.payment_status, booking.amount_paid, booking.total_amount)}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-4">Nema dolazaka za danas</p>
                )}
              </CardContent>
            </Card>

            {/* Departures */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="w-5 h-5 text-red-500" />
                  Odlasci ({stats.todaysDepartures.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {stats.todaysDepartures.length > 0 ? (
                  <div className="space-y-3">
                    {stats.todaysDepartures.map((booking) => (
                      <div key={booking.id} className="flex items-center justify-between p-2 bg-red-50 dark:bg-red-900/20 rounded">
                        <div>
                          <p className="font-medium">{booking.guest_name}</p>
                          <p className="text-sm text-muted-foreground">
                            {booking.vessel_name || booking.vessel_registration || 'N/A'} • {booking.berth_code}
                          </p>
                        </div>
                        {getPaymentBadge(booking.payment_status, booking.amount_paid, booking.total_amount)}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-4">Nema odlazaka za danas</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Current Guests */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Ship className="w-5 h-5 text-blue-500" />
                Trenutno na vezu ({stats.currentGuests.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stats.currentGuests.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-800">
                      <tr>
                        <th className="px-3 py-2 text-left text-sm font-medium">Vez</th>
                        <th className="px-3 py-2 text-left text-sm font-medium">Gost</th>
                        <th className="px-3 py-2 text-left text-sm font-medium">Plovilo</th>
                        <th className="px-3 py-2 text-left text-sm font-medium">Dolazak</th>
                        <th className="px-3 py-2 text-left text-sm font-medium">Odlazak</th>
                        <th className="px-3 py-2 text-right text-sm font-medium">Plaćanje</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {stats.currentGuests
                        .sort((a, b) => {
                          const [aPontoon, aNum] = a.berth_code.split('-');
                          const [bPontoon, bNum] = b.berth_code.split('-');
                          if (aPontoon !== bPontoon) return aPontoon.localeCompare(bPontoon);
                          return parseInt(aNum) - parseInt(bNum);
                        })
                        .map((booking) => (
                          <tr key={booking.id}>
                            <td className="px-3 py-2">
                              <div className="flex items-center gap-2">
                                <Anchor className="h-4 w-4 text-blue-500" />
                                <span className="font-medium">{booking.berth_code}</span>
                              </div>
                            </td>
                            <td className="px-3 py-2">{booking.guest_name}</td>
                            <td className="px-3 py-2">{booking.vessel_name || booking.vessel_registration || '-'}</td>
                            <td className="px-3 py-2">{formatDate(booking.check_in_date)}</td>
                            <td className="px-3 py-2">{formatDate(booking.check_out_date)}</td>
                            <td className="px-3 py-2 text-right">
                              <div className="flex flex-col items-end gap-1">
                                {getPaymentBadge(booking.payment_status, booking.amount_paid, booking.total_amount)}
                                <span className="text-xs text-muted-foreground">
                                  {formatCurrency(booking.amount_paid)} / {formatCurrency(booking.total_amount)}
                                </span>
                              </div>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-4">Nema gostiju trenutno na vezovima</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Occupancy */}
        <TabsContent value="occupancy" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Zauzetost po danima</CardTitle>
              <CardDescription>Zadnjih 7 dana (ukupno {totalBerths} vezova)</CardDescription>
            </CardHeader>
            <CardContent>
              {occupancyData.length > 0 ? (
                <div className="space-y-4">
                  {occupancyData.map((day, index) => {
                    const total = day.occupied + day.reserved + day.free;
                    const occupancyPercent = total > 0 ? Math.round((day.occupied / total) * 100) : 0;
                    return (
                      <div key={index} className="flex items-center gap-4">
                        <div className="w-28 text-sm">
                          {format(new Date(day.date), 'EEE, dd.MM', { locale: hr })}
                        </div>
                        <div className="flex-1">
                          <div className="flex h-6 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-800">
                            {day.occupied > 0 && (
                              <div
                                className="bg-green-500 flex items-center justify-center"
                                style={{ width: `${total > 0 ? (day.occupied / total) * 100 : 0}%` }}
                              >
                                <span className="text-[10px] text-white font-medium">{day.occupied}</span>
                              </div>
                            )}
                            {day.reserved > 0 && (
                              <div
                                className="bg-yellow-500 flex items-center justify-center"
                                style={{ width: `${total > 0 ? (day.reserved / total) * 100 : 0}%` }}
                              >
                                <span className="text-[10px] text-white font-medium">{day.reserved}</span>
                              </div>
                            )}
                            {day.free > 0 && (
                              <div
                                className="bg-gray-400 flex items-center justify-center"
                                style={{ width: `${total > 0 ? (day.free / total) * 100 : 0}%` }}
                              >
                                <span className="text-[10px] text-white font-medium">{day.free}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="w-24 text-right text-sm">
                          {occupancyPercent}% zauzeto
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-4">Nema podataka o zauzetosti</p>
              )}

              <div className="flex items-center justify-center gap-6 mt-6 pt-4 border-t">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <span className="text-sm">Zauzeto</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <span className="text-sm">Rezervisano</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-gray-400" />
                  <span className="text-sm">Slobodno</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Revenue */}
        <TabsContent value="revenue" className="space-y-4">
          <div className="grid md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Ukupan prihod</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{formatCurrency(stats.totalRevenue)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Naplaćeno</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(stats.collectedRevenue)}</p>
                <p className="text-xs text-muted-foreground">
                  {stats.totalRevenue > 0 ? Math.round((stats.collectedRevenue / stats.totalRevenue) * 100) : 0}% od ukupnog
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Za naplatu</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-red-600">{formatCurrency(stats.outstandingAmount)}</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Prihod po vezu</CardTitle>
              <CardDescription>Sortirano po ukupnom prihodu</CardDescription>
            </CardHeader>
            <CardContent>
              {Object.keys(stats.byBerth).length > 0 ? (
                <div className="space-y-3">
                  {Object.entries(stats.byBerth)
                    .sort((a, b) => b[1].revenue - a[1].revenue)
                    .slice(0, 20) // Top 20
                    .map(([berthCode, data]) => (
                      <div key={berthCode} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded">
                        <div className="flex items-center gap-3">
                          <Anchor className="h-4 w-4 text-blue-500" />
                          <div>
                            <p className="font-medium">Vez {berthCode}</p>
                            <p className="text-sm text-muted-foreground">
                              {data.bookings} rezervacija
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">{formatCurrency(data.revenue)}</p>
                          <p className="text-sm text-green-600">{formatCurrency(data.paid)} plaćeno</p>
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-4">Nema podataka o prihodima</p>
              )}
            </CardContent>
          </Card>

          {/* Pending Payments */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Euro className="w-5 h-5 text-yellow-500" />
                Nenaplaćene rezervacije ({stats.pendingPayments.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stats.pendingPayments.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-800">
                      <tr>
                        <th className="px-3 py-2 text-left text-sm font-medium">Vez</th>
                        <th className="px-3 py-2 text-left text-sm font-medium">Gost</th>
                        <th className="px-3 py-2 text-left text-sm font-medium">Period</th>
                        <th className="px-3 py-2 text-right text-sm font-medium">Ukupno</th>
                        <th className="px-3 py-2 text-right text-sm font-medium">Plaćeno</th>
                        <th className="px-3 py-2 text-right text-sm font-medium">Dug</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {stats.pendingPayments
                        .sort((a, b) => (b.total_amount - b.amount_paid) - (a.total_amount - a.amount_paid))
                        .map((booking) => (
                          <tr key={booking.id}>
                            <td className="px-3 py-2 font-medium">{booking.berth_code}</td>
                            <td className="px-3 py-2">{booking.guest_name}</td>
                            <td className="px-3 py-2 text-sm">
                              {formatDate(booking.check_in_date)} - {formatDate(booking.check_out_date)}
                            </td>
                            <td className="px-3 py-2 text-right">{formatCurrency(booking.total_amount)}</td>
                            <td className="px-3 py-2 text-right text-green-600">{formatCurrency(booking.amount_paid)}</td>
                            <td className="px-3 py-2 text-right font-bold text-red-600">
                              {formatCurrency(booking.total_amount - booking.amount_paid)}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-4">Sve rezervacije su plaćene</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
