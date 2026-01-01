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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, Plus, UserPlus, Shield, Phone, Mail } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { ROLE_LABELS } from '@/lib/auth/rbac';

// Mock data
const USERS = [
  { id: 'u001', fullName: 'Marko Marković', email: 'marko@marina.hr', phone: '+385 91 123 4567', role: 'inspector', isActive: true, lastLogin: new Date('2024-12-31T08:30:00') },
  { id: 'u002', fullName: 'Ana Anić', email: 'ana@marina.hr', phone: '+385 92 234 5678', role: 'operator', isActive: true, lastLogin: new Date('2024-12-31T09:15:00') },
  { id: 'u003', fullName: 'Ivan Ivić', email: 'ivan@marina.hr', phone: '+385 91 345 6789', role: 'manager', isActive: true, lastLogin: new Date('2024-12-30T16:45:00') },
  { id: 'u004', fullName: 'Petra Petrović', email: 'petra@marina.hr', phone: '+385 98 456 7890', role: 'admin', isActive: true, lastLogin: new Date('2024-12-31T10:00:00') },
  { id: 'u005', fullName: 'Josip Josipović', email: 'josip@marina.hr', phone: '+385 91 567 8901', role: 'inspector', isActive: false, lastLogin: new Date('2024-12-15T14:30:00') },
];

const ROLE_COLORS: Record<string, string> = {
  inspector: 'bg-blue-500',
  operator: 'bg-purple-500',
  manager: 'bg-orange-500',
  admin: 'bg-red-500',
};

export default function UsersPage() {
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const filteredUsers = USERS.filter((user) => {
    const matchesSearch =
      user.fullName.toLowerCase().includes(search.toLowerCase()) ||
      user.email.toLowerCase().includes(search.toLowerCase());
    const matchesRole = filterRole === 'all' || user.role === filterRole;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Korisnici</h1>
          <p className="text-muted-foreground">
            Upravljanje korisnicima sistema
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="mr-2 h-4 w-4" />
              Novi korisnik
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Dodaj novog korisnika</DialogTitle>
              <DialogDescription>
                Kreiraj novi korisnički račun u sistemu
              </DialogDescription>
            </DialogHeader>
            <form className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Ime i prezime</Label>
                <Input id="fullName" placeholder="Ime Prezime" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="korisnik@marina.hr" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Telefon</Label>
                <Input id="phone" placeholder="+385 91 ..." />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Uloga</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Odaberi ulogu" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="inspector">Inspektor (Teren)</SelectItem>
                    <SelectItem value="operator">Operater (Naplata)</SelectItem>
                    <SelectItem value="manager">Menadžer (Ugovori)</SelectItem>
                    <SelectItem value="admin">Administrator</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAddDialogOpen(false)}
                >
                  Odustani
                </Button>
                <Button type="submit">Kreiraj korisnika</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Role summary */}
      <div className="grid gap-4 md:grid-cols-4">
        {Object.entries(ROLE_LABELS).map(([role, label]) => {
          const count = USERS.filter((u) => u.role === role && u.isActive).length;
          return (
            <Card key={role}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${ROLE_COLORS[role]}`} />
                  {label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{count}</div>
                <p className="text-xs text-muted-foreground">aktivnih korisnika</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Pretraži po imenu ili emailu..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterRole} onValueChange={setFilterRole}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Uloga" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Sve uloge</SelectItem>
                <SelectItem value="inspector">Inspektor</SelectItem>
                <SelectItem value="operator">Operater</SelectItem>
                <SelectItem value="manager">Menadžer</SelectItem>
                <SelectItem value="admin">Administrator</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Lista korisnika</CardTitle>
          <CardDescription>
            Prikazano {filteredUsers.length} od {USERS.length} korisnika
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ime</TableHead>
                <TableHead>Kontakt</TableHead>
                <TableHead>Uloga</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Zadnja prijava</TableHead>
                <TableHead className="text-right">Akcije</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.fullName}</TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center gap-1 text-sm">
                        <Mail className="h-3 w-3 text-muted-foreground" />
                        {user.email}
                      </div>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Phone className="h-3 w-3" />
                        {user.phone}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={ROLE_COLORS[user.role]}>
                      <Shield className="mr-1 h-3 w-3" />
                      {ROLE_LABELS[user.role as keyof typeof ROLE_LABELS]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {user.isActive ? (
                      <Badge className="bg-green-500">Aktivan</Badge>
                    ) : (
                      <Badge variant="secondary">Neaktivan</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {user.lastLogin.toLocaleDateString('hr-HR')}{' '}
                    {user.lastLogin.toLocaleTimeString('hr-HR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm">
                      Uredi
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
