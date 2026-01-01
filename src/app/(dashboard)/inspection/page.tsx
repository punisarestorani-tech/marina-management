'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ClipboardCheck,
  AlertTriangle,
  Wrench,
  Search,
  Camera,
  CheckCircle,
  XCircle,
  Ship,
  Loader2,
  Plus,
} from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabase/client';
import {
  InspectionStatus,
  INSPECTION_STATUS_LABELS,
  INSPECTION_STATUS_COLORS,
  ViolationType,
  VIOLATION_TYPE_LABELS,
  VIOLATION_STATUS_LABELS,
  LocationType,
  LOCATION_TYPE_LABELS,
  DamageCategory,
  DAMAGE_CATEGORY_LABELS,
  DamageSeverity,
  DAMAGE_SEVERITY_LABELS,
  DAMAGE_SEVERITY_COLORS,
  DAMAGE_STATUS_LABELS,
} from '@/types/inspection.types';

interface Berth {
  id: string;
  code: string;
  status: string;
  current_vessel?: string;
  current_registration?: string;
}

interface TodayInspection {
  berth_code: string;
  status: InspectionStatus;
  inspected_at: string;
}

export default function InspectionPage() {
  const [berths, setBerths] = useState<Berth[]>([]);
  const [todayInspections, setTodayInspections] = useState<TodayInspection[]>([]);
  const [violations, setViolations] = useState<any[]>([]);
  const [damageReports, setDamageReports] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Inspection dialog
  const [inspectionDialog, setInspectionDialog] = useState(false);
  const [selectedBerth, setSelectedBerth] = useState<Berth | null>(null);
  const [inspectionForm, setInspectionForm] = useState({
    status: '' as InspectionStatus | '',
    found_vessel_name: '',
    found_vessel_registration: '',
    notes: '',
  });
  const [isSavingInspection, setIsSavingInspection] = useState(false);

  // Violation dialog
  const [violationDialog, setViolationDialog] = useState(false);
  const [violationForm, setViolationForm] = useState({
    berth_code: '',
    violation_type: '' as ViolationType | '',
    vessel_name: '',
    vessel_registration: '',
    description: '',
  });
  const [isSavingViolation, setIsSavingViolation] = useState(false);

  // Damage report dialog
  const [damageDialog, setDamageDialog] = useState(false);
  const [damageForm, setDamageForm] = useState({
    location_type: '' as LocationType | '',
    berth_code: '',
    location_description: '',
    category: '' as DamageCategory | '',
    severity: '' as DamageSeverity | '',
    title: '',
    description: '',
  });
  const [isSavingDamage, setIsSavingDamage] = useState(false);

  // Load data
  useEffect(() => {
    const loadData = async () => {
      try {
        const supabase = getSupabaseClient();

        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();
          setCurrentUser(profile);
        }

        // Load berths
        const { data: berthsData } = await supabase
          .from('berths')
          .select('id, code, status')
          .order('code');

        if (berthsData) {
          setBerths(berthsData);
        }

        // Load today's inspections
        const today = new Date().toISOString().split('T')[0];
        const { data: inspectionsData } = await supabase
          .from('inspections')
          .select('berth_code, status, inspected_at')
          .gte('inspected_at', today);

        if (inspectionsData) {
          setTodayInspections(inspectionsData);
        }

        // Load open violations
        const { data: violationsData } = await supabase
          .from('violations')
          .select('*')
          .in('status', ['open', 'in_progress'])
          .order('created_at', { ascending: false });

        if (violationsData) {
          setViolations(violationsData);
        }

        // Load recent damage reports
        const { data: damageData } = await supabase
          .from('damage_reports')
          .select('*')
          .in('status', ['reported', 'acknowledged', 'in_progress'])
          .order('created_at', { ascending: false });

        if (damageData) {
          setDamageReports(damageData);
        }
      } catch (err) {
        console.error('Error loading data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  // Check if berth was inspected today
  const getInspectionStatus = (berthCode: string): TodayInspection | undefined => {
    return todayInspections.find((i) => i.berth_code === berthCode);
  };

  // Open inspection dialog
  const handleInspectBerth = (berth: Berth) => {
    setSelectedBerth(berth);
    setInspectionForm({
      status: '',
      found_vessel_name: '',
      found_vessel_registration: '',
      notes: '',
    });
    setInspectionDialog(true);
  };

  // Save inspection
  const handleSaveInspection = async () => {
    if (!selectedBerth || !inspectionForm.status) {
      alert('Odaberi status inspekcije!');
      return;
    }

    setIsSavingInspection(true);
    try {
      const supabase = getSupabaseClient();

      const { error } = await supabase.from('inspections').insert({
        berth_code: selectedBerth.code,
        berth_id: selectedBerth.id,
        inspector_id: currentUser?.id,
        inspector_name: currentUser?.full_name,
        status: inspectionForm.status,
        found_vessel_name: inspectionForm.found_vessel_name || null,
        found_vessel_registration: inspectionForm.found_vessel_registration || null,
        notes: inspectionForm.notes || null,
      });

      if (error) {
        alert('Greška: ' + error.message);
        return;
      }

      // Add to today's inspections
      setTodayInspections([
        ...todayInspections,
        {
          berth_code: selectedBerth.code,
          status: inspectionForm.status,
          inspected_at: new Date().toISOString(),
        },
      ]);

      // If violation found, open violation dialog
      if (['wrong_vessel', 'illegal_mooring'].includes(inspectionForm.status)) {
        setViolationForm({
          berth_code: selectedBerth.code,
          violation_type: inspectionForm.status === 'illegal_mooring' ? 'illegal_mooring' : 'wrong_berth',
          vessel_name: inspectionForm.found_vessel_name,
          vessel_registration: inspectionForm.found_vessel_registration,
          description: '',
        });
        setInspectionDialog(false);
        setViolationDialog(true);
      } else {
        setInspectionDialog(false);
      }
    } catch (err) {
      alert('Greška: ' + (err as Error).message);
    } finally {
      setIsSavingInspection(false);
    }
  };

  // Save violation
  const handleSaveViolation = async () => {
    if (!violationForm.violation_type || !violationForm.description) {
      alert('Popuni obavezna polja!');
      return;
    }

    setIsSavingViolation(true);
    try {
      const supabase = getSupabaseClient();

      const { data, error } = await supabase.from('violations').insert({
        berth_code: violationForm.berth_code || null,
        violation_type: violationForm.violation_type,
        vessel_name: violationForm.vessel_name || null,
        vessel_registration: violationForm.vessel_registration || null,
        description: violationForm.description,
        reported_by: currentUser?.id,
        reported_by_name: currentUser?.full_name,
      }).select();

      if (error) {
        alert('Greška: ' + error.message);
        return;
      }

      if (data) {
        setViolations([data[0], ...violations]);
      }

      setViolationDialog(false);
      setViolationForm({
        berth_code: '',
        violation_type: '',
        vessel_name: '',
        vessel_registration: '',
        description: '',
      });
    } catch (err) {
      alert('Greška: ' + (err as Error).message);
    } finally {
      setIsSavingViolation(false);
    }
  };

  // Save damage report
  const handleSaveDamage = async () => {
    if (!damageForm.location_type || !damageForm.category || !damageForm.severity || !damageForm.title || !damageForm.description) {
      alert('Popuni sva obavezna polja!');
      return;
    }

    setIsSavingDamage(true);
    try {
      const supabase = getSupabaseClient();

      const { data, error } = await supabase.from('damage_reports').insert({
        location_type: damageForm.location_type,
        berth_code: damageForm.berth_code || null,
        location_description: damageForm.location_description || damageForm.title,
        category: damageForm.category,
        severity: damageForm.severity,
        title: damageForm.title,
        description: damageForm.description,
        reported_by: currentUser?.id,
        reported_by_name: currentUser?.full_name,
      }).select();

      if (error) {
        alert('Greška: ' + error.message);
        return;
      }

      if (data) {
        setDamageReports([data[0], ...damageReports]);
      }

      setDamageDialog(false);
      setDamageForm({
        location_type: '',
        berth_code: '',
        location_description: '',
        category: '',
        severity: '',
        title: '',
        description: '',
      });
    } catch (err) {
      alert('Greška: ' + (err as Error).message);
    } finally {
      setIsSavingDamage(false);
    }
  };

  // Filter berths
  const filteredBerths = berths.filter((berth) =>
    berth.code.toLowerCase().includes(search.toLowerCase())
  );

  // Stats
  const inspectedCount = todayInspections.length;
  const totalBerths = berths.length;
  const issuesFound = todayInspections.filter((i) =>
    ['wrong_vessel', 'illegal_mooring', 'missing_vessel'].includes(i.status)
  ).length;

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
          <h1 className="text-2xl font-bold tracking-tight">Inspekcija</h1>
          <p className="text-muted-foreground">
            Dnevna kontrola vezova i prijava problema
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setViolationDialog(true)}>
            <AlertTriangle className="mr-2 h-4 w-4" />
            Prijavi prekršaj
          </Button>
          <Button onClick={() => setDamageDialog(true)}>
            <Wrench className="mr-2 h-4 w-4" />
            Prijavi kvar
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pregledano danas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inspectedCount} / {totalBerths}</div>
            <p className="text-xs text-muted-foreground">
              {totalBerths > 0 ? Math.round((inspectedCount / totalBerths) * 100) : 0}% vezova
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pronađeni problemi</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">{issuesFound}</div>
            <p className="text-xs text-muted-foreground">danas</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Otvoreni prekršaji</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">{violations.length}</div>
            <p className="text-xs text-muted-foreground">nerješeno</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Prijavljeni kvarovi</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-500">{damageReports.length}</div>
            <p className="text-xs text-muted-foreground">u obradi</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="inspection">
        <TabsList>
          <TabsTrigger value="inspection">
            <ClipboardCheck className="mr-2 h-4 w-4" />
            Inspekcija vezova
          </TabsTrigger>
          <TabsTrigger value="violations">
            <AlertTriangle className="mr-2 h-4 w-4" />
            Prekršaji ({violations.length})
          </TabsTrigger>
          <TabsTrigger value="damage">
            <Wrench className="mr-2 h-4 w-4" />
            Kvarovi ({damageReports.length})
          </TabsTrigger>
        </TabsList>

        {/* Inspection Tab */}
        <TabsContent value="inspection" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Lista vezova za pregled</CardTitle>
              <CardDescription>
                Klikni na vez da zabilježiš inspekciju
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Pretraži po kodu veza..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                {filteredBerths.map((berth) => {
                  const inspection = getInspectionStatus(berth.code);
                  return (
                    <Button
                      key={berth.id}
                      variant={inspection ? 'secondary' : 'outline'}
                      className={`h-auto py-3 flex flex-col items-center gap-1 ${
                        inspection
                          ? INSPECTION_STATUS_COLORS[inspection.status].replace('bg-', 'border-') + ' border-2'
                          : ''
                      }`}
                      onClick={() => handleInspectBerth(berth)}
                    >
                      <span className="font-bold">{berth.code}</span>
                      {inspection ? (
                        <Badge className={INSPECTION_STATUS_COLORS[inspection.status]} variant="secondary">
                          {inspection.status === 'correct' || inspection.status === 'empty_ok' ? (
                            <CheckCircle className="h-3 w-3" />
                          ) : (
                            <XCircle className="h-3 w-3" />
                          )}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          {berth.status === 'occupied' ? 'Zauzet' : 'Slobodan'}
                        </span>
                      )}
                    </Button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Violations Tab */}
        <TabsContent value="violations">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Otvoreni prekršaji</CardTitle>
                  <CardDescription>Prekršaji koji čekaju na rješavanje</CardDescription>
                </div>
                <Button onClick={() => setViolationDialog(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Novi prekršaj
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {violations.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nema otvorenih prekršaja
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vez</TableHead>
                      <TableHead>Tip</TableHead>
                      <TableHead>Plovilo</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Prijavljeno</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {violations.map((v) => (
                      <TableRow key={v.id}>
                        <TableCell className="font-medium">{v.berth_code || '-'}</TableCell>
                        <TableCell>
                          <Badge variant="destructive">
                            {VIOLATION_TYPE_LABELS[v.violation_type as ViolationType]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {v.vessel_name || v.vessel_registration || '-'}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {VIOLATION_STATUS_LABELS[v.status as keyof typeof VIOLATION_STATUS_LABELS]}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(v.created_at).toLocaleDateString('hr-HR')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Damage Reports Tab */}
        <TabsContent value="damage">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Prijavljeni kvarovi</CardTitle>
                  <CardDescription>Kvarovi i oštećenja u obradi</CardDescription>
                </div>
                <Button onClick={() => setDamageDialog(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Novi kvar
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {damageReports.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nema prijavljenih kvarova
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Lokacija</TableHead>
                      <TableHead>Naziv</TableHead>
                      <TableHead>Kategorija</TableHead>
                      <TableHead>Hitnost</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Prijavljeno</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {damageReports.map((d) => (
                      <TableRow key={d.id}>
                        <TableCell className="font-medium">
                          {LOCATION_TYPE_LABELS[d.location_type as LocationType]}
                          {d.berth_code && ` - ${d.berth_code}`}
                        </TableCell>
                        <TableCell>{d.title}</TableCell>
                        <TableCell>
                          {DAMAGE_CATEGORY_LABELS[d.category as DamageCategory]}
                        </TableCell>
                        <TableCell>
                          <Badge className={DAMAGE_SEVERITY_COLORS[d.severity as DamageSeverity]}>
                            {DAMAGE_SEVERITY_LABELS[d.severity as DamageSeverity]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {DAMAGE_STATUS_LABELS[d.status as keyof typeof DAMAGE_STATUS_LABELS]}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(d.created_at).toLocaleDateString('hr-HR')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Inspection Dialog */}
      <Dialog open={inspectionDialog} onOpenChange={setInspectionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Ship className="h-5 w-5" />
              Inspekcija veza {selectedBerth?.code}
            </DialogTitle>
            <DialogDescription>
              {selectedBerth?.status === 'occupied' ? 'Vez je označen kao ZAUZET' : 'Vez je označen kao SLOBODAN'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Status inspekcije *</Label>
              <Select
                value={inspectionForm.status}
                onValueChange={(v) => setInspectionForm({ ...inspectionForm, status: v as InspectionStatus })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Odaberi status..." />
                </SelectTrigger>
                <SelectContent>
                  {selectedBerth?.status === 'occupied' ? (
                    <>
                      <SelectItem value="correct">✅ Ispravan brod na vezu</SelectItem>
                      <SelectItem value="wrong_vessel">⚠️ Pogrešan brod</SelectItem>
                      <SelectItem value="missing_vessel">❓ Brod nije na vezu</SelectItem>
                    </>
                  ) : (
                    <>
                      <SelectItem value="empty_ok">✅ Prazan - OK</SelectItem>
                      <SelectItem value="illegal_mooring">🚨 Nelegalno vezivanje</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>

            {(inspectionForm.status === 'wrong_vessel' || inspectionForm.status === 'illegal_mooring') && (
              <>
                <div className="space-y-2">
                  <Label>Ime pronađenog plovila</Label>
                  <Input
                    value={inspectionForm.found_vessel_name}
                    onChange={(e) => setInspectionForm({ ...inspectionForm, found_vessel_name: e.target.value })}
                    placeholder="Npr. Sea Dream"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Registracija plovila</Label>
                  <Input
                    value={inspectionForm.found_vessel_registration}
                    onChange={(e) => setInspectionForm({ ...inspectionForm, found_vessel_registration: e.target.value })}
                    placeholder="Npr. KO-123-AB"
                  />
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label>Napomena</Label>
              <Textarea
                value={inspectionForm.notes}
                onChange={(e) => setInspectionForm({ ...inspectionForm, notes: e.target.value })}
                placeholder="Dodatne napomene..."
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setInspectionDialog(false)}>
                Odustani
              </Button>
              <Button onClick={handleSaveInspection} disabled={isSavingInspection}>
                {isSavingInspection && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Sačuvaj
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Violation Dialog */}
      <Dialog open={violationDialog} onOpenChange={setViolationDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Prijavi prekršaj
            </DialogTitle>
            <DialogDescription>
              Zabilježi prekršaj za daljnju obradu
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Tip prekršaja *</Label>
              <Select
                value={violationForm.violation_type}
                onValueChange={(v) => setViolationForm({ ...violationForm, violation_type: v as ViolationType })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Odaberi tip..." />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(VIOLATION_TYPE_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Vez (opcionalno)</Label>
              <Select
                value={violationForm.berth_code}
                onValueChange={(v) => setViolationForm({ ...violationForm, berth_code: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Odaberi vez..." />
                </SelectTrigger>
                <SelectContent>
                  {berths.map((b) => (
                    <SelectItem key={b.id} value={b.code}>{b.code}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Ime plovila</Label>
                <Input
                  value={violationForm.vessel_name}
                  onChange={(e) => setViolationForm({ ...violationForm, vessel_name: e.target.value })}
                  placeholder="Ime broda"
                />
              </div>
              <div className="space-y-2">
                <Label>Registracija</Label>
                <Input
                  value={violationForm.vessel_registration}
                  onChange={(e) => setViolationForm({ ...violationForm, vessel_registration: e.target.value })}
                  placeholder="KO-123-AB"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Opis prekršaja *</Label>
              <Textarea
                value={violationForm.description}
                onChange={(e) => setViolationForm({ ...violationForm, description: e.target.value })}
                placeholder="Opišite situaciju detaljno..."
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setViolationDialog(false)}>
                Odustani
              </Button>
              <Button onClick={handleSaveViolation} disabled={isSavingViolation} variant="destructive">
                {isSavingViolation && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Prijavi prekršaj
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Damage Report Dialog */}
      <Dialog open={damageDialog} onOpenChange={setDamageDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5 text-yellow-500" />
              Prijavi kvar
            </DialogTitle>
            <DialogDescription>
              Prijavi oštećenje ili kvar za popravku
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tip lokacije *</Label>
                <Select
                  value={damageForm.location_type}
                  onValueChange={(v) => setDamageForm({ ...damageForm, location_type: v as LocationType })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Odaberi..." />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(LOCATION_TYPE_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {damageForm.location_type === 'berth' && (
                <div className="space-y-2">
                  <Label>Vez</Label>
                  <Select
                    value={damageForm.berth_code}
                    onValueChange={(v) => setDamageForm({ ...damageForm, berth_code: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Odaberi vez..." />
                    </SelectTrigger>
                    <SelectContent>
                      {berths.map((b) => (
                        <SelectItem key={b.id} value={b.code}>{b.code}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Kategorija *</Label>
                <Select
                  value={damageForm.category}
                  onValueChange={(v) => setDamageForm({ ...damageForm, category: v as DamageCategory })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Odaberi..." />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(DAMAGE_CATEGORY_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Hitnost *</Label>
                <Select
                  value={damageForm.severity}
                  onValueChange={(v) => setDamageForm({ ...damageForm, severity: v as DamageSeverity })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Odaberi..." />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(DAMAGE_SEVERITY_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Naslov *</Label>
              <Input
                value={damageForm.title}
                onChange={(e) => setDamageForm({ ...damageForm, title: e.target.value })}
                placeholder="Kratak opis kvara"
              />
            </div>

            <div className="space-y-2">
              <Label>Detaljan opis *</Label>
              <Textarea
                value={damageForm.description}
                onChange={(e) => setDamageForm({ ...damageForm, description: e.target.value })}
                placeholder="Opišite kvar detaljno..."
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setDamageDialog(false)}>
                Odustani
              </Button>
              <Button onClick={handleSaveDamage} disabled={isSavingDamage}>
                {isSavingDamage && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Prijavi kvar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
