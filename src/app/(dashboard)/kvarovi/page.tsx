'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Wrench,
  CheckCircle,
  Clock,
  Loader2,
  Play,
  X,
  Eye,
  User,
} from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabase/client';
import { ClickableImage } from '@/components/ui/image-lightbox';
import { useAuthStore } from '@/stores/authStore';

interface DamageReport {
  id: string;
  title: string;
  description: string;
  location_type: string;
  location_description: string;
  category: string;
  severity: string;
  status: string;
  photo_urls?: string[];
  reported_by_name: string;
  created_at: string;
  updated_at: string;
}

const STATUS_LABELS: Record<string, string> = {
  reported: 'Prijavljeno',
  acknowledged: 'Primljeno',
  in_progress: 'U obradi',
  completed: 'Riješeno',
  cancelled: 'Otkazano',
};

const STATUS_COLORS: Record<string, string> = {
  reported: 'bg-yellow-500',
  acknowledged: 'bg-blue-500',
  in_progress: 'bg-orange-500',
  completed: 'bg-green-500',
  cancelled: 'bg-gray-500',
};

const SEVERITY_LABELS: Record<string, string> = {
  low: 'Niska',
  medium: 'Srednja',
  high: 'Visoka',
  critical: 'Kritična',
};

const SEVERITY_COLORS: Record<string, string> = {
  low: 'bg-green-100 text-green-800',
  medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-orange-100 text-orange-800',
  critical: 'bg-red-100 text-red-800',
};

const CATEGORY_LABELS: Record<string, string> = {
  electrical: 'Električni kvar',
  plumbing: 'Vodovodni kvar',
  structural: 'Konstrukcijski problem',
  safety: 'Sigurnosni problem',
  cleanliness: 'Čistoća',
  equipment: 'Oprema',
  other: 'Ostalo',
};

export default function KvaroviPage() {
  const user = useAuthStore((state) => state.user);
  const [reports, setReports] = useState<DamageReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'active' | 'all'>('active');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const loadReports = async () => {
    try {
      const supabase = getSupabaseClient();
      let query = supabase
        .from('damage_reports')
        .select('*')
        .order('created_at', { ascending: false });

      if (filter === 'active') {
        query = query.in('status', ['reported', 'acknowledged', 'in_progress']);
      }

      const { data, error } = await query;

      if (error) throw error;
      setReports(data || []);
    } catch (err) {
      console.error('Error loading reports:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, [filter]);

  // Real-time subscription
  useEffect(() => {
    const supabase = getSupabaseClient();
    const channel = supabase
      .channel('damage_reports_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'damage_reports' },
        () => loadReports()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [filter]);

  const updateStatus = async (id: string, newStatus: string) => {
    setUpdatingId(id);
    try {
      const supabase = getSupabaseClient();
      const updateData: Record<string, unknown> = { status: newStatus };

      if (newStatus === 'completed') {
        updateData.completed_by = user?.id;
        updateData.completed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('damage_reports')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;
      await loadReports();
    } catch (err) {
      alert('Greška: ' + (err as Error).message);
    } finally {
      setUpdatingId(null);
    }
  };

  const activeCount = reports.filter(r =>
    ['reported', 'acknowledged', 'in_progress'].includes(r.status)
  ).length;

  const newCount = reports.filter(r => r.status === 'reported').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Wrench className="h-6 w-6" />
            Prijavljeni kvarovi
          </h1>
          <p className="text-muted-foreground">
            Pregled i upravljanje prijavljenim tehničkim problemima
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={filter === 'active' ? 'default' : 'outline'}
            onClick={() => setFilter('active')}
            size="sm"
          >
            Aktivni ({activeCount})
          </Button>
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            onClick={() => setFilter('all')}
            size="sm"
          >
            Svi
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Novi
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{newCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              U obradi
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {reports.filter(r => r.status === 'in_progress').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Riješeno
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {reports.filter(r => r.status === 'completed').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Ukupno
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reports.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Reports List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : reports.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
            <p className="text-lg font-medium">Nema prijavljenih kvarova</p>
            <p className="text-muted-foreground">Svi problemi su riješeni!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {reports.map((report) => (
            <Card key={report.id} className="overflow-hidden">
              <div className="flex flex-col lg:flex-row">
                {/* Photo */}
                {report.photo_urls && report.photo_urls.length > 0 && (
                  <div className="lg:w-48 lg:h-auto h-48 flex-shrink-0">
                    <ClickableImage
                      src={report.photo_urls[0]}
                      alt={report.title}
                    >
                      <img
                        src={report.photo_urls[0]}
                        alt={report.title}
                        className="w-full h-full object-cover"
                      />
                    </ClickableImage>
                  </div>
                )}

                {/* Content */}
                <div className="flex-1 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className={STATUS_COLORS[report.status]}>
                        {STATUS_LABELS[report.status]}
                      </Badge>
                      <Badge variant="outline" className={SEVERITY_COLORS[report.severity]}>
                        {SEVERITY_LABELS[report.severity]}
                      </Badge>
                      <Badge variant="outline">
                        {CATEGORY_LABELS[report.category] || report.category}
                      </Badge>
                    </div>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(report.created_at).toLocaleDateString('hr-HR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  <h3 className="font-semibold mb-1">{report.title}</h3>
                  <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                    {report.description}
                  </p>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground mb-3">
                    <span className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {report.reported_by_name || 'Nepoznato'}
                    </span>
                    <span>
                      Lokacija: {report.location_description}
                    </span>
                  </div>

                  {/* Actions */}
                  {report.status !== 'completed' && report.status !== 'cancelled' && (
                    <div className="flex flex-wrap gap-2">
                      {report.status === 'reported' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateStatus(report.id, 'acknowledged')}
                          disabled={updatingId === report.id}
                        >
                          {updatingId === report.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <Eye className="h-4 w-4 mr-1" />
                              Primljeno
                            </>
                          )}
                        </Button>
                      )}
                      {(report.status === 'reported' || report.status === 'acknowledged') && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-orange-600 border-orange-600 hover:bg-orange-50"
                          onClick={() => updateStatus(report.id, 'in_progress')}
                          disabled={updatingId === report.id}
                        >
                          {updatingId === report.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <Play className="h-4 w-4 mr-1" />
                              Započni rad
                            </>
                          )}
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-green-600 border-green-600 hover:bg-green-50"
                        onClick={() => updateStatus(report.id, 'completed')}
                        disabled={updatingId === report.id}
                      >
                        {updatingId === report.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Završeno
                          </>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-gray-500"
                        onClick={() => updateStatus(report.id, 'cancelled')}
                        disabled={updatingId === report.id}
                      >
                        {updatingId === report.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <X className="h-4 w-4 mr-1" />
                            Otkaži
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
