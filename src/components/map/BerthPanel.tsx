'use client';

import { useState } from 'react';
import { X, Ship, Calendar, Camera, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BerthMapData, OccupancyStatus, VesselType, UserRole } from '@/types/database.types';
import { hasPermission } from '@/lib/auth/rbac';

interface BerthPanelProps {
  berth: BerthMapData;
  userRole: UserRole;
  onClose: () => void;
  onSave?: (data: OccupancyFormData) => Promise<void>;
}

export interface OccupancyFormData {
  berthId: string;
  status: OccupancyStatus;
  registrationNumber?: string;
  vesselType?: VesselType;
  notes?: string;
  photoUrl?: string;
}

const VESSEL_TYPES: { value: VesselType; label: string }[] = [
  { value: 'sailboat', label: 'Jedrilica' },
  { value: 'motorboat', label: 'Motorni čamac' },
  { value: 'yacht', label: 'Jahta' },
  { value: 'catamaran', label: 'Katamaran' },
  { value: 'other', label: 'Ostalo' },
];

export function BerthPanel({ berth, userRole, onClose, onSave }: BerthPanelProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<OccupancyStatus>(
    berth.occupancy_status || 'free'
  );
  const [registrationNumber, setRegistrationNumber] = useState(
    berth.vessel_registration || ''
  );
  const [vesselType, setVesselType] = useState<VesselType | ''>('');
  const [notes, setNotes] = useState('');

  const canEdit = hasPermission(userRole, 'RECORD_OCCUPANCY');
  const canViewPaymentStatus = hasPermission(userRole, 'VIEW_PAYMENT_DETAILS');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onSave || !canEdit) return;

    setIsLoading(true);
    try {
      await onSave({
        berthId: berth.id,
        status,
        registrationNumber: registrationNumber || undefined,
        vesselType: vesselType || undefined,
        notes: notes || undefined,
      });
      onClose();
    } catch (error) {
      console.error('Error saving occupancy:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = () => {
    if (berth.status === 'maintenance') {
      return <Badge variant="secondary">Na održavanju</Badge>;
    }
    if (berth.status === 'inactive') {
      return <Badge variant="secondary">Neaktivan</Badge>;
    }

    switch (berth.occupancy_status) {
      case 'occupied':
        return <Badge variant="destructive">Zauzet</Badge>;
      case 'reserved':
        return <Badge className="bg-yellow-500">Rezervisan</Badge>;
      default:
        return <Badge className="bg-green-500">Slobodan</Badge>;
    }
  };

  return (
    <Card className="absolute right-4 top-4 z-[1000] w-80 max-h-[calc(100vh-2rem)] overflow-y-auto shadow-xl">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            Vez {berth.code}
            {getStatusBadge()}
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Current vessel info */}
        {berth.vessel_registration && (
          <div className="rounded-lg bg-slate-100 dark:bg-slate-800 p-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Ship className="h-4 w-4" />
              Trenutno plovilo
            </div>
            <p className="text-lg font-semibold mt-1">
              {berth.vessel_registration}
            </p>
          </div>
        )}

        {/* Contract/Payment status - only for operators+ */}
        {canViewPaymentStatus && berth.has_active_contract && (
          <div className="rounded-lg bg-blue-50 dark:bg-blue-950 p-3">
            <p className="text-sm font-medium">Status ugovora</p>
            <div className="flex items-center gap-2 mt-1">
              <Badge
                variant={
                  berth.payment_status === 'paid'
                    ? 'default'
                    : berth.payment_status === 'overdue'
                    ? 'destructive'
                    : 'secondary'
                }
              >
                {berth.payment_status === 'paid'
                  ? 'Plaćeno'
                  : berth.payment_status === 'overdue'
                  ? 'Dospjelo'
                  : 'U obradi'}
              </Badge>
            </div>
          </div>
        )}

        {/* Edit form - only for users with permission */}
        {canEdit && berth.status === 'active' && (
          <form onSubmit={handleSubmit} className="space-y-4 pt-2 border-t">
            <p className="text-sm font-medium">Unos zauzetosti</p>

            {/* Status */}
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={status}
                onValueChange={(value) => setStatus(value as OccupancyStatus)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Izaberi status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">Slobodan</SelectItem>
                  <SelectItem value="occupied">Zauzet</SelectItem>
                  <SelectItem value="reserved">Rezervisan</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Registration number - only if occupied */}
            {status === 'occupied' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="registration">Registracija plovila</Label>
                  <Input
                    id="registration"
                    placeholder="HR-1234-AB"
                    value={registrationNumber}
                    onChange={(e) =>
                      setRegistrationNumber(e.target.value.toUpperCase())
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="vesselType">Tip plovila</Label>
                  <Select
                    value={vesselType}
                    onValueChange={(value) => setVesselType(value as VesselType)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Izaberi tip (opciono)" />
                    </SelectTrigger>
                    <SelectContent>
                      {VESSEL_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Napomena</Label>
              <Textarea
                id="notes"
                placeholder="Opcionalna napomena..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
              />
            </div>

            {/* Photo button */}
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => {
                // TODO: Implement photo capture
                alert('Funkcionalnost kamere će biti dodana');
              }}
            >
              <Camera className="mr-2 h-4 w-4" />
              Dodaj fotografiju
            </Button>

            {/* Submit */}
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Čuvam...
                </>
              ) : (
                'Sačuvaj'
              )}
            </Button>
          </form>
        )}

        {/* Read-only message for non-active berths */}
        {berth.status !== 'active' && (
          <p className="text-sm text-muted-foreground text-center py-4">
            Ovaj vez nije aktivan za unos
          </p>
        )}
      </CardContent>
    </Card>
  );
}
