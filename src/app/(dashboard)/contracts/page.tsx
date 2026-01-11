'use client';

import { useState, useEffect, useRef } from 'react';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Search, Plus, FileText, Calendar, Euro, Upload, Download, Loader2, CheckCircle, File, RefreshCw, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { hr } from 'date-fns/locale';
import { getSupabaseClient } from '@/lib/supabase/client';

// Contract status types
type ContractStatus = 'active_paid' | 'active_partial' | 'active_unpaid' | 'no_contract' | 'expired';

// Contract interface based on berth_bookings + daily_occupancy
interface Contract {
  id: string;
  berth_code: string;
  vessel_registration: string | null;
  vessel_name: string | null;
  owner_name: string;
  owner_email: string | null;
  owner_phone: string | null;
  start_date: string | null;
  end_date: string | null;
  total_price: number;
  payment_status: string;
  status: ContractStatus;
  paid_amount: number;
  document_url?: string;
  source: 'booking' | 'inspector';
}

export default function ContractsPage() {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Determine contract status based on payment
  const getContractStatus = (totalPrice: number, paidAmount: number, isExpired: boolean): ContractStatus => {
    if (isExpired) return 'expired';
    if (totalPrice <= 0) return 'active_unpaid';
    const paidPercent = (paidAmount / totalPrice) * 100;
    if (paidPercent >= 100) return 'active_paid';
    if (paidPercent > 0) return 'active_partial';
    return 'active_unpaid';
  };

  // Fetch contracts from berth_bookings AND daily_occupancy
  const fetchContracts = async () => {
    setIsLoading(true);
    try {
      const supabase = getSupabaseClient();

      // 1. Fetch bookings as contracts - only long-term ones (more than 30 days)
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('berth_bookings')
        .select(`
          id,
          berth_code,
          guest_name,
          guest_email,
          guest_phone,
          vessel_name,
          vessel_registration,
          check_in_date,
          check_out_date,
          total_amount,
          amount_paid,
          payment_status,
          status
        `)
        .in('status', ['confirmed', 'checked_in', 'checked_out'])
        .order('check_in_date', { ascending: false });

      if (bookingsError) {
        console.error('Error loading contracts:', bookingsError);
      }

      // 2. Fetch today's daily_occupancy records (inspector recorded)
      const today = new Date().toISOString().split('T')[0];
      const { data: occupancyData, error: occupancyError } = await supabase
        .from('daily_occupancy')
        .select(`
          id,
          berth_id,
          vessel_id,
          date,
          status,
          notes,
          berths!inner(code),
          vessels(name, registration_number, owner_name, owner_email, owner_phone)
        `)
        .eq('date', today)
        .eq('status', 'occupied');

      if (occupancyError) {
        console.error('Error loading occupancy:', occupancyError);
      }

      // Transform bookings to contract format
      const bookingContracts: Contract[] = (bookingsData || [])
        .filter((b: any) => {
          const checkIn = new Date(b.check_in_date);
          const checkOut = new Date(b.check_out_date);
          const days = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
          return days >= 30; // Only show bookings >= 30 days as contracts
        })
        .map((b: any) => {
          const isExpired = b.status === 'checked_out';
          const status = getContractStatus(b.total_amount, b.amount_paid || 0, isExpired);
          return {
            id: b.id,
            berth_code: b.berth_code,
            vessel_registration: b.vessel_registration,
            vessel_name: b.vessel_name,
            owner_name: b.guest_name,
            owner_email: b.guest_email,
            owner_phone: b.guest_phone,
            start_date: b.check_in_date,
            end_date: b.check_out_date,
            total_price: b.total_amount,
            payment_status: b.payment_status,
            status,
            paid_amount: b.amount_paid || 0,
            source: 'booking' as const,
          };
        });

      // Get set of berth codes that have bookings
      const berthCodesWithBookings = new Set(bookingContracts.map(c => c.berth_code));

      // Transform occupancy records for vessels WITHOUT bookings
      const inspectorRecords: Contract[] = (occupancyData || [])
        .filter((o: any) => {
          const berthCode = o.berths?.code;
          // Only include if this berth doesn't have a booking
          return berthCode && !berthCodesWithBookings.has(berthCode) && o.vessel_id;
        })
        .map((o: any) => ({
          id: o.id,
          berth_code: o.berths?.code || 'N/A',
          vessel_registration: o.vessels?.registration_number || null,
          vessel_name: o.vessels?.name || 'Nepoznato plovilo',
          owner_name: o.vessels?.owner_name || 'Nepoznat vlasnik',
          owner_email: o.vessels?.owner_email || null,
          owner_phone: o.vessels?.owner_phone || null,
          start_date: null,
          end_date: null,
          total_price: 0,
          payment_status: 'none',
          status: 'no_contract' as ContractStatus,
          paid_amount: 0,
          source: 'inspector' as const,
        }));

      // Combine and sort all records
      const allContracts = [...bookingContracts, ...inspectorRecords]
        .sort((a, b) => {
          const [aPontoon, aNum] = a.berth_code.split('-');
          const [bPontoon, bNum] = b.berth_code.split('-');
          if (aPontoon !== bPontoon) {
            return aPontoon.localeCompare(bPontoon);
          }
          return parseInt(aNum) - parseInt(bNum);
        });

      setContracts(allContracts);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchContracts();
  }, []);

  const filteredContracts = contracts.filter((contract) => {
    const matchesSearch =
      contract.berth_code.toLowerCase().includes(search.toLowerCase()) ||
      (contract.vessel_registration && contract.vessel_registration.toLowerCase().includes(search.toLowerCase())) ||
      (contract.vessel_name && contract.vessel_name.toLowerCase().includes(search.toLowerCase())) ||
      contract.owner_name.toLowerCase().includes(search.toLowerCase());

    // Handle status filter
    let matchesStatus = filterStatus === 'all';
    if (filterStatus === 'active') {
      matchesStatus = ['active_paid', 'active_partial', 'active_unpaid'].includes(contract.status);
    } else if (filterStatus === 'no_contract') {
      matchesStatus = contract.status === 'no_contract';
    } else if (filterStatus === 'expired') {
      matchesStatus = contract.status === 'expired';
    }

    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: ContractStatus) => {
    switch (status) {
      case 'active_paid':
        return <Badge className="bg-green-500 hover:bg-green-600">Plaćen</Badge>;
      case 'active_partial':
        return <Badge className="bg-yellow-500 hover:bg-yellow-600">Djelimično</Badge>;
      case 'active_unpaid':
        return <Badge className="bg-orange-500 hover:bg-orange-600">Neplaćen</Badge>;
      case 'no_contract':
        return <Badge variant="destructive" className="flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" />
          Bez ugovora
        </Badge>;
      case 'expired':
        return <Badge variant="secondary">Istekao</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  // Calculate totals only for active contracts (with actual contracts, not "no_contract")
  const activeContracts = contracts.filter(c =>
    ['active_paid', 'active_partial', 'active_unpaid'].includes(c.status)
  );
  const noContractCount = contracts.filter(c => c.status === 'no_contract').length;
  const totalRevenue = activeContracts.reduce((sum, c) => sum + c.total_price, 0);
  const totalPaid = activeContracts.reduce((sum, c) => sum + c.paid_amount, 0);

  const handleOpenUploadDialog = (contract: Contract) => {
    setSelectedContract(contract);
    setUploadSuccess(false);
    setUploadDialogOpen(true);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedContract) return;

    setUploading(true);
    try {
      const supabase = getSupabaseClient();
      const fileExt = file.name.split('.').pop();
      const fileName = `${selectedContract.id}_${Date.now()}.${fileExt}`;
      const filePath = `contracts/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('contract-documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('contract-documents')
        .getPublicUrl(filePath);

      setContracts(prev => prev.map(c =>
        c.id === selectedContract.id
          ? { ...c, document_url: publicUrl }
          : c
      ));

      setUploadSuccess(true);
      setTimeout(() => {
        setUploadDialogOpen(false);
        setUploadSuccess(false);
      }, 1500);
    } catch (error) {
      console.error('Error uploading document:', error);
      alert('Greška pri uploadu dokumenta');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Calculate contract duration and payment type based on duration
  const getPaymentSchedule = (startDate: string | null, endDate: string | null) => {
    if (!startDate || !endDate) return '-';
    const start = new Date(startDate);
    const end = new Date(endDate);
    const months = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30));

    if (months >= 10) return 'Godišnje';
    if (months >= 3) return 'Sezonski';
    return 'Mjesečno';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Ugovori</h1>
          <p className="text-muted-foreground">
            Upravljanje ugovorima o zakupu vezova
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchContracts} disabled={isLoading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Osvježi
          </Button>
          <Button asChild>
            <Link href="/contracts/new">
              <Plus className="mr-2 h-4 w-4" />
              Novi ugovor
            </Link>
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Aktivni ugovori</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeContracts.length}</div>
            <p className="text-xs text-muted-foreground">sa ugovorom</p>
          </CardContent>
        </Card>
        <Card className={noContractCount > 0 ? 'border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950' : ''}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              {noContractCount > 0 && <AlertTriangle className="h-4 w-4 text-red-500" />}
              Bez ugovora
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${noContractCount > 0 ? 'text-red-600' : ''}`}>
              {noContractCount}
            </div>
            <p className="text-xs text-muted-foreground">evidentirano bez ugovora</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Ukupna vrijednost</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-1">
              <Euro className="h-5 w-5" />
              {totalRevenue.toLocaleString('hr-HR', { minimumFractionDigits: 2 })}
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
              {totalPaid.toLocaleString('hr-HR', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">
              {totalRevenue > 0 ? Math.round((totalPaid / totalRevenue) * 100) : 0}% od ukupnog
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
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Svi statusi</SelectItem>
                <SelectItem value="active">Aktivni ugovori</SelectItem>
                <SelectItem value="no_contract">Bez ugovora</SelectItem>
                <SelectItem value="expired">Istekli</SelectItem>
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
            Prikazano {filteredContracts.length} od {contracts.length} ugovora
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : contracts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p>Nema ugovora za prikaz</p>
            </div>
          ) : (
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
              {filteredContracts.map((contract) => {
                const paymentProgress = contract.total_price > 0
                  ? Math.min(100, Math.round((contract.paid_amount / contract.total_price) * 100))
                  : 0;
                const isNoContract = contract.status === 'no_contract';
                return (
                <TableRow key={contract.id} className={isNoContract ? 'bg-red-50 dark:bg-red-950/30' : ''}>
                  <TableCell className="font-medium">{contract.berth_code}</TableCell>
                  <TableCell>
                    <div>
                      <p>{contract.vessel_name || '-'}</p>
                      {contract.vessel_registration && (
                        <p className="text-xs text-muted-foreground font-mono">
                          {contract.vessel_registration}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{contract.owner_name}</TableCell>
                  <TableCell>
                    {isNoContract ? (
                      <span className="text-sm text-muted-foreground italic">Nema ugovora</span>
                    ) : contract.start_date && contract.end_date ? (
                      <div className="flex items-center gap-1 text-sm">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {format(new Date(contract.start_date), 'dd.MM.yy', { locale: hr })} -{' '}
                        {format(new Date(contract.end_date), 'dd.MM.yy', { locale: hr })}
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {isNoContract ? (
                      <span className="text-sm text-muted-foreground">-</span>
                    ) : (
                      <div>
                        <p>{contract.total_price.toLocaleString('hr-HR', { minimumFractionDigits: 2 })} EUR</p>
                        {contract.start_date && contract.end_date && (
                          <p className="text-xs text-muted-foreground">
                            {getPaymentSchedule(contract.start_date, contract.end_date)}
                          </p>
                        )}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {isNoContract ? (
                      <span className="text-sm text-muted-foreground">-</span>
                    ) : (
                      <div className="w-20">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span>{paymentProgress}%</span>
                        </div>
                        <div className="h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full">
                          <div
                            className={`h-1.5 rounded-full ${paymentProgress >= 100 ? 'bg-green-500' : paymentProgress > 0 ? 'bg-yellow-500' : 'bg-red-500'}`}
                            style={{
                              width: `${paymentProgress}%`,
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </TableCell>
                  <TableCell>{getStatusBadge(contract.status)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {isNoContract ? (
                        <Button variant="outline" size="sm" asChild className="text-xs">
                          <Link href={`/contracts/new?berth=${contract.berth_code}&vessel=${contract.vessel_registration || ''}`}>
                            <Plus className="mr-1 h-3 w-3" />
                            Kreiraj ugovor
                          </Link>
                        </Button>
                      ) : (
                        <>
                          {contract.document_url ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              asChild
                              title="Preuzmi dokument"
                            >
                              <a href={contract.document_url} target="_blank" rel="noopener noreferrer">
                                <Download className="h-4 w-4 text-green-600" />
                              </a>
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenUploadDialog(contract)}
                              title="Učitaj dokument"
                            >
                              <Upload className="h-4 w-4" />
                            </Button>
                          )}
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/contracts/${contract.id}`}>
                              <FileText className="h-4 w-4" />
                            </Link>
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )})}
            </TableBody>
          </Table>
          )}
        </CardContent>
      </Card>

      {/* Upload Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Učitaj dokument ugovora</DialogTitle>
            <DialogDescription>
              {selectedContract && (
                <>Ugovor za vez {selectedContract.berth_code} - {selectedContract.owner_name}</>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {uploadSuccess ? (
              <div className="flex flex-col items-center justify-center py-8 text-green-600">
                <CheckCircle className="h-12 w-12 mb-2" />
                <p className="font-medium">Dokument uspješno učitan!</p>
              </div>
            ) : (
              <>
                <div className="flex flex-col items-center justify-center border-2 border-dashed border-muted-foreground/25 rounded-lg p-8">
                  <File className="h-10 w-10 text-muted-foreground mb-4" />
                  <p className="text-sm text-muted-foreground mb-4">
                    PDF, DOC, DOCX ili slike (max 10MB)
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="contract-file-input"
                  />
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Učitavam...
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-4 w-4" />
                        Odaberi datoteku
                      </>
                    )}
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
