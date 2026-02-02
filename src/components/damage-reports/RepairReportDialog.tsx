'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, CheckCircle, Camera, X } from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabase/client';
import { PhotoUpload } from '@/components/ui/photo-upload';
import { DamageReport } from '@/types/inspection.types';

interface RepairReportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  report: DamageReport;
  userId: string;
  onCompleted: () => void;
}

export function RepairReportDialog({
  isOpen,
  onClose,
  report,
  userId,
  onCompleted,
}: RepairReportDialogProps) {
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [completionPhotoUrls, setCompletionPhotoUrls] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleComplete = async () => {
    if (!resolutionNotes.trim()) {
      alert('Unesite opis popravke!');
      return;
    }

    setIsSubmitting(true);
    try {
      const supabase = getSupabaseClient();

      const { error } = await supabase
        .from('damage_reports')
        .update({
          status: 'completed',
          resolution_notes: resolutionNotes.trim(),
          completion_photo_urls: completionPhotoUrls.length > 0 ? completionPhotoUrls : null,
          completed_by: userId,
          completed_at: new Date().toISOString(),
        })
        .eq('id', report.id);

      if (error) throw error;

      // Reset form
      setResolutionNotes('');
      setCompletionPhotoUrls([]);

      onCompleted();
      onClose();
    } catch (err) {
      alert('Greska: ' + (err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddPhoto = (url: string) => {
    setCompletionPhotoUrls(prev => [...prev, url]);
  };

  const handleRemovePhoto = (index: number) => {
    setCompletionPhotoUrls(prev => prev.filter((_, i) => i !== index));
  };

  const handleClose = () => {
    setResolutionNotes('');
    setCompletionPhotoUrls([]);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Zavrsi popravku
          </DialogTitle>
          <DialogDescription>
            Opisi izvrsenu popravku i dodaj fotografije zavrsenog posla
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          {/* Original problem info */}
          <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
            <p className="text-sm font-medium">{report.title}</p>
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{report.description}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Lokacija: {report.location_description}
            </p>
          </div>

          {/* Resolution notes */}
          <div className="space-y-2">
            <Label>Opis popravke *</Label>
            <Textarea
              value={resolutionNotes}
              onChange={(e) => setResolutionNotes(e.target.value)}
              placeholder="Opisi sta je uradjeno, koji su materijali koristeni..."
              rows={4}
            />
          </div>

          {/* Completion photos */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Camera className="h-4 w-4" />
              Fotografije zavrsenog posla
            </Label>
            <PhotoUpload
              currentPhotoUrl=""
              onPhotoUploaded={handleAddPhoto}
              onPhotoRemoved={() => {}}
              bucketName="vessel-photos"
              folderPath="repairs"
            />
            {completionPhotoUrls.length > 0 && (
              <div className="flex gap-2 flex-wrap mt-2">
                {completionPhotoUrls.map((url, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={url}
                      alt={`Foto ${index + 1}`}
                      className="w-20 h-20 object-cover rounded border"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemovePhoto(index)}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600 transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={handleClose}>
              Odustani
            </Button>
            <Button
              onClick={handleComplete}
              disabled={isSubmitting || !resolutionNotes.trim()}
              className="bg-green-600 hover:bg-green-700"
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Oznaci kao zavrseno
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
