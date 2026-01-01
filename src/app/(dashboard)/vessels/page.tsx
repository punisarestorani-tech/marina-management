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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Search, Plus, Ship, Flag, User } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { hasPermission } from '@/lib/auth/rbac';

// Mock data
const VESSELS = [
  { id: 'v0000001', registration: 'HR-1234-AB', name: 'Sunce', type: 'sailboat', length: 10.5, width: 3.2, owner: 'Marko Marković', country: 'HR', hasContract: true },
  { id: 'v0000002', registration: 'HR-5678-CD', name: 'Jadran', type: 'motorboat', length: 8.0, width: 2.8, owner: 'Ivan Ivić', country: 'HR', hasContract: true },
  { id: 'v0000003', registration: 'IT-9012-EF', name: 'Bella Vista', type: 'yacht', length: 15.0, width: 4.5, owner: 'Marco Rossi', country: 'IT', hasContract: false },
  { id: 'v0000004', registration: 'HR-3456-GH', name: 'Dalmacija', type: 'sailboat', length: 12.0, width: 3.8, owner: 'Ante Antić', country: 'HR', hasContract: true },
  { id: 'v0000005', registration: 'SLO-7890-IJ', name: 'Triglav', type: 'motorboat', length: 9.5, width: 3.0, owner: 'Janez Novak', country: 'SI', hasContract: false },
  { id: 'v0000006', registration: 'HR-2345-KL', name: 'More', type: 'catamaran', length: 14.0, width: 7.5, owner: 'Josip Horvat', country: 'HR', hasContract: false },
  { id: 'v0000007', registration: 'AT-6789-MN', name: 'Donau', type: 'motorboat', length: 11.0, width: 3.5, owner: 'Hans Mueller', country: 'AT', hasContract: true },
  { id: 'v0000008', registration: 'DE-4567-QR', name: 'Nordsee', type: 'yacht', length: 18.0, width: 5.0, owner: 'Klaus Schmidt', country: 'DE', hasContract: true },
];

const VESSEL_TYPE_LABELS: Record<string, string> = {
  sailboat: 'Jedrilica',
  motorboat: 'Motorni čamac',
  yacht: 'Jahta',
  catamaran: 'Katamaran',
  other: 'Ostalo',
};

export default function VesselsPage() {
  const user = useAuthStore((state) => state.user);
  const [search, setSearch] = useState('');

  const canEdit = user && hasPermission(user.role, 'EDIT_VESSELS');

  const filteredVessels = VESSELS.filter(
    (vessel) =>
      vessel.registration.toLowerCase().includes(search.toLowerCase()) ||
      vessel.name?.toLowerCase().includes(search.toLowerCase()) ||
      vessel.owner?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Plovila</h1>
          <p className="text-muted-foreground">
            Evidencija svih plovila u marini
          </p>
        </div>
        {canEdit && (
          <Dialog>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Novo plovilo
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Dodaj novo plovilo</DialogTitle>
                <DialogDescription>
                  Unesi podatke o novom plovilu u evidenciju.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <p className="text-sm text-muted-foreground text-center">
                  Forma za dodavanje plovila će biti implementirana
                </p>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Pretraži po registraciji, imenu ili vlasniku..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Lista plovila</CardTitle>
          <CardDescription>
            Prikazano {filteredVessels.length} od {VESSELS.length} plovila
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Registracija</TableHead>
                <TableHead>Ime</TableHead>
                <TableHead>Tip</TableHead>
                <TableHead>Dimenzije</TableHead>
                <TableHead>Vlasnik</TableHead>
                <TableHead>Zastava</TableHead>
                <TableHead>Ugovor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredVessels.map((vessel) => (
                <TableRow key={vessel.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <Ship className="h-4 w-4 text-muted-foreground" />
                      {vessel.registration}
                    </div>
                  </TableCell>
                  <TableCell>{vessel.name || '-'}</TableCell>
                  <TableCell>{VESSEL_TYPE_LABELS[vessel.type] || vessel.type}</TableCell>
                  <TableCell>
                    {vessel.length}m x {vessel.width}m
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <User className="h-4 w-4 text-muted-foreground" />
                      {vessel.owner}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Flag className="h-4 w-4 text-muted-foreground" />
                      {vessel.country}
                    </div>
                  </TableCell>
                  <TableCell>
                    {vessel.hasContract ? (
                      <Badge className="bg-green-500">Aktivan</Badge>
                    ) : (
                      <Badge variant="secondary">Nema</Badge>
                    )}
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
