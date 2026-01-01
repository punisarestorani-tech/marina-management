'use client';

import { useState } from 'react';
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
import { Search, Map, Ship, Droplets, Zap, Pencil, Ruler } from 'lucide-react';

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

// Mock data with new fields
const initialBerths: BerthData[] = [
  { id: 'a0000001', code: 'A-01', pontoon: 'A', length: 10.0, width: 3.0, dailyRate: 50, status: 'active', occupancyStatus: 'occupied', vessel: 'HR-1234-AB', hasWater: true, hasElectricity: true, maxVesselLength: 9.5, maxVesselWidth: 2.7 },
  { id: 'a0000002', code: 'A-02', pontoon: 'A', length: 12.0, width: 3.5, dailyRate: 60, status: 'active', occupancyStatus: 'occupied', vessel: 'HR-5678-CD', hasWater: true, hasElectricity: true, maxVesselLength: 11.5, maxVesselWidth: 3.2 },
  { id: 'a0000003', code: 'A-03', pontoon: 'A', length: 10.0, width: 3.0, dailyRate: 50, status: 'active', occupancyStatus: 'free', vessel: null, hasWater: false, hasElectricity: true, maxVesselLength: 9.5, maxVesselWidth: 2.7 },
  { id: 'a0000004', code: 'A-04', pontoon: 'A', length: 14.0, width: 4.0, dailyRate: 70, status: 'active', occupancyStatus: 'occupied', vessel: 'IT-9012-EF', hasWater: true, hasElectricity: true, maxVesselLength: 13.5, maxVesselWidth: 3.7 },
  { id: 'a0000005', code: 'A-05', pontoon: 'A', length: 10.0, width: 3.0, dailyRate: 50, status: 'active', occupancyStatus: 'reserved', vessel: null, hasWater: false, hasElectricity: false, maxVesselLength: 9.5, maxVesselWidth: 2.7 },
  { id: 'b0000001', code: 'B-01', pontoon: 'B', length: 14.0, width: 4.0, dailyRate: 70, status: 'active', occupancyStatus: 'occupied', vessel: 'HR-3456-GH', hasWater: true, hasElectricity: true, maxVesselLength: 13.5, maxVesselWidth: 3.7 },
  { id: 'b0000002', code: 'B-02', pontoon: 'B', length: 14.0, width: 4.0, dailyRate: 70, status: 'active', occupancyStatus: 'free', vessel: null, hasWater: true, hasElectricity: true, maxVesselLength: 13.5, maxVesselWidth: 3.7 },
  { id: 'b0000003', code: 'B-03', pontoon: 'B', length: 16.0, width: 4.5, dailyRate: 80, status: 'active', occupancyStatus: 'occupied', vessel: 'SLO-7890-IJ', hasWater: true, hasElectricity: true, maxVesselLength: 15.5, maxVesselWidth: 4.2 },
  { id: 'c0000001', code: 'C-01', pontoon: 'C', length: 18.0, width: 5.0, dailyRate: 100, status: 'active', occupancyStatus: 'occupied', vessel: 'AT-6789-MN', hasWater: true, hasElectricity: true, maxVesselLength: 17.5, maxVesselWidth: 4.7 },
  { id: 'c0000002', code: 'C-02', pontoon: 'C', length: 20.0, width: 5.5, dailyRate: 120, status: 'active', occupancyStatus: 'occupied', vessel: 'DE-4567-QR', hasWater: true, hasElectricity: true, maxVesselLength: 19.5, maxVesselWidth: 5.2 },
];

export default function BerthsPage() {
  const [berths, setBerths] = useState<BerthData[]>(initialBerths);
  const [search, setSearch] = useState('');
  const [filterPontoon, setFilterPontoon] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [editingBerth, setEditingBerth] = useState<BerthData | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const filteredBerths = berths.filter((berth) => {
    const matchesSearch =
      berth.code.toLowerCase().includes(search.toLowerCase()) ||
      (berth.vessel && berth.vessel.toLowerCase().includes(search.toLowerCase()));
    const matchesPontoon = filterPontoon === 'all' || berth.pontoon === filterPontoon;
    const matchesStatus = filterStatus === 'all' || berth.occupancyStatus === filterStatus;
    return matchesSearch && matchesPontoon && matchesStatus;
  });

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

  const handleSaveBerth = () => {
    if (!editingBerth) return;
    setBerths(berths.map(b => b.id === editingBerth.id ? editingBerth : b));
    setIsDialogOpen(false);
    setEditingBerth(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Vezovi</h1>
          <p className="text-muted-foreground">Pregled svih vezova u marini</p>
        </div>
        <Button asChild>
          <Link href="/map">
            <Map className="mr-2 h-4 w-4" />
            Otvori Mapu
          </Link>
        </Button>
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
                <SelectItem value="A">Ponton A</SelectItem>
                <SelectItem value="B">Ponton B</SelectItem>
                <SelectItem value="C">Ponton C</SelectItem>
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
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEditBerth(berth)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
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
                      onChange={(e) => setEditingBerth({ ...editingBerth, hasWater: e.target.checked })}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    <Droplets className="h-4 w-4 text-blue-500" />
                    <span className="text-sm">Voda</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingBerth.hasElectricity}
                      onChange={(e) => setEditingBerth({ ...editingBerth, hasElectricity: e.target.checked })}
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
                      onChange={(e) => setEditingBerth({
                        ...editingBerth,
                        maxVesselLength: e.target.value ? parseFloat(e.target.value) : null
                      })}
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
                      onChange={(e) => setEditingBerth({
                        ...editingBerth,
                        maxVesselWidth: e.target.value ? parseFloat(e.target.value) : null
                      })}
                      placeholder="npr. 4.0"
                    />
                  </div>
                </div>
              </div>

              {/* Berth Dimensions (read-only info) */}
              <div className="rounded-lg bg-muted p-3 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Ruler className="h-4 w-4" />
                  <span>Dimenzije veza: {editingBerth.length}m x {editingBerth.width}m</span>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Odustani
            </Button>
            <Button onClick={handleSaveBerth}>
              Sačuvaj izmjene
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
