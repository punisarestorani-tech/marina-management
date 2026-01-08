'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  Search,
  CreditCard,
  Euro,
  AlertTriangle,
  CheckCircle,
  Clock,
  Loader2,
  RefreshCw,
  Banknote,
  Receipt,
  History,
  X,
  Anchor,
  Ship,
  User,
  Calendar,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { hasPermission } from '@/lib/auth/rbac';
import { getSupabaseClient } from '@/lib/supabase/client';

interface BookingPayment {
  id: string;
  berth_code: string;
  guest_name: string;
  vessel_name: string | null;
  vessel_registration: string | null;
  check_in_date: string;
  check_out_date: string;
  total_amount: number;
  amount_paid: number;
  payment_status: string;
  status: string;
}

interface PaymentRecord {
  id: string;
  booking_id: string;
  amount: number;
  payment_date: string;
  payment_method: string;
  reference_number: string | null;
  notes: string | null;
  created_at: string;
  recorded_by_name?: string;
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: 'Gotovina',
  card: 'Kartica',
  bank_transfer: 'Bankovni prijenos',
  online: 'Online',
  other: 'Ostalo',
};

export default function PaymentsPage() {
  const user = useAuthStore((state) => state.user);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [bookings, setBookings] = useState<BookingPayment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Payment dialog state
  const [selectedBooking, setSelectedBooking] = useState<BookingPayment | null>(null);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');

  // Payment history dialog
  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);
  const [paymentHistory, setPaymentHistory] = useState<PaymentRecord[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const canEdit = user && hasPermission(user.role, 'EDIT_PAYMENTS');

  // Load bookings
  const fetchBookings = async () => {
    setIsLoading(true);
    try {
      const supabase = getSupabaseClient();

      const { data, error } = await supabase
        .from('berth_bookings')
        .select('id, berth_code, guest_name, vessel_name, vessel_registration, check_in_date, check_out_date, total_amount, amount_paid, payment_status, status')
        .in('status', ['confirmed', 'checked_in', 'pending', 'checked_out'])
        .order('check_in_date', { ascending: false });

      if (error) {
        console.error('Error loading bookings:', error);
        return;
      }

      setBookings(data || []);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  // Load payment history for a booking
  const loadPaymentHistory = async (bookingId: string) => {
    setIsLoadingHistory(true);
    try {
      const supabase = getSupabaseClient();

      const { data, error } = await supabase
        .from('booking_payments')
        .select('id, booking_id, amount, payment_date, payment_method, reference_number, notes, created_at')
        .eq('booking_id', bookingId)
        .order('payment_date', { ascending: false });

      if (error) {
        console.error('Error loading payment history:', error);
        return;
      }

      setPaymentHistory(data || []);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // Filter bookings
  const filteredBookings = bookings.filter((booking) => {
    const matchesSearch =
      booking.berth_code.toLowerCase().includes(search.toLowerCase()) ||
      booking.guest_name.toLowerCase().includes(search.toLowerCase()) ||
      (booking.vessel_name && booking.vessel_name.toLowerCase().includes(search.toLowerCase())) ||
      (booking.vessel_registration && booking.vessel_registration.toLowerCase().includes(search.toLowerCase()));

    const matchesStatus =
      filterStatus === 'all' ||
      booking.payment_status === filterStatus;

    return matchesSearch && matchesStatus;
  });

  // Calculate totals
  const totalPaid = bookings.reduce((sum, b) => sum + (b.amount_paid || 0), 0);
  const totalUnpaid = bookings
    .filter((b) => b.payment_status === 'unpaid')
    .reduce((sum, b) => sum + (b.total_amount - (b.amount_paid || 0)), 0);
  const totalPartial = bookings
    .filter((b) => b.payment_status === 'partial')
    .reduce((sum, b) => sum + (b.total_amount - (b.amount_paid || 0)), 0);

  // Open payment dialog
  const openPaymentDialog = (booking: BookingPayment) => {
    setSelectedBooking(booking);
    const remaining = booking.total_amount - (booking.amount_paid || 0);
    setPaymentAmount(remaining.toFixed(2));
    setPaymentMethod('');
    setPaymentReference('');
    setPaymentNotes('');
    setIsPaymentDialogOpen(true);
  };

  // Open history dialog
  const openHistoryDialog = async (booking: BookingPayment) => {
    setSelectedBooking(booking);
    setIsHistoryDialogOpen(true);
    await loadPaymentHistory(booking.id);
  };

  // Save payment
  const handleSavePayment = async () => {
    if (!selectedBooking || !paymentAmount || !paymentMethod) {
      alert('Popunite sva obavezna polja!');
      return;
    }

    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      alert('Unesite validan iznos!');
      return;
    }

    setIsSaving(true);
    try {
      const supabase = getSupabaseClient();

      const { error } = await supabase.from('booking_payments').insert({
        booking_id: selectedBooking.id,
        amount: amount,
        payment_date: new Date().toISOString().split('T')[0],
        payment_method: paymentMethod,
        reference_number: paymentReference || null,
        notes: paymentNotes || null,
        recorded_by: user?.id,
      });

      if (error) {
        alert('Greška: ' + error.message);
        return;
      }

      // Refresh bookings
      await fetchBookings();
      setIsPaymentDialogOpen(false);
      setSelectedBooking(null);
    } catch (err) {
      alert('Greška: ' + (err as Error).message);
    } finally {
      setIsSaving(false);
    }
  };

  // Status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return (
          <Badge className="bg-green-500 gap-1">
            <CheckCircle className="h-3 w-3" />
            Plaćeno
          </Badge>
        );
      case 'partial':
        return (
          <Badge className="bg-yellow-500 gap-1">
            <Clock className="h-3 w-3" />
            Djelimično
          </Badge>
        );
      case 'unpaid':
        return (
          <Badge variant="destructive" className="gap-1">
            <AlertTriangle className="h-3 w-3" />
            Neplaćeno
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Plaćanja</h1>
          <p className="text-muted-foreground">
            Evidencija i praćenje uplata za rezervacije
          </p>
        </div>
        <Button variant="outline" onClick={fetchBookings} disabled={isLoading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          Osvježi
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              Ukupno naplaćeno
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {totalPaid.toLocaleString('hr-HR', { minimumFractionDigits: 2 })} EUR
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-500" />
              Djelimično plaćeno
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {totalPartial.toLocaleString('hr-HR', { minimumFractionDigits: 2 })} EUR
            </div>
            <p className="text-xs text-muted-foreground">preostalo za naplatu</p>
          </CardContent>
        </Card>
        <Card className="border-red-200 dark:border-red-900">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              Neplaćeno
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {totalUnpaid.toLocaleString('hr-HR', { minimumFractionDigits: 2 })} EUR
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Pretraži po vezu, gostu, plovilu..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status plaćanja" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Svi statusi</SelectItem>
                <SelectItem value="unpaid">Neplaćeno</SelectItem>
                <SelectItem value="partial">Djelimično</SelectItem>
                <SelectItem value="paid">Plaćeno</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Lista rezervacija</CardTitle>
          <CardDescription>
            Prikazano {filteredBookings.length} od {bookings.length} rezervacija
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : bookings.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Receipt className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p>Nema rezervacija za prikaz</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vez</TableHead>
                  <TableHead>Gost</TableHead>
                  <TableHead>Plovilo</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead className="text-right">Ukupno</TableHead>
                  <TableHead className="text-right">Plaćeno</TableHead>
                  <TableHead className="text-right">Preostalo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Akcije</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBookings.map((booking) => {
                  const remaining = booking.total_amount - (booking.amount_paid || 0);
                  return (
                    <TableRow key={booking.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Anchor className="h-4 w-4 text-blue-500" />
                          <span className="font-semibold">{booking.berth_code}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          {booking.guest_name}
                        </div>
                      </TableCell>
                      <TableCell>
                        {booking.vessel_name || booking.vessel_registration ? (
                          <div className="flex items-center gap-2">
                            <Ship className="h-4 w-4 text-muted-foreground" />
                            <div>
                              {booking.vessel_name && <p className="text-sm">{booking.vessel_name}</p>}
                              {booking.vessel_registration && (
                                <p className="text-xs text-muted-foreground font-mono">
                                  {booking.vessel_registration}
                                </p>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p>{new Date(booking.check_in_date).toLocaleDateString('hr-HR')}</p>
                          <p className="text-xs text-muted-foreground">
                            do {new Date(booking.check_out_date).toLocaleDateString('hr-HR')}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {booking.total_amount.toLocaleString('hr-HR', { minimumFractionDigits: 2 })} €
                      </TableCell>
                      <TableCell className="text-right text-green-600">
                        {(booking.amount_paid || 0).toLocaleString('hr-HR', { minimumFractionDigits: 2 })} €
                      </TableCell>
                      <TableCell className="text-right">
                        {remaining > 0 ? (
                          <span className="text-red-600 font-medium">
                            {remaining.toLocaleString('hr-HR', { minimumFractionDigits: 2 })} €
                          </span>
                        ) : (
                          <span className="text-muted-foreground">0.00 €</span>
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(booking.payment_status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openHistoryDialog(booking)}
                            title="Historija uplata"
                          >
                            <History className="h-4 w-4" />
                          </Button>
                          {canEdit && booking.payment_status !== 'paid' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openPaymentDialog(booking)}
                            >
                              <Banknote className="mr-1 h-4 w-4" />
                              Evidentiraj
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Payment Dialog */}
      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Banknote className="h-5 w-5 text-green-600" />
              Evidentiraj uplatu
            </DialogTitle>
            <DialogDescription>
              {selectedBooking && (
                <span>
                  Vez: <strong>{selectedBooking.berth_code}</strong> | Gost:{' '}
                  <strong>{selectedBooking.guest_name}</strong>
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          {selectedBooking && (
            <div className="space-y-4 py-4">
              {/* Booking summary */}
              <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-3 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Ukupan iznos:</span>
                  <span className="font-medium">
                    {selectedBooking.total_amount.toLocaleString('hr-HR', { minimumFractionDigits: 2 })} €
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Već plaćeno:</span>
                  <span className="text-green-600">
                    {(selectedBooking.amount_paid || 0).toLocaleString('hr-HR', { minimumFractionDigits: 2 })} €
                  </span>
                </div>
                <div className="flex justify-between text-sm border-t pt-2">
                  <span className="font-medium">Preostalo za uplatu:</span>
                  <span className="font-bold text-red-600">
                    {(selectedBooking.total_amount - (selectedBooking.amount_paid || 0)).toLocaleString('hr-HR', { minimumFractionDigits: 2 })} €
                  </span>
                </div>
              </div>

              {/* Payment form */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Iznos uplate (EUR) *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    placeholder="0.00"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Način plaćanja *</Label>
                  <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                    <SelectTrigger>
                      <SelectValue placeholder="Odaberi način plaćanja..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">
                        <span className="flex items-center gap-2">
                          <Banknote className="h-4 w-4" />
                          Gotovina
                        </span>
                      </SelectItem>
                      <SelectItem value="card">
                        <span className="flex items-center gap-2">
                          <CreditCard className="h-4 w-4" />
                          Kartica
                        </span>
                      </SelectItem>
                      <SelectItem value="bank_transfer">
                        <span className="flex items-center gap-2">
                          <Receipt className="h-4 w-4" />
                          Bankovni prijenos
                        </span>
                      </SelectItem>
                      <SelectItem value="online">Online plaćanje</SelectItem>
                      <SelectItem value="other">Ostalo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Referentni broj / Broj računa</Label>
                  <Input
                    value={paymentReference}
                    onChange={(e) => setPaymentReference(e.target.value)}
                    placeholder="npr. 2024-001234"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Napomena</Label>
                  <Textarea
                    value={paymentNotes}
                    onChange={(e) => setPaymentNotes(e.target.value)}
                    placeholder="Dodatne napomene..."
                    rows={2}
                  />
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPaymentDialogOpen(false)}>
              Odustani
            </Button>
            <Button onClick={handleSavePayment} disabled={isSaving || !paymentMethod}>
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-2" />
              )}
              Spremi uplatu
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* History Dialog */}
      <Dialog open={isHistoryDialogOpen} onOpenChange={setIsHistoryDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5 text-blue-600" />
              Historija uplata
            </DialogTitle>
            <DialogDescription>
              {selectedBooking && (
                <span>
                  Vez: <strong>{selectedBooking.berth_code}</strong> | Gost:{' '}
                  <strong>{selectedBooking.guest_name}</strong>
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          {selectedBooking && (
            <div className="space-y-4 py-4">
              {/* Summary */}
              <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-3 grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-xs text-muted-foreground">Ukupno</p>
                  <p className="font-bold">
                    {selectedBooking.total_amount.toLocaleString('hr-HR', { minimumFractionDigits: 2 })} €
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Plaćeno</p>
                  <p className="font-bold text-green-600">
                    {(selectedBooking.amount_paid || 0).toLocaleString('hr-HR', { minimumFractionDigits: 2 })} €
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Preostalo</p>
                  <p className="font-bold text-red-600">
                    {(selectedBooking.total_amount - (selectedBooking.amount_paid || 0)).toLocaleString('hr-HR', { minimumFractionDigits: 2 })} €
                  </p>
                </div>
              </div>

              {/* Payment history list */}
              {isLoadingHistory ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : paymentHistory.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Receipt className="h-10 w-10 mx-auto mb-2 opacity-50" />
                  <p>Nema evidentiranih uplata</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[300px] overflow-y-auto">
                  {paymentHistory.map((payment) => (
                    <div
                      key={payment.id}
                      className="border rounded-lg p-3 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className="bg-green-100 dark:bg-green-900/50 p-2 rounded-full">
                          <Banknote className="h-4 w-4 text-green-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-green-600">
                            +{payment.amount.toLocaleString('hr-HR', { minimumFractionDigits: 2 })} €
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {PAYMENT_METHOD_LABELS[payment.payment_method] || payment.payment_method}
                            {payment.reference_number && ` • ${payment.reference_number}`}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm">
                          {new Date(payment.payment_date).toLocaleDateString('hr-HR')}
                        </p>
                        {payment.notes && (
                          <p className="text-xs text-muted-foreground truncate max-w-[150px]">
                            {payment.notes}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsHistoryDialogOpen(false)}>
              Zatvori
            </Button>
            {canEdit && selectedBooking && selectedBooking.payment_status !== 'paid' && (
              <Button
                onClick={() => {
                  setIsHistoryDialogOpen(false);
                  openPaymentDialog(selectedBooking);
                }}
              >
                <Banknote className="h-4 w-4 mr-2" />
                Nova uplata
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
