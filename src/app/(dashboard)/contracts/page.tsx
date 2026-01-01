'use client';

import { useState } from 'react';
import Link from 'next/link';
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
import { Search, Plus, FileText, Calendar, Euro } from 'lucide-react';
import { format } from 'date-fns';
import { hr } from 'date-fns/locale';

// Mock data
const CONTRACTS = [
  {
    id: 'contract001',
    berth: 'A-01',
    vessel: 'HR-1234-AB',
    vesselName: 'Sunce',
    owner: 'Marko Marković',
    startDate: new Date('2025-01-01'),
    endDate: new Date('2025-12-31'),
    annualPrice: 18000,
    paymentSchedule: 'quarterly',
    status: 'active',
    paidAmount: 4500,
    totalDue: 18000,
  },
  {
    id: 'contract002',
    berth: 'A-02',
    vessel: 'HR-5678-CD',
    vesselName: 'Jadran',
    owner: 'Ivan Ivić',
    startDate: new Date('2025-01-01'),
    endDate: new Date('2025-12-31'),
    annualPrice: 21600,
    paymentSchedule: 'monthly',
    status: 'active',
    paidAmount: 5400,
    totalDue: 7200,
  },
  {
    id: 'contract003',
    berth: 'B-01',
    vessel: 'HR-3456-GH',
    vesselName: 'Dalmacija',
    owner: 'Ante Antić',
    startDate: new Date('2025-01-01'),
    endDate: new Date('2025-12-31'),
    annualPrice: 25200,
    paymentSchedule: 'quarterly',
    status: 'active',
    paidAmount: 6300,
    totalDue: 12600,
  },
  {
    id: 'contract004',
    berth: 'C-01',
    vessel: 'AT-6789-MN',
    vesselName: 'Donau',
    owner: 'Hans Mueller',
    startDate: new Date('2025-06-01'),
    endDate: new Date('2025-09-30'),
    annualPrice: 12000,
    paymentSchedule: 'upfront',
    status: 'active',
    paidAmount: 12000,
    totalDue: 12000,
  },
  {
    id: 'contract005',
    berth: 'C-02',
    vessel: 'DE-4567-QR',
    vesselName: 'Nordsee',
    owner: 'Klaus Schmidt',
    startDate: new Date('2025-01-01'),
    endDate: new Date('2025-12-31'),
    annualPrice: 43200,
    paymentSchedule: 'annual',
    status: 'active',
    paidAmount: 43200,
    totalDue: 43200,
  },
];

const PAYMENT_SCHEDULE_LABELS: Record<string, string> = {
  monthly: 'Mjesečno',
  quarterly: 'Kvartalno',
  annual: 'Godišnje',
  upfront: 'Unaprijed',
};

export default function ContractsPage() {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const filteredContracts = CONTRACTS.filter((contract) => {
    const matchesSearch =
      contract.berth.toLowerCase().includes(search.toLowerCase()) ||
      contract.vessel.toLowerCase().includes(search.toLowerCase()) ||
      contract.owner.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = filterStatus === 'all' || contract.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500">Aktivan</Badge>;
      case 'expired':
        return <Badge variant="secondary">Istekao</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Otkazan</Badge>;
      case 'draft':
        return <Badge variant="outline">Nacrt</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const totalRevenue = CONTRACTS.reduce((sum, c) => sum + c.annualPrice, 0);
  const totalPaid = CONTRACTS.reduce((sum, c) => sum + c.paidAmount, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Ugovori</h1>
          <p className="text-muted-foreground">
            Upravljanje ugovorima o zakupu vezova
          </p>
        </div>
        <Button asChild>
          <Link href="/contracts/new">
            <Plus className="mr-2 h-4 w-4" />
            Novi ugovor
          </Link>
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Ukupno ugovora</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{CONTRACTS.length}</div>
            <p className="text-xs text-muted-foreground">aktivnih ugovora</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Godišnji prihod</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-1">
              <Euro className="h-5 w-5" />
              {totalRevenue.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">planirani prihod</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Naplaćeno</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-1">
              <Euro className="h-5 w-5" />
              {totalPaid.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {Math.round((totalPaid / totalRevenue) * 100)}% od ukupnog
            </p>
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
                <SelectItem value="active">Aktivni</SelectItem>
                <SelectItem value="expired">Istekli</SelectItem>
                <SelectItem value="cancelled">Otkazani</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Lista ugovora</CardTitle>
          <CardDescription>
            Prikazano {filteredContracts.length} od {CONTRACTS.length} ugovora
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vez</TableHead>
                <TableHead>Plovilo</TableHead>
                <TableHead>Vlasnik</TableHead>
                <TableHead>Period</TableHead>
                <TableHead>Cijena</TableHead>
                <TableHead>Plaćanje</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Akcije</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredContracts.map((contract) => (
                <TableRow key={contract.id}>
                  <TableCell className="font-medium">{contract.berth}</TableCell>
                  <TableCell>
                    <div>
                      <p>{contract.vessel}</p>
                      <p className="text-xs text-muted-foreground">
                        {contract.vesselName}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>{contract.owner}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      {format(contract.startDate, 'dd.MM.yy', { locale: hr })} -{' '}
                      {format(contract.endDate, 'dd.MM.yy', { locale: hr })}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p>{contract.annualPrice.toLocaleString()} EUR</p>
                      <p className="text-xs text-muted-foreground">
                        {PAYMENT_SCHEDULE_LABELS[contract.paymentSchedule]}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="w-20">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span>{Math.round((contract.paidAmount / contract.totalDue) * 100)}%</span>
                      </div>
                      <div className="h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full">
                        <div
                          className="h-1.5 bg-green-500 rounded-full"
                          style={{
                            width: `${(contract.paidAmount / contract.totalDue) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(contract.status)}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/contracts/${contract.id}`}>
                        <FileText className="h-4 w-4" />
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
