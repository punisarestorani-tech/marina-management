'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Wrench,
  CheckCircle,
  Clock,
  Loader2,
  MapPin,
  AlertTriangle,
  ClipboardCheck,
} from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabase/client';
import { ClickableImage } from '@/components/ui/image-lightbox';
import { useAuthStore } from '@/stores/authStore';
import { RepairReportDialog } from '@/components/damage-reports/RepairReportDialog';
import { DamageReport } from '@/types/inspection.types';

const STATUS_LABELS: Record<string, string> = {
  in_progress: 'U obradi',
  completed: 'Zavrseno',
};

const STATUS_COLORS: Record<string, string> = {
  in_progress: 'bg-orange-500',
  completed: 'bg-green-500',
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

export default function MojiZadaciPage() {
  const user = useAuthStore((state) => state.user);
  const [reports, setReports] = useState<DamageReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'active' | 'completed'>('active');
  const [selectedReport, setSelectedReport] = useState<DamageReport | null>(null);
  const [repairDialogOpen, setRepairDialogOpen] = useState(false);

  const loadReports = async () => {
    if (!user) return;

    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('damage_reports')
        .select('*')
        .eq('assigned_to', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReports((data as DamageReport[]) || []);
    } catch (err) {
      console.error('Error loading reports:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, [user]);

  // Real-time subscription
  useEffect(() => {
    if (!user) return;

    const supabase = getSupabaseClient();
    const channel = supabase
      .channel('my_damage_reports')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'damage_reports',
          filter: `assigned_to=eq.${user.id}`,
        },
        () => loadReports()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const activeReports = reports.filter((r) => r.status === 'in_progress');
  const completedReports = reports.filter((r) => r.status === 'completed');

  const displayedReports = activeTab === 'active' ? activeReports : completedReports;

  if (!user) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <ClipboardCheck className="h-6 w-6" />
          Moji zadaci
        </h1>
        <p className="text-muted-foreground">Pregled dodijeljenih zadataka za popravku</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Aktivni</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{activeReports.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Zavrseni</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{completedReports.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Ukupno</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reports.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as 'active' | 'completed')}
      >
        <TabsList>
          <TabsTrigger value="active">Aktivni ({activeReports.length})</TabsTrigger>
          <TabsTrigger value="completed">Zavrseni ({completedReports.length})</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : displayedReports.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                {activeTab === 'active' ? (
                  <>
                    <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                    <p className="text-lg font-medium">Nema aktivnih zadataka</p>
                    <p className="text-muted-foreground">Svi zadaci su zavrseni!</p>
                  </>
                ) : (
                  <>
                    <Wrench className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <p className="text-lg font-medium">Nema zavrsenih zadataka</p>
                  </>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {displayedReports.map((report) => (
                <Card key={report.id} className="overflow-hidden">
                  <div className="flex flex-col lg:flex-row">
                    {/* Photo */}
                    {report.photo_urls && report.photo_urls.length > 0 && (
                      <div className="lg:w-48 lg:h-auto h-48 flex-shrink-0">
                        <ClickableImage src={report.photo_urls[0]} alt={report.title}>
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
                            {STATUS_LABELS[report.status] || report.status}
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
                          })}
                        </span>
                      </div>

                      <h3 className="font-semibold mb-1">{report.title}</h3>
                      <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                        {report.description}
                      </p>

                      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground mb-3">
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {report.location_description}
                        </span>
                        {report.severity === 'critical' && (
                          <span className="flex items-center gap-1 text-red-600 font-medium">
                            <AlertTriangle className="h-3 w-3" />
                            Hitno!
                          </span>
                        )}
                      </div>

                      {/* Actions */}
                      {report.status === 'in_progress' && (
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => {
                            setSelectedReport(report);
                            setRepairDialogOpen(true);
                          }}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Zavrsi popravku
                        </Button>
                      )}

                      {/* Show completion info */}
                      {report.status === 'completed' && (
                        <div className="mt-2 p-3 bg-green-50 dark:bg-green-900/30 rounded-lg">
                          <p className="text-sm font-medium text-green-800 dark:text-green-200">
                            Zavrseno:{' '}
                            {report.completed_at &&
                              new Date(report.completed_at).toLocaleDateString('hr-HR', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                          </p>
                          {report.resolution_notes && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {report.resolution_notes}
                            </p>
                          )}
                          {report.completion_photo_urls && report.completion_photo_urls.length > 0 && (
                            <div className="flex gap-2 mt-2">
                              {report.completion_photo_urls.map((url, idx) => (
                                <ClickableImage key={idx} src={url} alt={`Popravka ${idx + 1}`}>
                                  <img
                                    src={url}
                                    alt={`Popravka ${idx + 1}`}
                                    className="w-16 h-16 object-cover rounded border"
                                  />
                                </ClickableImage>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Repair Report Dialog */}
      {selectedReport && (
        <RepairReportDialog
          isOpen={repairDialogOpen}
          onClose={() => {
            setRepairDialogOpen(false);
            setSelectedReport(null);
          }}
          report={selectedReport}
          userId={user.id}
          onCompleted={loadReports}
        />
      )}
    </div>
  );
}
