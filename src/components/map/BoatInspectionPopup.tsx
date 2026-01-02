'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  X,
  Ship,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  Camera,
  MapPin,
} from 'lucide-react';
import { BoatPlacement, BOAT_SIZES } from '@/types/boat.types';
import {
  InspectionStatus,
  INSPECTION_STATUS_LABELS,
  INSPECTION_STATUS_COLORS,
} from '@/types/inspection.types';
import { getSupabaseClient } from '@/lib/supabase/client';

interface BoatInspectionPopupProps {
  boat: BoatPlacement;
  expectedBerthCode?: string;
  onClose: () => void;
  onInspectionSaved?: () => void;
  inspectorId?: string;
  inspectorName?: string;
}

export function BoatInspectionPopup({
  boat,
  expectedBerthCode,
  onClose,
  onInspectionSaved,
  inspectorId,
  inspectorName,
}: BoatInspectionPopupProps) {
  const [status, setStatus] = useState<InspectionStatus | ''>('');
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const sizeInfo = BOAT_SIZES[boat.size];

  // Check if boat is on correct berth
  const isOnCorrectBerth = expectedBerthCode
    ? boat.berthCode === expectedBerthCode
    : true;

  const handleSaveInspection = async () => {
    if (!status) {
      alert('Odaberi status inspekcije!');
      return;
    }

    setIsSaving(true);
    try {
      const supabase = getSupabaseClient();

      const { error } = await supabase.from('inspections').insert({
        berth_code: boat.berthCode,
        inspector_id: inspectorId,
        inspector_name: inspectorName,
        status: status,
        found_vessel_name: boat.vesselName || null,
        found_vessel_registration: boat.vesselRegistration || null,
        notes: notes || null,
      });

      if (error) {
        alert('Greska: ' + error.message);
        return;
      }

      // If there's a violation, create violation record
      if (status === 'wrong_vessel' || status === 'illegal_mooring') {
        await supabase.from('violations').insert({
          berth_code: boat.berthCode,
          violation_type: status === 'illegal_mooring' ? 'illegal_mooring' : 'wrong_berth',
          vessel_name: boat.vesselName || null,
          vessel_registration: boat.vesselRegistration || null,
          description: notes || `Brod na pogrešnom vezu. Pronađen na ${boat.berthCode}.`,
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
    <Card className="absolute top-16 right-4 z-[1001] w-96 shadow-xl border-2">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Ship className="h-5 w-5 text-blue-600" />
            Inspekcija plovila
          </CardTitle>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Boat Image */}
        {boat.vesselImageUrl ? (
          <div className="relative rounded-lg overflow-hidden border">
            <img
              src={boat.vesselImageUrl}
              alt={boat.vesselName || 'Plovilo'}
              className="w-full h-40 object-cover"
            />
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
              <p className="text-white font-semibold text-lg">
                {boat.vesselName || 'Nepoznato plovilo'}
              </p>
            </div>
          </div>
        ) : (
          <div className="h-32 bg-slate-100 dark:bg-slate-800 rounded-lg flex flex-col items-center justify-center border border-dashed">
            <Ship className="h-12 w-12 text-slate-300" />
            <p className="text-sm text-slate-400 mt-2">Nema slike plovila</p>
          </div>
        )}

        {/* Boat Info */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3">
            <p className="text-xs text-muted-foreground mb-1">Registracija</p>
            <p className="font-semibold">
              {boat.vesselRegistration || '-'}
            </p>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3">
            <p className="text-xs text-muted-foreground mb-1">Velicina</p>
            <p className="font-semibold">
              {sizeInfo.label} ({sizeInfo.lengthRange})
            </p>
          </div>
        </div>

        {/* Berth Info */}
        <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
          <div className="flex items-center gap-2 mb-1">
            <MapPin className="h-4 w-4 text-blue-600" />
            <span className="text-xs text-muted-foreground">Trenutni vez</span>
          </div>
          <p className="font-bold text-xl text-blue-700 dark:text-blue-300">
            {boat.berthCode}
          </p>
          {expectedBerthCode && expectedBerthCode !== boat.berthCode && (
            <p className="text-xs text-orange-600 mt-1 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              Ocekivan vez: {expectedBerthCode}
            </p>
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
                <SelectContent>
                  <SelectItem value="correct">
                    <span className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      Ispravno - brod na svom vezu
                    </span>
                  </SelectItem>
                  <SelectItem value="wrong_vessel">
                    <span className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-orange-500" />
                      Pogresan vez - brod nije ovdje
                    </span>
                  </SelectItem>
                  <SelectItem value="illegal_mooring">
                    <span className="flex items-center gap-2">
                      <XCircle className="h-4 w-4 text-red-500" />
                      Nelegalno vezivanje
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Napomena</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Dodatne napomene o inspekciji..."
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
