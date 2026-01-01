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
import { Search, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { hasPermission } from '@/lib/auth/rbac';
import { format } from 'date-fns';
import { hr } from 'date-fns/locale';

// Mock data
const VIOLATIONS = [
  {
    id: 'v001',
    berth: 'A-06',
    vessel: 'HR-8901-ST',
    type: 'no_contract',
    description: 'Plovilo na vezu bez aktivnog ugovora',
    detectedDate: new Date('2024-12-29'),
    status: 'open',
  },
  {
    id: 'v002',
    berth: 'B-04',
    vessel: 'FR-2345-UV',
    type: 'unpaid_occupancy',
    description: 'Neplaćena dnevna naknada za 3 dana',
    detectedDate: new Date('2024-12-30'),
    status: 'open',
  },
  {
    id: 'v003',
    berth: 'A-07',
    vessel: 'HR-6789-WX',
    type: 'size_violation',
    description: 'Plovilo preširoko za vez (4.2m umjesto max 3.5m)',
    detectedDate: new Date('2024-12-26'),
    resolvedDate: new Date('2024-12-27'),
    status: 'resolved',
  },
  {
    id: 'v004',
    berth: 'C-05',
    vessel: 'GB-0123-YZ',
    type: 'overstay',
    description: 'Isteklo odobrenje za boravak',
    detectedDate: new Date('2024-12-20'),
    status: 'dismissed',
  },
];

const VIOLATION_TYPE_LABELS: Record<string, string> = {
  unpaid_occupancy: 'Neplaćena naknada',
  no_contract: 'Bez ugovora',
  overstay: 'Prekoračen boravak',
  size_violation: 'Neprimjerena veličina',
  other: 'Ostalo',
};

export default function ViolationsPage() {
  const user = useAuthStore((state) => state.user);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const canEdit = user && hasPermission(user.role, 'EDIT_VIOLATIONS');

  const filteredViolations = VIOLATIONS.filter((violation) => {
    const matchesSearch =
      violation.berth.toLowerCase().includes(search.toLowerCase()) ||
      violation.vessel?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = filterStatus === 'all' || violation.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return (
          <Badge variant="destructive" className="gap-1">
            <AlertTriangle className="h-3 w-3" />
            Otvoren
          </Badge>
        );
      case 'resolved':
        return (
          <Badge className="bg-green-500 gap-1">
            <CheckCircle className="h-3 w-3" />
            Riješen
          </Badge>
        );
      case 'dismissed':
        return (
          <Badge variant="secondary" className="gap-1">
            <XCircle className="h-3 w-3" />
            Odbačen
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const openCount = VIOLATIONS.filter((v) => v.status === 'open').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Prekršaji</h1>
          <p className="text-muted-foreground">
            Evidencija prekršaja i nepravilnosti
          </p>
        </div>
        {openCount > 0 && (
          <div className="flex items-center gap-2 bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 px-4 py-2 rounded-lg">
            <AlertTriangle className="h-5 w-5" />
            <span className="font-medium">{openCount} otvorenih slučajeva</span>
          </div>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Pretraži po vezu ili plovilu..."
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
                <SelectItem value="open">Otvoreni</SelectItem>
                <SelectItem value="resolved">Riješeni</SelectItem>
                <SelectItem value="dismissed">Odbačeni</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Lista prekršaja</CardTitle>
          <CardDescription>
            Prikazano {filteredViolations.length} od {VIOLATIONS.length} slučajeva
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vez</TableHead>
                <TableHead>Plovilo</TableHead>
                <TableHead>Tip</TableHead>
                <TableHead>Opis</TableHead>
                <TableHead>Datum</TableHead>
                <TableHead>Status</TableHead>
                {canEdit && <TableHead className="text-right">Akcije</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredViolations.map((violation) => (
                <TableRow key={violation.id}>
                  <TableCell className="font-medium">{violation.berth}</TableCell>
                  <TableCell>{violation.vessel || '-'}</TableCell>
                  <TableCell>
                    {VIOLATION_TYPE_LABELS[violation.type] || violation.type}
                  </TableCell>
                  <TableCell className="max-w-xs truncate">
                    {violation.description}
                  </TableCell>
                  <TableCell>
                    {format(violation.detectedDate, 'dd.MM.yyyy', { locale: hr })}
                  </TableCell>
                  <TableCell>{getStatusBadge(violation.status)}</TableCell>
                  {canEdit && (
                    <TableCell className="text-right">
                      {violation.status === 'open' && (
                        <Button variant="outline" size="sm">
                          Riješi
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
