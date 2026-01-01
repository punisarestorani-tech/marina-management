'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Search, Map, Ship, Droplets, Zap, Pencil, Ruler, RefreshCw, Loader2 } from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabase/client';

interface BerthData {
  id: string;
  code: string;
  pontoon: string;
  length: number;
  width: number;
  dailyRate: number;
  status: string;
  occupancyStatus: string;
  vessel: string | null;
  hasWater: boolean;
  hasElectricity: boolean;
  maxVesselLength: number | null;
  maxVesselWidth: number | null;
}

export default function BerthsPage() {
  const [berths, setBerths] = useState<BerthData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterPontoon, setFilterPontoon] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [editingBerth, setEditingBerth] = useState<BerthData | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch berths from Supabase
  const fetchBerths = async () => {
    setIsLoading(true);
    try {
      const supabase = getSupabaseClient();
      const today = new Date().toISOString().split('T')[0];

      // Fetch berths with pontoon info
      const { data: berthsData, error: berthsError } = await supabase
        .from('berths')
        .select(`
          id,
          code,
          width,
          length,
          daily_rate,
          status,
          has_water,
          has_electricity,
          max_vessel_length,
          max_vessel_width,
          pontoons!berths_pontoon_id_fkey (
            code
          )
        `)
        .order('code');

      if (berthsError) throw berthsError;

      // Fetch active bookings to determine occupancy status
      const { data: bookingsData } = await supabase
        .from('berth_bookings')
        .select('berth_code, vessel_registration, status')
        .in('status', ['checked_in', 'confirmed', 'pending'])
        .lte('check_in_date', today)
        .gt('check_out_date', today);

      // Create a map of berth_code to booking info
      const bookingMap = new Map<string, { vessel: string | null; status: string }>();
      bookingsData?.forEach((booking) => {
        bookingMap.set(booking.berth_code, {
          vessel: booking.vessel_registration,
          status: booking.status === 'checked_in' ? 'occupied' : 'reserved',
        });
      });

      // Transform data
      const transformedBerths: BerthData[] = (berthsData || []).map((berth: any) => {
        const booking = bookingMap.get(berth.code);
        const pontoonCode = berth.code.split('-')[0] || 'A';

        return {
          id: berth.id,
          code: berth.code,
          pontoon: pontoonCode,
          length: berth.length || 0,
          width: berth.width || 0,
          dailyRate: berth.daily_rate || 0,
          status: berth.status || 'active',
          occupancyStatus: booking?.status || 'free',
          vessel: booking?.vessel || null,
          hasWater: berth.has_water || false,
          hasElectricity: berth.has_electricity || false,
          maxVesselLength: berth.max_vessel_length,
          maxVesselWidth: berth.max_vessel_width,
        };
      });

      setBerths(transformedBerths);
    } catch (error) {
      console.error('Error fetching berths:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBerths();
  }, []);

  const filteredBerths = berths.filter((berth) => {
    const matchesSearch =
      berth.code.toLowerCase().includes(search.toLowerCase()) ||
      (berth.vessel && berth.vessel.toLowerCase().includes(search.toLowerCase()));
    const matchesPontoon = filterPontoon === 'all' || berth.pontoon === filterPontoon;
    const matchesStatus = filterStatus === 'all' || berth.occupancyStatus === filterStatus;
    return matchesSearch && matchesPontoon && matchesStatus;
  });

  // Get unique pontoons for filter
  const pontoons = [...new Set(berths.map((b) => b.pontoon))].sort();

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'occupied':
        return <Badge variant="destructive">Zauzet</Badge>;
      case 'reserved':
        return <Badge className="bg-yellow-500">Rezervisan</Badge>;
      case 'free':
      default:
        return <Badge className="bg-green-500">Slobodan</Badge>;
    }
  };

  const handleEditBerth = (berth: BerthData) => {
    setEditingBerth({ ...berth });
    setIsDialogOpen(true);
  };

  const handleSaveBerth = async () => {
    if (!editingBerth) return;

    setIsSaving(true);
    try {
      const supabase = getSupabaseClient();

      const { error } = await supabase
        .from('berths')
        .update({
          has_water: editingBerth.hasWater,
          has_electricity: editingBerth.hasElectricity,
          max_vessel_length: editingBerth.maxVesselLength,
          max_vessel_width: editingBerth.maxVesselWidth,
        })
        .eq('id', editingBerth.id);

      if (error) throw error;

      // Update local state
      setBerths(berths.map((b) => (b.id === editingBerth.id ? editingBerth : b)));
      setIsDialogOpen(false);
      setEditingBerth(null);
    } catch (error) {
      console.error('Error saving berth:', error);
      alert('Greška pri spremanju: ' + (error as Error).message);
    } finally {
      setIsSaving(false);
    }
  };

  // Stats
  const stats = {
    total: berths.length,
    free: berths.filter((b) => b.occupancyStatus === 'free').length,
    occupied: berths.filter((b) => b.occupancyStatus === 'occupied').length,
    reserved: berths.filter((b) => b.occupancyStatus === 'reserved').length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Vezovi</h1>
          <p className="text-muted-foreground">Pregled svih vezova u marini</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchBerths} disabled={isLoading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Osvježi
          </Button>
          <Button asChild>
            <Link href="/map">
              <Map className="mr-2 h-4 w-4" />
              Otvori Mapu
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Ukupno vezova</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-600">Slobodni</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.free}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-600">Zauzeti</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.occupied}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-yellow-600">Rezervisani</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.reserved}</div>
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
                placeholder="Pretraži po kodu veza ili plovilu..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterPontoon} onValueChange={setFilterPontoon}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Ponton" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Svi pontoni</SelectItem>
                {pontoons.map((p) => (
                  <SelectItem key={p} value={p}>
                    Ponton {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Svi statusi</SelectItem>
                <SelectItem value="free">Slobodan</SelectItem>
                <SelectItem value="occupied">Zauzet</SelectItem>
                <SelectItem value="reserved">Rezervisan</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Lista vezova</CardTitle>
          <CardDescription>
            Prikazano {filteredBerths.length} od {berths.length} vezova
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : berths.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>Nema vezova u bazi.</p>
              <p className="text-sm mt-2">
                Pokrenite SQL migraciju 005_demo_data.sql u Supabase SQL Editoru.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kod</TableHead>
                  <TableHead>Ponton</TableHead>
                  <TableHead>Dimenzije veza</TableHead>
                  <TableHead>Max. plovilo</TableHead>
                  <TableHead>Priključci</TableHead>
                  <TableHead>Cijena/dan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Plovilo</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBerths.map((berth) => (
                  <TableRow key={berth.id}>
                    <TableCell className="font-medium">{berth.code}</TableCell>
                    <TableCell>{berth.pontoon}</TableCell>
                    <TableCell>
                      {berth.length}m x {berth.width}m
                    </TableCell>
                    <TableCell>
                      {berth.maxVesselLength && berth.maxVesselWidth ? (
                        <div className="flex items-center gap-1 text-sm">
                          <Ruler className="h-3 w-3 text-muted-foreground" />
                          {berth.maxVesselLength}m x {berth.maxVesselWidth}m
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span title={berth.hasWater ? 'Ima vodu' : 'Nema vodu'}>
                          <Droplets
                            className={`h-4 w-4 ${berth.hasWater ? 'text-blue-500' : 'text-gray-300'}`}
                          />
                        </span>
                        <span title={berth.hasElectricity ? 'Ima struju' : 'Nema struju'}>
                          <Zap
                            className={`h-4 w-4 ${berth.hasElectricity ? 'text-yellow-500' : 'text-gray-300'}`}
                          />
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>{berth.dailyRate} EUR</TableCell>
                    <TableCell>{getStatusBadge(berth.occupancyStatus)}</TableCell>
                    <TableCell>
                      {berth.vessel ? (
                        <div className="flex items-center gap-1">
                          <Ship className="h-4 w-4 text-muted-foreground" />
                          {berth.vessel}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => handleEditBerth(berth)}>
                        <Pencil className="h-4 w-4" />
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
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Uredi vez {editingBerth?.code}</DialogTitle>
            <DialogDescription>
              Izmijeni podatke o vezu, priključcima i maksimalnim dimenzijama plovila.
            </DialogDescription>
          </DialogHeader>
          {editingBerth && (
            <div className="grid gap-4 py-4">
              {/* Amenities Section */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Priključci</Label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingBerth.hasWater}
                      onChange={(e) =>
                        setEditingBerth({ ...editingBerth, hasWater: e.target.checked })
                      }
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    <Droplets className="h-4 w-4 text-blue-500" />
                    <span className="text-sm">Voda</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingBerth.hasElectricity}
                      onChange={(e) =>
                        setEditingBerth({ ...editingBerth, hasElectricity: e.target.checked })
                      }
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    <Zap className="h-4 w-4 text-yellow-500" />
                    <span className="text-sm">Struja</span>
                  </label>
                </div>
              </div>

              {/* Max Vessel Dimensions */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Maksimalne dimenzije plovila</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="maxVesselLength" className="text-xs text-muted-foreground">
                      Dužina (m)
                    </Label>
                    <Input
                      id="maxVesselLength"
                      type="number"
                      step="0.1"
                      value={editingBerth.maxVesselLength || ''}
                      onChange={(e) =>
                        setEditingBerth({
                          ...editingBerth,
                          maxVesselLength: e.target.value ? parseFloat(e.target.value) : null,
                        })
                      }
                      placeholder="npr. 12.5"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="maxVesselWidth" className="text-xs text-muted-foreground">
                      Širina (m)
                    </Label>
                    <Input
                      id="maxVesselWidth"
                      type="number"
                      step="0.1"
                      value={editingBerth.maxVesselWidth || ''}
                      onChange={(e) =>
                        setEditingBerth({
                          ...editingBerth,
                          maxVesselWidth: e.target.value ? parseFloat(e.target.value) : null,
                        })
                      }
                      placeholder="npr. 4.0"
                    />
                  </div>
                </div>
              </div>

              {/* Berth Dimensions (read-only info) */}
              <div className="rounded-lg bg-muted p-3 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Ruler className="h-4 w-4" />
                  <span>
                    Dimenzije veza: {editingBerth.length}m x {editingBerth.width}m
                  </span>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Odustani
            </Button>
            <Button onClick={handleSaveBerth} disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sačuvaj izmjene
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
