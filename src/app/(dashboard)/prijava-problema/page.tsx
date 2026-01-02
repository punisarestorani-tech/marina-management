'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertCircle,
  Camera,
  CheckCircle,
  Loader2,
  Send,
  Clock,
  MapPin,
} from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabase/client';
import { PhotoUpload } from '@/components/ui/photo-upload';
import { useAuthStore } from '@/stores/authStore';
import {
  LocationType,
  LOCATION_TYPE_LABELS,
  DamageCategory,
  DAMAGE_CATEGORY_LABELS,
  DamageSeverity,
  DAMAGE_SEVERITY_LABELS,
  DAMAGE_SEVERITY_COLORS,
  DAMAGE_STATUS_LABELS,
} from '@/types/inspection.types';

interface ReportedIssue {
  id: string;
  title: string;
  location_type: LocationType;
  berth_code?: string;
  category: DamageCategory;
  severity: DamageSeverity;
  status: string;
  created_at: string;
}

export default function PrijavaProblemaPage() {
  const user = useAuthStore((state) => state.user);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [myReports, setMyReports] = useState<ReportedIssue[]>([]);
  const [isLoadingReports, setIsLoadingReports] = useState(true);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [locationType, setLocationType] = useState<LocationType | ''>('');
  const [berthCode, setBerthCode] = useState('');
  const [category, setCategory] = useState<DamageCategory | ''>('');
  const [severity, setSeverity] = useState<DamageSeverity>('medium');
  const [photoUrl, setPhotoUrl] = useState('');

  // Load user's recent reports
  useEffect(() => {
    const loadMyReports = async () => {
      if (!user) return;

      try {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase
          .from('damage_reports')
          .select('id, title, location_type, berth_code, category, severity, status, created_at')
          .eq('reported_by', user.id)
          .order('created_at', { ascending: false })
          .limit(5);

        if (data) {
          setMyReports(data as ReportedIssue[]);
        }
      } catch (err) {
        console.error('Error loading reports:', err);
      } finally {
        setIsLoadingReports(false);
      }
    };

    loadMyReports();
  }, [user, submitted]);

  const handleSubmit = async () => {
    if (!title.trim()) {
      alert('Unesi naslov problema!');
      return;
    }
    if (!description.trim()) {
      alert('Unesi opis problema!');
      return;
    }
    if (!locationType) {
      alert('Odaberi tip lokacije!');
      return;
    }
    if (!category) {
      alert('Odaberi kategoriju problema!');
      return;
    }

    setIsSubmitting(true);
    try {
      const supabase = getSupabaseClient();

      const { error } = await supabase.from('damage_reports').insert({
        title: title.trim(),
        description: description.trim(),
        location_type: locationType,
        berth_code: berthCode.trim() || null,
        location_description: berthCode.trim() || title.trim(),
        category: category,
        severity: severity,
        photo_urls: photoUrl ? [photoUrl] : null,
        reported_by: user?.id,
        reported_by_name: user?.full_name,
        status: 'reported',
      });

      if (error) {
        alert('Greska: ' + error.message);
        return;
      }

      setSubmitted(true);
      // Reset form
      setTitle('');
      setDescription('');
      setLocationType('');
      setBerthCode('');
      setCategory('');
      setSeverity('medium');
      setPhotoUrl('');

      // Hide success message after 3 seconds
      setTimeout(() => setSubmitted(false), 3000);
    } catch (err) {
      alert('Greska: ' + (err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Prijavi problem</h1>
        <p className="text-muted-foreground">
          Prijavi kvar, ostecenje ili bilo koji problem u marini
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-500" />
              Nova prijava
            </CardTitle>
            <CardDescription>
              Popuni formu da prijavis problem. Manager i Admin ce dobiti obavijest.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {submitted ? (
              <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg p-6 text-center">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
                <p className="font-semibold text-green-700 dark:text-green-300 text-lg">
                  Problem prijavljen!
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Manager ce pregledati prijavu uskoro.
                </p>
              </div>
            ) : (
              <>
                {/* Title */}
                <div className="space-y-2">
                  <Label>Naslov problema *</Label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="npr. Pokvarena utičnica na pontonu A"
                  />
                </div>

                {/* Location Type & Berth */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Tip lokacije *</Label>
                    <Select value={locationType} onValueChange={(v) => setLocationType(v as LocationType)}>
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

                  <div className="space-y-2">
                    <Label>Vez (opciono)</Label>
                    <Input
                      value={berthCode}
                      onChange={(e) => setBerthCode(e.target.value.toUpperCase())}
                      placeholder="npr. A-15"
                    />
                  </div>
                </div>

                {/* Category & Severity */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Kategorija *</Label>
                    <Select value={category} onValueChange={(v) => setCategory(v as DamageCategory)}>
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
                    <Label>Hitnost</Label>
                    <Select value={severity} onValueChange={(v) => setSeverity(v as DamageSeverity)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(DAMAGE_SEVERITY_LABELS).map(([key, label]) => (
                          <SelectItem key={key} value={key}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label>Opis problema *</Label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Opisi problem detaljno..."
                    rows={4}
                  />
                </div>

                {/* Photo */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Camera className="h-4 w-4" />
                    Fotografija (opciono)
                  </Label>
                  <PhotoUpload
                    currentPhotoUrl={photoUrl}
                    onPhotoUploaded={setPhotoUrl}
                    onPhotoRemoved={() => setPhotoUrl('')}
                    bucketName="vessel-photos"
                    folderPath="issues"
                  />
                </div>

                {/* Submit */}
                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="w-full"
                  size="lg"
                >
                  {isSubmitting ? (
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  ) : (
                    <Send className="h-5 w-5 mr-2" />
                  )}
                  Posalji prijavu
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* My Recent Reports */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Moje prijave
            </CardTitle>
            <CardDescription>
              Zadnjih 5 prijava koje si poslao/la
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingReports ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : myReports.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <AlertCircle className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p>Nemas prijavljenih problema</p>
              </div>
            ) : (
              <div className="space-y-3">
                {myReports.map((report) => (
                  <div
                    key={report.id}
                    className="border rounded-lg p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{report.title}</p>
                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          {LOCATION_TYPE_LABELS[report.location_type]}
                          {report.berth_code && ` - ${report.berth_code}`}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Badge className={DAMAGE_SEVERITY_COLORS[report.severity]} variant="secondary">
                          {DAMAGE_SEVERITY_LABELS[report.severity]}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {DAMAGE_STATUS_LABELS[report.status as keyof typeof DAMAGE_STATUS_LABELS]}
                        </Badge>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      {new Date(report.created_at).toLocaleDateString('hr-HR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
