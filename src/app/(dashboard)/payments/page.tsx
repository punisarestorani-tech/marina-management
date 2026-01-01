'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { Search, CreditCard, Euro, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { hasPermission } from '@/lib/auth/rbac';
import { format, isPast, isToday } from 'date-fns';
import { hr } from 'date-fns/locale';

// Mock data
const PAYMENTS = [
  { id: 'p001', contractId: 'contract001', berth: 'A-01', vessel: 'HR-1234-AB', owner: 'Marko Marković', amount: 4500, dueDate: new Date('2025-01-15'), paidDate: new Date('2025-01-14'), status: 'paid', method: 'bank_transfer' },
  { id: 'p002', contractId: 'contract001', berth: 'A-01', vessel: 'HR-1234-AB', owner: 'Marko Marković', amount: 4500, dueDate: new Date('2025-04-15'), paidDate: null, status: 'pending', method: null },
  { id: 'p003', contractId: 'contract002', berth: 'A-02', vessel: 'HR-5678-CD', owner: 'Ivan Ivić', amount: 1800, dueDate: new Date('2025-01-01'), paidDate: new Date('2025-01-02'), status: 'paid', method: 'cash' },
  { id: 'p004', contractId: 'contract002', berth: 'A-02', vessel: 'HR-5678-CD', owner: 'Ivan Ivić', amount: 1800, dueDate: new Date('2025-02-01'), paidDate: new Date('2025-02-03'), status: 'paid', method: 'cash' },
  { id: 'p005', contractId: 'contract002', berth: 'A-02', vessel: 'HR-5678-CD', owner: 'Ivan Ivić', amount: 1800, dueDate: new Date('2025-03-01'), paidDate: new Date('2025-03-01'), status: 'paid', method: 'bank_transfer' },
  { id: 'p006', contractId: 'contract002', berth: 'A-02', vessel: 'HR-5678-CD', owner: 'Ivan Ivić', amount: 1800, dueDate: new Date('2024-12-01'), paidDate: null, status: 'overdue', method: null },
  { id: 'p007', contractId: 'contract003', berth: 'B-01', vessel: 'HR-3456-GH', owner: 'Ante Antić', amount: 6300, dueDate: new Date('2025-01-15'), paidDate: new Date('2025-01-10'), status: 'paid', method: 'bank_transfer' },
  { id: 'p008', contractId: 'contract003', berth: 'B-01', vessel: 'HR-3456-GH', owner: 'Ante Antić', amount: 6300, dueDate: new Date('2025-04-15'), paidDate: null, status: 'pending', method: null },
];

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  bank_transfer: 'Bankovni prijenos',
  cash: 'Gotovina',
  card: 'Kartica',
};

export default function PaymentsPage() {
  const user = useAuthStore((state) => state.user);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const canEdit = user && hasPermission(user.role, 'EDIT_PAYMENTS');

  const filteredPayments = PAYMENTS.filter((payment) => {
    const matchesSearch =
      payment.berth.toLowerCase().includes(search.toLowerCase()) ||
      payment.vessel.toLowerCase().includes(search.toLowerCase()) ||
      payment.owner.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = filterStatus === 'all' || payment.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return (
          <Badge className="bg-green-500 gap-1">
            <CheckCircle className="h-3 w-3" />
            Plaćeno
          </Badge>
        );
      case 'pending':
        return (
          <Badge variant="secondary" className="gap-1">
            <Clock className="h-3 w-3" />
            Na čekanju
          </Badge>
        );
      case 'overdue':
        return (
          <Badge variant="destructive" className="gap-1">
            <AlertTriangle className="h-3 w-3" />
            Dospjelo
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const totalPending = PAYMENTS.filter((p) => p.status === 'pending').reduce(
    (sum, p) => sum + p.amount,
    0
  );
  const totalOverdue = PAYMENTS.filter((p) => p.status === 'overdue').reduce(
    (sum, p) => sum + p.amount,
    0
  );
  const totalPaid = PAYMENTS.filter((p) => p.status === 'paid').reduce(
    (sum, p) => sum + p.amount,
    0
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Plaćanja</h1>
          <p className="text-muted-foreground">
            Pregled i evidencija uplata
          </p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              Naplaćeno
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {totalPaid.toLocaleString()} EUR
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4 text-slate-500" />
              Na čekanju
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalPending.toLocaleString()} EUR
            </div>
          </CardContent>
        </Card>
        <Card className="border-red-200 dark:border-red-900">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              Dospjelo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {totalOverdue.toLocaleString()} EUR
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
                placeholder="Pretraži po vezu, plovilu ili vlasniku..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Svi statusi</SelectItem>
                <SelectItem value="pending">Na čekanju</SelectItem>
                <SelectItem value="paid">Plaćeno</SelectItem>
                <SelectItem value="overdue">Dospjelo</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Lista plaćanja</CardTitle>
          <CardDescription>
            Prikazano {filteredPayments.length} od {PAYMENTS.length} plaćanja
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vez</TableHead>
                <TableHead>Plovilo</TableHead>
                <TableHead>Vlasnik</TableHead>
                <TableHead>Iznos</TableHead>
                <TableHead>Dospijeće</TableHead>
                <TableHead>Datum uplate</TableHead>
                <TableHead>Status</TableHead>
                {canEdit && <TableHead className="text-right">Akcije</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPayments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell className="font-medium">{payment.berth}</TableCell>
                  <TableCell>{payment.vessel}</TableCell>
                  <TableCell>{payment.owner}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Euro className="h-4 w-4 text-muted-foreground" />
                      {payment.amount.toLocaleString()}
                    </div>
                  </TableCell>
                  <TableCell>
                    {format(payment.dueDate, 'dd.MM.yyyy', { locale: hr })}
                  </TableCell>
                  <TableCell>
                    {payment.paidDate ? (
                      <div>
                        <p>{format(payment.paidDate, 'dd.MM.yyyy', { locale: hr })}</p>
                        {payment.method && (
                          <p className="text-xs text-muted-foreground">
                            {PAYMENT_METHOD_LABELS[payment.method] || payment.method}
                          </p>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>{getStatusBadge(payment.status)}</TableCell>
                  {canEdit && (
                    <TableCell className="text-right">
                      {(payment.status === 'pending' || payment.status === 'overdue') && (
                        <Button variant="outline" size="sm">
                          <CreditCard className="mr-1 h-4 w-4" />
                          Evidentiraj
                        </Button>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
