'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  X,
  Ship,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  Camera,
  MapPin,
  Anchor,
  HelpCircle,
} from 'lucide-react';
import { BerthMarker, BoatPlacement, BOAT_SIZES } from '@/types/boat.types';
import {
  InspectionStatus,
  INSPECTION_STATUS_LABELS,
} from '@/types/inspection.types';
import { getSupabaseClient } from '@/lib/supabase/client';
import { PhotoUpload } from '@/components/ui/photo-upload';

interface BerthInspectionPopupProps {
  marker: BerthMarker;
  expectedBoat?: BoatPlacement | null;
  onClose: () => void;
  onInspectionSaved?: () => void;
  inspectorId?: string;
  inspectorName?: string;
}

export function BerthInspectionPopup({
  marker,
  expectedBoat,
  onClose,
  onInspectionSaved,
  inspectorId,
  inspectorName,
}: BerthInspectionPopupProps) {
  const [status, setStatus] = useState<InspectionStatus | ''>('');
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Form for wrong vessel
  const [foundVesselName, setFoundVesselName] = useState('');
  const [foundVesselRegistration, setFoundVesselRegistration] = useState('');
  const [foundVesselPhoto, setFoundVesselPhoto] = useState('');

  const sizeInfo = expectedBoat ? BOAT_SIZES[expectedBoat.size] : null;

  const handleSaveInspection = async () => {
    if (!status) {
      alert('Odaberi status inspekcije!');
      return;
    }

    // Validate wrong vessel data
    if (status === 'wrong_vessel' || status === 'illegal_mooring') {
      if (!foundVesselRegistration.trim()) {
        alert('Unesi registraciju pronadjenog broda!');
        return;
      }
    }

    setIsSaving(true);
    try {
      const supabase = getSupabaseClient();

      const { error } = await supabase.from('inspections').insert({
        berth_code: marker.code,
        inspector_id: inspectorId,
        inspector_name: inspectorName,
        status: status,
        expected_vessel_name: expectedBoat?.vesselName || null,
        expected_vessel_registration: expectedBoat?.vesselRegistration || null,
        found_vessel_name: foundVesselName || null,
        found_vessel_registration: foundVesselRegistration || null,
        photo_url: foundVesselPhoto || null,
        notes: notes || null,
      });

      if (error) {
        alert('Greska: ' + error.message);
        return;
      }

      // If there's a violation, create violation record
      if (status === 'wrong_vessel' || status === 'illegal_mooring') {
        await supabase.from('violations').insert({
          berth_code: marker.code,
          violation_type: status === 'illegal_mooring' ? 'illegal_mooring' : 'wrong_berth',
          vessel_name: foundVesselName || null,
          vessel_registration: foundVesselRegistration || null,
          description: notes || `Pronadjen pogresan brod na vezu ${marker.code}. Registracija: ${foundVesselRegistration}`,
          reported_by: inspectorId,
          reported_by_name: inspectorName,
        });
      }

      setSaved(true);
      onInspectionSaved?.();

      // Auto close after 1.5 seconds
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      alert('Greska: ' + (err as Error).message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="absolute top-16 right-4 z-[1001] w-96 shadow-xl border-2 max-h-[calc(100vh-8rem)] overflow-y-auto">
      <CardHeader className="pb-3 sticky top-0 bg-white dark:bg-slate-950 z-10">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Anchor className="h-5 w-5 text-blue-600" />
            Inspekcija veza {marker.code}
          </CardTitle>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Berth Info */}
        <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
          <div className="flex items-center gap-2 mb-1">
            <MapPin className="h-4 w-4 text-blue-600" />
            <span className="text-xs text-muted-foreground">Vez</span>
          </div>
          <p className="font-bold text-2xl text-blue-700 dark:text-blue-300">
            {marker.code}
          </p>
          <Badge variant="outline" className="mt-1">
            Ponton {marker.pontoon}
          </Badge>
        </div>

        {/* Expected Boat Info */}
        <div className="border rounded-lg overflow-hidden">
          <div className="bg-slate-100 dark:bg-slate-800 px-3 py-2 border-b">
            <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <Ship className="h-3 w-3" />
              OCEKIVANI BROD NA VEZU
            </p>
          </div>
          {expectedBoat ? (
            <div className="p-3 space-y-2">
              {expectedBoat.vesselImageUrl && (
                <img
                  src={expectedBoat.vesselImageUrl}
                  alt={expectedBoat.vesselName || 'Plovilo'}
                  className="w-full h-32 object-cover rounded-lg"
                />
              )}
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Ime</p>
                  <p className="font-semibold">{expectedBoat.vesselName || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Registracija</p>
                  <p className="font-semibold">{expectedBoat.vesselRegistration || '-'}</p>
                </div>
                {sizeInfo && (
                  <div className="col-span-2">
                    <p className="text-xs text-muted-foreground">Velicina</p>
                    <p className="font-semibold">{sizeInfo.label} ({sizeInfo.lengthRange})</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-4 text-center text-muted-foreground">
              <HelpCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Nema registrovanog broda za ovaj vez</p>
            </div>
          )}
        </div>

        {/* Inspection Status */}
        {!saved ? (
          <>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Status inspekcije *</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as InspectionStatus)}>
                <SelectTrigger>
                  <SelectValue placeholder="Odaberi status..." />
                </SelectTrigger>
                <SelectContent className="z-[9999]">
                  {expectedBoat ? (
                    <>
                      <SelectItem value="correct">
                        <span className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          Ispravan brod na vezu
                        </span>
                      </SelectItem>
                      <SelectItem value="missing_vessel">
                        <span className="flex items-center gap-2">
                          <HelpCircle className="h-4 w-4 text-yellow-500" />
                          Prazan vez - brod nije tu
                        </span>
                      </SelectItem>
                      <SelectItem value="wrong_vessel">
                        <span className="flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-orange-500" />
                          Pogresan brod na vezu
                        </span>
                      </SelectItem>
                    </>
                  ) : (
                    <>
                      <SelectItem value="empty_ok">
                        <span className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          Prazan vez - OK
                        </span>
                      </SelectItem>
                      <SelectItem value="illegal_mooring">
                        <span className="flex items-center gap-2">
                          <XCircle className="h-4 w-4 text-red-500" />
                          Nelegalno vezivanje
                        </span>
                      </SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Wrong Vessel Form */}
            {(status === 'wrong_vessel' || status === 'illegal_mooring') && (
              <div className="border-2 border-orange-200 dark:border-orange-800 rounded-lg p-3 space-y-3 bg-orange-50 dark:bg-orange-900/20">
                <p className="text-sm font-medium text-orange-700 dark:text-orange-300 flex items-center gap-1">
                  <AlertTriangle className="h-4 w-4" />
                  Podaci o pronadjenom brodu
                </p>

                <div className="space-y-2">
                  <Label className="text-xs">Ime broda</Label>
                  <Input
                    value={foundVesselName}
                    onChange={(e) => setFoundVesselName(e.target.value)}
                    placeholder="npr. Sea Dream"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">Registracija *</Label>
                  <Input
                    value={foundVesselRegistration}
                    onChange={(e) => setFoundVesselRegistration(e.target.value)}
                    placeholder="npr. KO-123-AB"
                    className="font-mono"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">Fotografija broda</Label>
                  <PhotoUpload
                    currentPhotoUrl={foundVesselPhoto}
                    onPhotoUploaded={setFoundVesselPhoto}
                    onPhotoRemoved={() => setFoundVesselPhoto('')}
                    bucketName="vessel-photos"
                    folderPath="inspections"
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-sm font-medium">Napomena</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Dodatne napomene..."
                rows={2}
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={onClose} className="flex-1">
                Odustani
              </Button>
              <Button
                onClick={handleSaveInspection}
                disabled={isSaving || !status}
                className="flex-1"
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <CheckCircle className="h-4 w-4 mr-2" />
                )}
                Sacuvaj
              </Button>
            </div>
          </>
        ) : (
          <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg p-4 text-center">
            <CheckCircle className="h-10 w-10 text-green-500 mx-auto mb-2" />
            <p className="font-semibold text-green-700 dark:text-green-300">
              Inspekcija sacuvana!
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {INSPECTION_STATUS_LABELS[status as InspectionStatus]}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
