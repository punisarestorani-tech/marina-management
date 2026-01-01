'use client';

import { useState, useEffect } from 'react';
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
import { Search, UserPlus, Shield, Phone, Mail, Loader2 } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { ROLE_LABELS } from '@/lib/auth/rbac';
import { getSupabaseClient } from '@/lib/supabase/client';

interface User {
  id: string;
  full_name: string;
  email?: string;
  phone?: string;
  role: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const ROLE_COLORS: Record<string, string> = {
  inspector: 'bg-blue-500',
  operator: 'bg-purple-500',
  manager: 'bg-orange-500',
  admin: 'bg-red-500',
};

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form state for editing
  const [editForm, setEditForm] = useState({
    full_name: '',
    phone: '',
    role: '',
    is_active: true,
  });

  // Load users from Supabase
  useEffect(() => {
    const loadUsers = async () => {
      try {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error loading users:', error);
          return;
        }

        setUsers(data || []);
      } catch (err) {
        console.error('Error:', err);
      } finally {
        setIsLoading(false);
      }
    };
    loadUsers();
  }, []);

  // Open edit dialog
  const handleEdit = (user: User) => {
    setEditingUser(user);
    setEditForm({
      full_name: user.full_name,
      phone: user.phone || '',
      role: user.role,
      is_active: user.is_active,
    });
    setIsEditDialogOpen(true);
  };

  // Save user changes
  const handleSaveUser = async () => {
    if (!editingUser) return;
    setIsSaving(true);

    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: editForm.full_name,
          phone: editForm.phone || null,
          role: editForm.role,
          is_active: editForm.is_active,
        })
        .eq('id', editingUser.id);

      if (error) {
        alert('Greška: ' + error.message);
        return;
      }

      // Update local state
      setUsers(users.map(u =>
        u.id === editingUser.id
          ? { ...u, ...editForm }
          : u
      ));
      setIsEditDialogOpen(false);
      setEditingUser(null);
    } catch (err) {
      alert('Greška: ' + (err as Error).message);
    } finally {
      setIsSaving(false);
    }
  };

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.full_name.toLowerCase().includes(search.toLowerCase()) ||
      (user.email?.toLowerCase() || '').includes(search.toLowerCase());
    const matchesRole = filterRole === 'all' || user.role === filterRole;
    return matchesSearch && matchesRole;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

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
                Novi korisnici se kreiraju kroz Supabase Dashboard → Authentication → Users
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 text-sm text-muted-foreground">
              <p>Za kreiranje novog korisnika:</p>
              <ol className="list-decimal list-inside mt-2 space-y-1">
                <li>Otvori Supabase Dashboard</li>
                <li>Idi na Authentication → Users</li>
                <li>Klikni "Add user"</li>
                <li>Unesi email i lozinku</li>
                <li>Profil će se automatski kreirati</li>
              </ol>
            </div>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Zatvori
            </Button>
          </DialogContent>
        </Dialog>
      </div>

      {/* Role summary */}
      <div className="grid gap-4 md:grid-cols-4">
        {Object.entries(ROLE_LABELS).map(([role, label]) => {
          const count = users.filter((u) => u.role === role && u.is_active).length;
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
            Prikazano {filteredUsers.length} od {users.length} korisnika
          </CardDescription>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nema korisnika u bazi. Korisnici se kreiraju kroz Supabase Authentication.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ime</TableHead>
                  <TableHead>Kontakt</TableHead>
                  <TableHead>Uloga</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Kreiran</TableHead>
                  <TableHead className="text-right">Akcije</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.full_name}</TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {user.email && (
                          <div className="flex items-center gap-1 text-sm">
                            <Mail className="h-3 w-3 text-muted-foreground" />
                            {user.email}
                          </div>
                        )}
                        {user.phone && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Phone className="h-3 w-3" />
                            {user.phone}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={ROLE_COLORS[user.role] || 'bg-gray-500'}>
                        <Shield className="mr-1 h-3 w-3" />
                        {ROLE_LABELS[user.role as keyof typeof ROLE_LABELS] || user.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {user.is_active ? (
                        <Badge className="bg-green-500">Aktivan</Badge>
                      ) : (
                        <Badge variant="secondary">Neaktivan</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(user.created_at).toLocaleDateString('hr-HR')}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(user)}>
                        Uredi
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Uredi korisnika</DialogTitle>
            <DialogDescription>
              Izmijeni podatke korisnika
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit_fullName">Ime i prezime</Label>
              <Input
                id="edit_fullName"
                value={editForm.full_name}
                onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_phone">Telefon</Label>
              <Input
                id="edit_phone"
                value={editForm.phone}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                placeholder="+382 67 ..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_role">Uloga</Label>
              <Select value={editForm.role} onValueChange={(v) => setEditForm({ ...editForm, role: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="inspector">Inspektor (Teren)</SelectItem>
                  <SelectItem value="operator">Operater (Naplata)</SelectItem>
                  <SelectItem value="manager">Menadžer (Ugovori)</SelectItem>
                  <SelectItem value="admin">Administrator</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_status">Status</Label>
              <Select
                value={editForm.is_active ? 'active' : 'inactive'}
                onValueChange={(v) => setEditForm({ ...editForm, is_active: v === 'active' })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Aktivan</SelectItem>
                  <SelectItem value="inactive">Neaktivan</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Odustani
              </Button>
              <Button onClick={handleSaveUser} disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Sačuvaj
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
