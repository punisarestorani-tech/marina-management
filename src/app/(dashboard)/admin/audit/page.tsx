'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
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
import { Search, ScrollText, Plus, Pencil, Trash2, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { hr } from 'date-fns/locale';

// Mock data
const AUDIT_LOGS = [
  { id: 'a001', user: 'Petra Petrović', action: 'INSERT', table: 'lease_contracts', recordId: 'contract006', timestamp: new Date('2024-12-31T10:30:00'), details: 'Kreiran novi ugovor za vez C-05' },
  { id: 'a002', user: 'Ivan Ivić', action: 'UPDATE', table: 'payments', recordId: 'p008', timestamp: new Date('2024-12-31T09:45:00'), details: 'Status plaćanja promijenjen u "paid"' },
  { id: 'a003', user: 'Ana Anić', action: 'INSERT', table: 'violations', recordId: 'v005', timestamp: new Date('2024-12-31T09:15:00'), details: 'Zabilježen prekršaj na vezu B-06' },
  { id: 'a004', user: 'Marko Marković', action: 'INSERT', table: 'daily_occupancy', recordId: 'occ123', timestamp: new Date('2024-12-31T08:30:00'), details: 'Unos zauzetosti za vez A-04' },
  { id: 'a005', user: 'Petra Petrović', action: 'UPDATE', table: 'profiles', recordId: 'u005', timestamp: new Date('2024-12-30T16:00:00'), details: 'Deaktiviran korisnik Josip Josipović' },
  { id: 'a006', user: 'Ivan Ivić', action: 'UPDATE', table: 'lease_contracts', recordId: 'contract002', timestamp: new Date('2024-12-30T14:30:00'), details: 'Ažurirani podaci o vlasniku' },
  { id: 'a007', user: 'Petra Petrović', action: 'DELETE', table: 'violations', recordId: 'v002', timestamp: new Date('2024-12-30T11:00:00'), details: 'Obrisana dupla prijava prekršaja' },
];

const ACTION_ICONS: Record<string, React.ReactNode> = {
  INSERT: <Plus className="h-4 w-4" />,
  UPDATE: <Pencil className="h-4 w-4" />,
  DELETE: <Trash2 className="h-4 w-4" />,
  SELECT: <Eye className="h-4 w-4" />,
};

const ACTION_COLORS: Record<string, string> = {
  INSERT: 'bg-green-500',
  UPDATE: 'bg-blue-500',
  DELETE: 'bg-red-500',
  SELECT: 'bg-gray-500',
};

const TABLE_LABELS: Record<string, string> = {
  profiles: 'Korisnici',
  lease_contracts: 'Ugovori',
  payments: 'Plaćanja',
  violations: 'Prekršaji',
  daily_occupancy: 'Zauzetost',
  berths: 'Vezovi',
  vessels: 'Plovila',
};

export default function AuditPage() {
  const [search, setSearch] = useState('');
  const [filterAction, setFilterAction] = useState<string>('all');
  const [filterTable, setFilterTable] = useState<string>('all');

  const filteredLogs = AUDIT_LOGS.filter((log) => {
    const matchesSearch =
      log.user.toLowerCase().includes(search.toLowerCase()) ||
      log.details.toLowerCase().includes(search.toLowerCase());
    const matchesAction = filterAction === 'all' || log.action === filterAction;
    const matchesTable = filterTable === 'all' || log.table === filterTable;
    return matchesSearch && matchesAction && matchesTable;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Audit Log</h1>
        <p className="text-muted-foreground">
          Pregled svih promjena u sistemu
        </p>
      </div>

      {/* Summary */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Ukupno danas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {AUDIT_LOGS.filter(
                (l) =>
                  l.timestamp.toDateString() === new Date().toDateString()
              ).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              Kreirano
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {AUDIT_LOGS.filter((l) => l.action === 'INSERT').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              Ažurirano
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {AUDIT_LOGS.filter((l) => l.action === 'UPDATE').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              Obrisano
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {AUDIT_LOGS.filter((l) => l.action === 'DELETE').length}
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
                placeholder="Pretraži po korisniku ili opisu..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterAction} onValueChange={setFilterAction}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Akcija" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Sve akcije</SelectItem>
                <SelectItem value="INSERT">Kreiranje</SelectItem>
                <SelectItem value="UPDATE">Ažuriranje</SelectItem>
                <SelectItem value="DELETE">Brisanje</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterTable} onValueChange={setFilterTable}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Tabela" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Sve tabele</SelectItem>
                <SelectItem value="lease_contracts">Ugovori</SelectItem>
                <SelectItem value="payments">Plaćanja</SelectItem>
                <SelectItem value="violations">Prekršaji</SelectItem>
                <SelectItem value="daily_occupancy">Zauzetost</SelectItem>
                <SelectItem value="profiles">Korisnici</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ScrollText className="h-5 w-5" />
            Log zapisi
          </CardTitle>
          <CardDescription>
            Prikazano {filteredLogs.length} od {AUDIT_LOGS.length} zapisa
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vrijeme</TableHead>
                <TableHead>Korisnik</TableHead>
                <TableHead>Akcija</TableHead>
                <TableHead>Tabela</TableHead>
                <TableHead>Opis</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="text-sm">
                    <div>
                      {format(log.timestamp, 'dd.MM.yyyy', { locale: hr })}
                    </div>
                    <div className="text-muted-foreground">
                      {format(log.timestamp, 'HH:mm:ss')}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{log.user}</TableCell>
                  <TableCell>
                    <Badge className={`gap-1 ${ACTION_COLORS[log.action]}`}>
                      {ACTION_ICONS[log.action]}
                      {log.action}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {TABLE_LABELS[log.table] || log.table}
                  </TableCell>
                  <TableCell className="max-w-xs truncate text-muted-foreground">
                    {log.details}
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
