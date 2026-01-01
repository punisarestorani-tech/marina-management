'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Download,
  Calendar,
  Ship,
  Euro,
  TrendingUp,
  TrendingDown,
  Users,
  Clock,
  FileText,
  Printer,
} from 'lucide-react';
import { format, subDays, addDays, eachDayOfInterval, startOfMonth, endOfMonth } from 'date-fns';
import { hr } from 'date-fns/locale';
import {
  Booking,
  BOOKING_STATUS_COLORS,
  PAYMENT_STATUS_COLORS,
  formatDate,
  formatCurrency,
} from '@/types/booking.types';

// Demo booking data for reports
const DEMO_BOOKINGS: Booking[] = [
  {
    id: '1',
    berthId: 'b1',
    berthCode: 'A-01',
    checkInDate: '2026-01-02',
    checkOutDate: '2026-01-05',
    guestName: 'Marco Rossi',
    guestCountry: 'Italija',
    vesselName: 'Bella Mare',
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
    checkInDate: '2026-01-01',
    checkOutDate: '2026-01-04',
    guestName: 'Hans Mueller',
    guestCountry: 'Njemačka',
    vesselName: 'Seestern',
    status: 'checked_out',
    pricePerDay: 55,
    totalNights: 3,
    subtotal: 165,
    discountPercent: 0,
    discountAmount: 0,
    taxPercent: 13,
    taxAmount: 21.45,
    totalAmount: 186.45,
    paymentStatus: 'paid',
    amountPaid: 186.45,
    source: 'phone',
    createdAt: '2025-12-20T15:00:00Z',
    updatedAt: '2026-01-04T10:00:00Z',
  },
  {
    id: '3',
    berthId: 'b4',
    berthCode: 'B-01',
    checkInDate: '2026-01-01',
    checkOutDate: '2026-01-08',
    guestName: 'Jean Dupont',
    guestCountry: 'Francuska',
    vesselName: 'Liberté',
    status: 'checked_in',
    pricePerDay: 70,
    totalNights: 7,
    subtotal: 490,
    discountPercent: 10,
    discountAmount: 49,
    taxPercent: 13,
    taxAmount: 57.33,
    totalAmount: 498.33,
    paymentStatus: 'partial',
    amountPaid: 200,
    source: 'email',
    createdAt: '2025-12-28T09:00:00Z',
    updatedAt: '2026-01-01T12:00:00Z',
  },
  {
    id: '4',
    berthId: 'b3',
    berthCode: 'A-03',
    checkInDate: '2026-01-05',
    checkOutDate: '2026-01-10',
    guestName: 'John Smith',
    guestCountry: 'UK',
    vesselName: 'Sea Dream',
    status: 'confirmed',
    pricePerDay: 60,
    totalNights: 5,
    subtotal: 300,
    discountPercent: 0,
    discountAmount: 0,
    taxPercent: 13,
    taxAmount: 39,
    totalAmount: 339,
    paymentStatus: 'unpaid',
    amountPaid: 0,
    source: 'online',
    createdAt: '2025-12-30T11:00:00Z',
    updatedAt: '2025-12-30T11:00:00Z',
  },
];

// Generate daily occupancy data
const generateOccupancyData = () => {
  return eachDayOfInterval({
    start: subDays(new Date(), 6),
    end: new Date(),
  }).map((date) => ({
    date,
    occupied: Math.floor(Math.random() * 8) + 5,
    reserved: Math.floor(Math.random() * 3) + 1,
    free: Math.floor(Math.random() * 5) + 2,
    revenue: Math.floor(Math.random() * 500) + 200,
  }));
};

const DAILY_DATA = generateOccupancyData();

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState('daily');
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);

  // Calculate stats
  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];

    const todaysArrivals = DEMO_BOOKINGS.filter(
      (b) => b.checkInDate === today && ['confirmed', 'pending'].includes(b.status)
    );
    const todaysDepartures = DEMO_BOOKINGS.filter(
      (b) => b.checkOutDate === today && b.status === 'checked_in'
    );
    const currentGuests = DEMO_BOOKINGS.filter((b) => b.status === 'checked_in');
    const pendingPayments = DEMO_BOOKINGS.filter(
      (b) => b.paymentStatus !== 'paid' && !['cancelled', 'no_show'].includes(b.status)
    );

    const totalRevenue = DEMO_BOOKINGS
      .filter((b) => !['cancelled', 'no_show'].includes(b.status))
      .reduce((sum, b) => sum + b.totalAmount, 0);

    const collectedRevenue = DEMO_BOOKINGS
      .filter((b) => !['cancelled', 'no_show'].includes(b.status))
      .reduce((sum, b) => sum + b.amountPaid, 0);

    const outstandingAmount = totalRevenue - collectedRevenue;

    // Occupancy by country
    const byCountry = DEMO_BOOKINGS.reduce((acc, b) => {
      const country = b.guestCountry || 'Nepoznato';
      if (!acc[country]) acc[country] = { count: 0, revenue: 0 };
      acc[country].count++;
      acc[country].revenue += b.totalAmount;
      return acc;
    }, {} as Record<string, { count: number; revenue: number }>);

    // Revenue by berth
    const byBerth = DEMO_BOOKINGS.reduce((acc, b) => {
      if (!acc[b.berthCode]) acc[b.berthCode] = { bookings: 0, nights: 0, revenue: 0 };
      acc[b.berthCode].bookings++;
      acc[b.berthCode].nights += b.totalNights;
      acc[b.berthCode].revenue += b.totalAmount;
      return acc;
    }, {} as Record<string, { bookings: number; nights: number; revenue: number }>);

    return {
      todaysArrivals,
      todaysDepartures,
      currentGuests,
      pendingPayments,
      totalRevenue,
      collectedRevenue,
      outstandingAmount,
      byCountry,
      byBerth,
    };
  }, []);

  const todayData = DAILY_DATA[DAILY_DATA.length - 1];
  const yesterdayData = DAILY_DATA[DAILY_DATA.length - 2];
  const occupancyChange = todayData.occupied - yesterdayData.occupied;

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
          <Button variant="outline">
            <Printer className="mr-2 h-4 w-4" />
            Printaj
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
              prijavljeno
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
          <TabsTrigger value="guests">Gosti po zemljama</TabsTrigger>
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
                  Dolasci
                </CardTitle>
              </CardHeader>
              <CardContent>
                {stats.todaysArrivals.length > 0 ? (
                  <div className="space-y-3">
                    {stats.todaysArrivals.map((booking) => (
                      <div key={booking.id} className="flex items-center justify-between p-2 bg-green-50 dark:bg-green-900/20 rounded">
                        <div>
                          <p className="font-medium">{booking.guestName}</p>
                          <p className="text-sm text-muted-foreground">
                            {booking.vesselName} • {booking.berthCode}
                          </p>
                        </div>
                        <span
                          className="px-2 py-1 rounded text-xs"
                          style={{
                            backgroundColor: PAYMENT_STATUS_COLORS[booking.paymentStatus].bg,
                            color: PAYMENT_STATUS_COLORS[booking.paymentStatus].text,
                          }}
                        >
                          {PAYMENT_STATUS_COLORS[booking.paymentStatus].label}
                        </span>
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
                  Odlasci
                </CardTitle>
              </CardHeader>
              <CardContent>
                {stats.todaysDepartures.length > 0 ? (
                  <div className="space-y-3">
                    {stats.todaysDepartures.map((booking) => (
                      <div key={booking.id} className="flex items-center justify-between p-2 bg-red-50 dark:bg-red-900/20 rounded">
                        <div>
                          <p className="font-medium">{booking.guestName}</p>
                          <p className="text-sm text-muted-foreground">
                            {booking.vesselName} • {booking.berthCode}
                          </p>
                        </div>
                        <span
                          className="px-2 py-1 rounded text-xs"
                          style={{
                            backgroundColor: PAYMENT_STATUS_COLORS[booking.paymentStatus].bg,
                            color: PAYMENT_STATUS_COLORS[booking.paymentStatus].text,
                          }}
                        >
                          {PAYMENT_STATUS_COLORS[booking.paymentStatus].label}
                        </span>
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
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="px-3 py-2 text-left text-sm font-medium">Vez</th>
                      <th className="px-3 py-2 text-left text-sm font-medium">Gost</th>
                      <th className="px-3 py-2 text-left text-sm font-medium">Plovilo</th>
                      <th className="px-3 py-2 text-left text-sm font-medium">Država</th>
                      <th className="px-3 py-2 text-left text-sm font-medium">Odlazak</th>
                      <th className="px-3 py-2 text-right text-sm font-medium">Plaćanje</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {stats.currentGuests.map((booking) => (
                      <tr key={booking.id}>
                        <td className="px-3 py-2 font-medium">{booking.berthCode}</td>
                        <td className="px-3 py-2">{booking.guestName}</td>
                        <td className="px-3 py-2">{booking.vesselName}</td>
                        <td className="px-3 py-2">{booking.guestCountry}</td>
                        <td className="px-3 py-2">{formatDate(booking.checkOutDate)}</td>
                        <td className="px-3 py-2 text-right">
                          <span
                            className="px-2 py-1 rounded text-xs"
                            style={{
                              backgroundColor: PAYMENT_STATUS_COLORS[booking.paymentStatus].bg,
                              color: PAYMENT_STATUS_COLORS[booking.paymentStatus].text,
                            }}
                          >
                            {formatCurrency(booking.amountPaid)} / {formatCurrency(booking.totalAmount)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Occupancy */}
        <TabsContent value="occupancy" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Zauzetost po danima</CardTitle>
              <CardDescription>Zadnjih 7 dana</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {DAILY_DATA.map((day, index) => {
                  const total = day.occupied + day.reserved + day.free;
                  return (
                    <div key={index} className="flex items-center gap-4">
                      <div className="w-24 text-sm">
                        {format(day.date, 'EEE, dd.MM', { locale: hr })}
                      </div>
                      <div className="flex-1">
                        <div className="flex h-6 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-800">
                          <div
                            className="bg-green-500 flex items-center justify-center"
                            style={{ width: `${(day.occupied / total) * 100}%` }}
                          >
                            <span className="text-[10px] text-white font-medium">{day.occupied}</span>
                          </div>
                          <div
                            className="bg-yellow-500 flex items-center justify-center"
                            style={{ width: `${(day.reserved / total) * 100}%` }}
                          >
                            <span className="text-[10px] text-white font-medium">{day.reserved}</span>
                          </div>
                          <div
                            className="bg-gray-400 flex items-center justify-center"
                            style={{ width: `${(day.free / total) * 100}%` }}
                          >
                            <span className="text-[10px] text-white font-medium">{day.free}</span>
                          </div>
                        </div>
                      </div>
                      <div className="w-24 text-right text-sm">
                        {Math.round((day.occupied / total) * 100)}% zauzeto
                      </div>
                    </div>
                  );
                })}
              </div>

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
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(stats.byBerth)
                  .sort((a, b) => b[1].revenue - a[1].revenue)
                  .map(([berthCode, data]) => (
                    <div key={berthCode} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded">
                      <div>
                        <p className="font-medium">Vez {berthCode}</p>
                        <p className="text-sm text-muted-foreground">
                          {data.bookings} rezervacija • {data.nights} noćenja
                        </p>
                      </div>
                      <p className="font-bold">{formatCurrency(data.revenue)}</p>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>

          {/* Pending Payments */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Euro className="w-5 h-5 text-yellow-500" />
                Nenaplaćene rezervacije
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="px-3 py-2 text-left text-sm font-medium">Gost</th>
                      <th className="px-3 py-2 text-left text-sm font-medium">Vez</th>
                      <th className="px-3 py-2 text-left text-sm font-medium">Datum</th>
                      <th className="px-3 py-2 text-right text-sm font-medium">Ukupno</th>
                      <th className="px-3 py-2 text-right text-sm font-medium">Plaćeno</th>
                      <th className="px-3 py-2 text-right text-sm font-medium">Dug</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {stats.pendingPayments.map((booking) => (
                      <tr key={booking.id}>
                        <td className="px-3 py-2">{booking.guestName}</td>
                        <td className="px-3 py-2">{booking.berthCode}</td>
                        <td className="px-3 py-2 text-sm">
                          {formatDate(booking.checkInDate)} - {formatDate(booking.checkOutDate)}
                        </td>
                        <td className="px-3 py-2 text-right">{formatCurrency(booking.totalAmount)}</td>
                        <td className="px-3 py-2 text-right text-green-600">{formatCurrency(booking.amountPaid)}</td>
                        <td className="px-3 py-2 text-right font-bold text-red-600">
                          {formatCurrency(booking.totalAmount - booking.amountPaid)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Guests by Country */}
        <TabsContent value="guests" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Gosti po državama</CardTitle>
              <CardDescription>Distribucija gostiju i prihoda po zemlji porijekla</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(stats.byCountry)
                  .sort((a, b) => b[1].revenue - a[1].revenue)
                  .map(([country, data]) => {
                    const percentage = Math.round((data.revenue / stats.totalRevenue) * 100);
                    return (
                      <div key={country} className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{country}</span>
                          <span className="text-sm text-muted-foreground">
                            {data.count} gostiju • {formatCurrency(data.revenue)}
                          </span>
                        </div>
                        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-500 rounded-full"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
