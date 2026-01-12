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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Search, Ship, Anchor, Pencil, Loader2, User, Calendar, FileText, AlertTriangle } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { hasPermission } from '@/lib/auth/rbac';
import { getSupabaseClient } from '@/lib/supabase/client';
import { ClickableImage } from '@/components/ui/image-lightbox';
import { PhotoUpload } from '@/components/ui/photo-upload';

interface Vessel {
  id: string;
  berth_code: string;
  vessel_name: string | null;
  vessel_registration: string | null;
  vessel_length: number | null;
  vessel_image_url: string | null;
  guest_name: string;
  check_in_date: string;
  check_out_date: string;
  status: string;
}

export default function VesselsPage() {
  const user = useAuthStore((state) => state.user);
  const [search, setSearch] = useState('');
  const [vessels, setVessels] = useState<Vessel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingVessel, setEditingVessel] = useState<Vessel | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Edit form state
  const [editName, setEditName] = useState('');
  const [editRegistration, setEditRegistration] = useState('');
  const [editLength, setEditLength] = useState('');
  const [editImageUrl, setEditImageUrl] = useState('');
  const [isChangingImage, setIsChangingImage] = useState(false);

  const canEdit = user && hasPermission(user.role, 'EDIT_VESSELS');

  // Load vessels from active berth_bookings
  useEffect(() => {
    const loadVessels = async () => {
      try {
        const supabase = getSupabaseClient();
        const today = new Date().toISOString().split('T')[0];

        const { data, error } = await supabase
          .from('berth_bookings')
          .select('id, berth_code, vessel_name, vessel_registration, vessel_length, vessel_image_url, guest_name, check_in_date, check_out_date, status')
          .in('status', ['confirmed', 'checked_in', 'pending'])
          .lte('check_in_date', today)
          .gte('check_out_date', today)
          .order('berth_code', { ascending: true });

        if (error) {
          console.error('Error loading vessels:', error);
          return;
        }

        if (data) {
          setVessels(data as Vessel[]);
        }
      } catch (err) {
        console.error('Error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadVessels();
  }, []);

  const filteredVessels = vessels.filter(
    (vessel) =>
      vessel.vessel_registration?.toLowerCase().includes(search.toLowerCase()) ||
      vessel.vessel_name?.toLowerCase().includes(search.toLowerCase()) ||
      vessel.berth_code.toLowerCase().includes(search.toLowerCase()) ||
      vessel.guest_name.toLowerCase().includes(search.toLowerCase())
  );

  const handleEditClick = (vessel: Vessel) => {
    setEditingVessel(vessel);
    setEditName(vessel.vessel_name || '');
    setEditRegistration(vessel.vessel_registration || '');
    setEditLength(vessel.vessel_length?.toString() || '');
    setEditImageUrl(vessel.vessel_image_url || '');
    setIsChangingImage(false);
    setIsEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingVessel) return;

    setIsSaving(true);
    try {
      const supabase = getSupabaseClient();

      const { error } = await supabase
        .from('berth_bookings')
        .update({
          vessel_name: editName.trim() || null,
          vessel_registration: editRegistration.trim() || null,
          vessel_length: editLength ? parseFloat(editLength) : null,
          vessel_image_url: editImageUrl || null,
        })
        .eq('id', editingVessel.id);

      if (error) {
        alert('Greska: ' + error.message);
        return;
      }

      // Update local state
      setVessels(prev => prev.map(v =>
        v.id === editingVessel.id
          ? {
              ...v,
              vessel_name: editName.trim() || null,
              vessel_registration: editRegistration.trim() || null,
              vessel_length: editLength ? parseFloat(editLength) : null,
              vessel_image_url: editImageUrl || null,
            }
          : v
      ));

      setIsEditDialogOpen(false);
      setEditingVessel(null);
    } catch (err) {
      alert('Greska: ' + (err as Error).message);
    } finally {
      setIsSaving(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'checked_in':
        return <Badge className="bg-green-500">Prijavljen</Badge>;
      case 'confirmed':
        return <Badge className="bg-blue-500">Potvrden</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-500">Na cekanju</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Calculate stay duration and determine contract status
  const getContractBadge = (checkIn: string, checkOut: string) => {
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const hasContract = days >= 30;

    if (hasContract) {
      return (
        <Badge className="bg-green-500 gap-1">
          <FileText className="h-3 w-3" />
          Ima ugovor
        </Badge>
      );
    }
    return (
      <Badge variant="destructive" className="gap-1">
        <AlertTriangle className="h-3 w-3" />
        Nema ugovor
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Plovila</h1>
          <p className="text-muted-foreground">
            Aktivna plovila u marini (iz rezervacija)
          </p>
        </div>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Pretrazi po registraciji, imenu, vezu ili gostu..."
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
            Prikazano {filteredVessels.length} od {vessels.length} plovila
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : vessels.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Ship className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p>Nema aktivnih plovila</p>
              <p className="text-sm">Plovila se prikazuju iz aktivnih rezervacija</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vez</TableHead>
                  <TableHead>Plovilo</TableHead>
                  <TableHead>Registracija</TableHead>
                  <TableHead>Duzina</TableHead>
                  <TableHead>Gost</TableHead>
                  <TableHead>Ugovor</TableHead>
                  <TableHead>Status</TableHead>
                  {canEdit && <TableHead className="text-right">Akcije</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredVessels.map((vessel) => (
                  <TableRow key={vessel.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Anchor className="h-4 w-4 text-blue-500" />
                        <span className="font-semibold">{vessel.berth_code}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Ship className="h-4 w-4 text-muted-foreground" />
                        {vessel.vessel_name || <span className="text-muted-foreground">-</span>}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono">
                      {vessel.vessel_registration || <span className="text-muted-foreground">-</span>}
                    </TableCell>
                    <TableCell>
                      {vessel.vessel_length ? `${vessel.vessel_length}m` : <span className="text-muted-foreground">-</span>}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        {vessel.guest_name}
                      </div>
                    </TableCell>
                    <TableCell>
                      {getContractBadge(vessel.check_in_date, vessel.check_out_date)}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(vessel.status)}
                    </TableCell>
                    {canEdit && (
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditClick(vessel)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    )}
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
            <DialogTitle>Uredi plovilo</DialogTitle>
            <DialogDescription>
              Vez: <span className="font-semibold">{editingVessel?.berth_code}</span>
              {' | '}
              Gost: <span className="font-semibold">{editingVessel?.guest_name}</span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Vessel Image */}
            <div className="space-y-2">
              <Label>Slika plovila</Label>
              {editImageUrl && !isChangingImage ? (
                <div className="space-y-2">
                  <ClickableImage src={editImageUrl} alt={editName || 'Plovilo'}>
                    <img
                      src={editImageUrl}
                      alt={editName || 'Plovilo'}
                      className="w-full h-40 object-cover rounded-lg border"
                    />
                  </ClickableImage>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setIsChangingImage(true)}
                      className="flex-1"
                    >
                      Izmjeni sliku
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setEditImageUrl('')}
                      className="flex-1 text-red-600 hover:text-red-700"
                    >
                      Ukloni sliku
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <PhotoUpload
                    currentPhotoUrl=""
                    onPhotoUploaded={(url) => {
                      setEditImageUrl(url);
                      setIsChangingImage(false);
                    }}
                    onPhotoRemoved={() => setEditImageUrl('')}
                    bucketName="vessel-photos"
                    folderPath="vessels"
                  />
                  {isChangingImage && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsChangingImage(false)}
                      className="w-full"
                    >
                      Odustani
                    </Button>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Ime plovila</Label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="npr. Sea Dream"
              />
            </div>

            <div className="space-y-2">
              <Label>Registracija</Label>
              <Input
                value={editRegistration}
                onChange={(e) => setEditRegistration(e.target.value.toUpperCase())}
                placeholder="npr. HR-1234-AB"
                className="font-mono"
              />
            </div>

            <div className="space-y-2">
              <Label>Duzina (m)</Label>
              <Input
                type="number"
                step="0.1"
                value={editLength}
                onChange={(e) => setEditLength(e.target.value)}
                placeholder="npr. 12.5"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Odustani
            </Button>
            <Button onClick={handleSaveEdit} disabled={isSaving}>
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Sacuvaj
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
