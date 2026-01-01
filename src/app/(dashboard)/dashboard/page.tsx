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
  TrendingUp,
  TrendingDown,
  Users,
} from 'lucide-react';

// Mock data - in production this would come from API
const stats = {
  totalBerths: 30,
  occupiedBerths: 12,
  freeBerths: 15,
  reservedBerths: 3,
  activeContracts: 5,
  pendingPayments: 4,
  overduePayments: 2,
  openViolations: 2,
};

export default function DashboardPage() {
  const user = useAuthStore((state) => state.user);

  if (!user) return null;

  const canViewPayments = hasPermission(user.role, 'VIEW_PAYMENTS');
  const canViewContracts = hasPermission(user.role, 'VIEW_CONTRACTS');
  const canViewViolations = hasPermission(user.role, 'VIEW_VIOLATIONS');

  const occupancyRate = Math.round((stats.occupiedBerths / stats.totalBerths) * 100);

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
              +2 od jučer
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
              {[
                { name: 'Ponton A', occupied: 5, total: 10 },
                { name: 'Ponton B', occupied: 4, total: 10 },
                { name: 'Ponton C', occupied: 3, total: 10 },
              ].map((pontoon) => (
                <div key={pontoon.name} className="space-y-2">
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
                        width: `${(pontoon.occupied / pontoon.total) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
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
              {[
                {
                  action: 'Unos zauzetosti',
                  detail: 'Vez A-04 - HR-1234-AB',
                  time: 'Prije 5 minuta',
                },
                {
                  action: 'Novo plovilo',
                  detail: 'SLO-7890-IJ registrovano',
                  time: 'Prije 1 sat',
                },
                {
                  action: 'Uplata',
                  detail: 'Ugovor #003 - 6.300 EUR',
                  time: 'Prije 2 sata',
                },
              ].map((activity, i) => (
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
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
