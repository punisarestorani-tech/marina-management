'use client';

import { useAuthStore } from '@/stores/authStore';
import { hasPermission } from '@/lib/auth/rbac';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import {
  Anchor,
  Ship,
  FileText,
  CreditCard,
  AlertTriangle,
  Map,
  TrendingDown,
  Loader2,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabase/client';

interface DashboardStats {
  totalBerths: number;
  occupiedBerths: number;
  freeBerths: number;
  activeContracts: number;
  pendingPayments: number;
  overduePayments: number;
  openViolations: number;
}

interface PontoonOccupancy {
  name: string;
  code: string;
  occupied: number;
  total: number;
}

interface RecentActivity {
  action: string;
  detail: string;
  time: string;
  tableName: string;
}

export default function DashboardPage() {
  const user = useAuthStore((state) => state.user);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    totalBerths: 0,
    occupiedBerths: 0,
    freeBerths: 0,
    activeContracts: 0,
    pendingPayments: 0,
    overduePayments: 0,
    openViolations: 0,
  });
  const [pontoonOccupancy, setPontoonOccupancy] = useState<PontoonOccupancy[]>([]);
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        const supabase = getSupabaseClient();
        const today = new Date().toISOString().split('T')[0];

        // Fetch all berths
        const { data: berths } = await supabase
          .from('berths')
          .select('id, code, pontoon_id, status')
          .eq('status', 'active')
          .order('code');

        const totalBerths = berths?.length || 0;

        // Fetch current bookings (checked_in) - filter by today's date
        const { data: currentBookings } = await supabase
          .from('berth_bookings')
          .select('berth_id, berth_code')
          .eq('status', 'checked_in')
          .lte('check_in_date', today)
          .gte('check_out_date', today);

        const occupiedBerths = currentBookings?.length || 0;
        const freeBerths = totalBerths - occupiedBerths;

        // Fetch active contracts
        const { data: contracts } = await supabase
          .from('lease_contracts')
          .select('id')
          .eq('status', 'active');

        const activeContracts = contracts?.length || 0;

        // Fetch pending payments
        const { data: pendingPaymentsData } = await supabase
          .from('payments')
          .select('id')
          .eq('status', 'pending');

        const pendingPayments = pendingPaymentsData?.length || 0;

        // Fetch overdue payments
        const { data: overduePaymentsData } = await supabase
          .from('payments')
          .select('id')
          .eq('status', 'overdue');

        const overduePayments = overduePaymentsData?.length || 0;

        // Fetch open violations
        const { data: violations } = await supabase
          .from('violations')
          .select('id')
          .eq('status', 'open');

        const openViolations = violations?.length || 0;

        setStats({
          totalBerths,
          occupiedBerths,
          freeBerths,
          activeContracts,
          pendingPayments,
          overduePayments,
          openViolations,
        });

        // Fetch pontoon occupancy
        const { data: pontoons } = await supabase
          .from('pontoons')
          .select('id, name, code')
          .eq('is_active', true)
          .order('code');

        if (pontoons && berths) {
          // Get occupied berth codes from bookings
          const occupiedBerthCodes = new Set(currentBookings?.map(b => b.berth_code) || []);

          const pontoonStats = pontoons.map(pontoon => {
            // Filter berths by pontoon - berth code starts with pontoon code (e.g., "A-01" starts with "A")
            const pontoonBerths = berths.filter(b => b.code.startsWith(pontoon.code + '-'));
            // Count occupied berths by matching berth codes
            const occupiedCount = pontoonBerths.filter(b => occupiedBerthCodes.has(b.code)).length;

            return {
              name: `Ponton ${pontoon.code}`,
              code: pontoon.code,
              occupied: occupiedCount,
              total: pontoonBerths.length,
            };
          }).filter(p => p.total > 0);

          setPontoonOccupancy(pontoonStats);
        }

        // Fetch recent activities from audit_logs
        const { data: auditLogs } = await supabase
          .from('audit_logs')
          .select('action, table_name, new_data, created_at')
          .order('created_at', { ascending: false })
          .limit(5);

        if (auditLogs) {
          const activities = auditLogs.map(log => {
            let detail = '';
            const newData = log.new_data as Record<string, unknown> | null;

            switch (log.table_name) {
              case 'berth_bookings':
                detail = newData?.guest_name
                  ? `${newData.guest_name} - Vez ${newData.berth_code}`
                  : 'Rezervacija';
                break;
              case 'vessels':
                detail = newData?.registration_number
                  ? `${newData.registration_number} registrovano`
                  : 'Plovilo';
                break;
              case 'payments':
                detail = newData?.amount
                  ? `Iznos: ${newData.amount} EUR`
                  : 'Plaćanje';
                break;
              case 'lease_contracts':
                detail = newData?.owner_name
                  ? `Ugovor - ${newData.owner_name}`
                  : 'Ugovor';
                break;
              case 'violations':
                detail = newData?.type
                  ? `Prekršaj: ${newData.type}`
                  : 'Prekršaj';
                break;
              default:
                detail = log.table_name;
            }

            const actionLabels: Record<string, string> = {
              'INSERT': 'Novi unos',
              'UPDATE': 'Ažuriranje',
              'DELETE': 'Brisanje',
            };

            const tableLabels: Record<string, string> = {
              'berth_bookings': 'Rezervacija',
              'vessels': 'Plovilo',
              'payments': 'Plaćanje',
              'lease_contracts': 'Ugovor',
              'violations': 'Prekršaj',
              'daily_occupancy': 'Zauzetost',
            };

            return {
              action: `${actionLabels[log.action] || log.action} - ${tableLabels[log.table_name] || log.table_name}`,
              detail,
              time: formatTimeAgo(new Date(log.created_at)),
              tableName: log.table_name,
            };
          });

          setRecentActivities(activities);
        }

      } catch (error) {
        console.error('Error loading dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  if (!user) return null;

  const canViewPayments = hasPermission(user.role, 'VIEW_PAYMENTS');
  const canViewContracts = hasPermission(user.role, 'VIEW_CONTRACTS');
  const canViewViolations = hasPermission(user.role, 'VIEW_VIOLATIONS');

  const occupancyRate = stats.totalBerths > 0
    ? Math.round((stats.occupiedBerths / stats.totalBerths) * 100)
    : 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Dobrodošli, {user.full_name}
        </h1>
        <p className="text-muted-foreground">
          Pregled stanja marine za danas
        </p>
      </div>

      {/* Quick actions for inspector */}
      {user.role === 'inspector' && (
        <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div>
                <h3 className="font-semibold text-blue-900 dark:text-blue-100">
                  Započni dnevni obilazak
                </h3>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Otvori mapu i unesi stanje zauzetosti vezova
                </p>
              </div>
              <Button asChild size="lg">
                <Link href="/map">
                  <Map className="mr-2 h-5 w-5" />
                  Otvori Mapu
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Occupancy */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Zauzetost</CardTitle>
            <Anchor className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{occupancyRate}%</div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-green-700">
                {stats.freeBerths} slobodno
              </span>
              <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-red-700">
                {stats.occupiedBerths} zauzeto
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Total vessels */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Plovila danas</CardTitle>
            <Ship className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.occupiedBerths}</div>
            <p className="text-xs text-muted-foreground">
              od ukupno {stats.totalBerths} vezova
            </p>
          </CardContent>
        </Card>

        {/* Contracts - only visible to managers+ */}
        {canViewContracts && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Aktivni ugovori</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeContracts}</div>
              <p className="text-xs text-muted-foreground">
                Od ukupno {stats.totalBerths} vezova
              </p>
            </CardContent>
          </Card>
        )}

        {/* Payments - only visible to operators+ */}
        {canViewPayments && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Plaćanja</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pendingPayments}</div>
              <div className="flex items-center gap-1 text-xs">
                {stats.overduePayments > 0 && (
                  <span className="text-red-600 flex items-center">
                    <TrendingDown className="h-3 w-3 mr-1" />
                    {stats.overduePayments} dospjelo
                  </span>
                )}
                {stats.overduePayments === 0 && (
                  <span className="text-muted-foreground">
                    Nema dospjelih
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Violations - only visible to operators+ */}
        {canViewViolations && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Prekršaji</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.openViolations}</div>
              <p className="text-xs text-muted-foreground">
                Otvoreni slučajevi
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Berth status overview */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Occupancy by pontoon */}
        <Card>
          <CardHeader>
            <CardTitle>Zauzetost po pontonu</CardTitle>
            <CardDescription>
              Trenutno stanje svih pontona
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pontoonOccupancy.length > 0 ? (
                pontoonOccupancy.map((pontoon) => (
                  <div key={pontoon.code} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>{pontoon.name}</span>
                      <span className="text-muted-foreground">
                        {pontoon.occupied}/{pontoon.total}
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-800">
                      <div
                        className="h-2 rounded-full bg-blue-600"
                        style={{
                          width: `${pontoon.total > 0 ? (pontoon.occupied / pontoon.total) * 100 : 0}%`,
                        }}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">Nema podataka o pontonima</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent activity */}
        <Card>
          <CardHeader>
            <CardTitle>Nedavne aktivnosti</CardTitle>
            <CardDescription>
              Posljednje promjene u sistemu
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivities.length > 0 ? (
                recentActivities.map((activity, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="h-2 w-2 mt-2 rounded-full bg-blue-600" />
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium">{activity.action}</p>
                      <p className="text-xs text-muted-foreground">
                        {activity.detail}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {activity.time}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">Nema nedavnih aktivnosti</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Helper function to format time ago
function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'Upravo sada';
  if (diffMins < 60) return `Prije ${diffMins} min`;
  if (diffHours < 24) return `Prije ${diffHours} sat${diffHours === 1 ? '' : 'a'}`;
  if (diffDays < 7) return `Prije ${diffDays} dan${diffDays === 1 ? '' : 'a'}`;

  return date.toLocaleDateString('hr-HR');
}
