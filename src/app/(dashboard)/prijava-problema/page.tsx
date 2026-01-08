'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  AlertCircle,
  Camera,
  CheckCircle,
  Loader2,
  Send,
  Clock,
} from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabase/client';
import { PhotoUpload } from '@/components/ui/photo-upload';
import { ClickableImage } from '@/components/ui/image-lightbox';
import { useAuthStore } from '@/stores/authStore';

interface ReportedIssue {
  id: string;
  description: string;
  status: string;
  photo_urls?: string[];
  created_at: string;
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

export default function PrijavaProblemaPage() {
  const user = useAuthStore((state) => state.user);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [myReports, setMyReports] = useState<ReportedIssue[]>([]);
  const [isLoadingReports, setIsLoadingReports] = useState(true);

  // Form state
  const [description, setDescription] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');

  // Load user's recent reports
  useEffect(() => {
    const loadMyReports = async () => {
      if (!user) return;

      try {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase
          .from('damage_reports')
          .select('id, description, status, photo_urls, created_at')
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
    if (!description.trim()) {
      alert('Unesi opis problema!');
      return;
    }

    setIsSubmitting(true);
    try {
      const supabase = getSupabaseClient();

      const { error } = await supabase.from('damage_reports').insert({
        title: description.trim().substring(0, 50) + (description.length > 50 ? '...' : ''),
        description: description.trim(),
        location_type: 'other',
        location_description: 'Prijava problema',
        category: 'other',
        severity: 'medium',
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
      setDescription('');
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
              Opisi problem i dodaj fotografiju. Manager i Admin ce dobiti obavijest.
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
                {/* Description */}
                <div className="space-y-2">
                  <Label>Opis problema *</Label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Opisi problem, lokaciju i sve detalje..."
                    rows={6}
                    className="text-base"
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
                      <p className="flex-1 text-sm line-clamp-2">{report.description}</p>
                      <Badge className={STATUS_COLORS[report.status]} variant="secondary">
                        {STATUS_LABELS[report.status]}
                      </Badge>
                    </div>
                    {report.photo_urls && report.photo_urls.length > 0 && (
                      <ClickableImage
                        src={report.photo_urls[0]}
                        alt="Slika problema"
                      >
                        <img
                          src={report.photo_urls[0]}
                          alt="Slika problema"
                          className="mt-2 w-full h-24 object-cover rounded"
                        />
                      </ClickableImage>
                    )}
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
