'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Loader2, Wrench } from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabase/client';

interface Technician {
  id: string;
  full_name: string;
}

interface AssignTechnicianDialogProps {
  isOpen: boolean;
  onClose: () => void;
  reportId: string;
  onAssigned: () => void;
}

export function AssignTechnicianDialog({
  isOpen,
  onClose,
  reportId,
  onAssigned,
}: AssignTechnicianDialogProps) {
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [selectedTechnicianId, setSelectedTechnicianId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadTechnicians();
      setSelectedTechnicianId('');
    }
  }, [isOpen]);

  const loadTechnicians = async () => {
    setIsLoading(true);
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('role', 'majstor')
        .eq('is_active', true)
        .order('full_name');

      if (error) throw error;
      if (data) {
        setTechnicians(data);
      }
    } catch (err) {
      console.error('Error loading technicians:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAssign = async () => {
    if (!selectedTechnicianId) return;

    setIsAssigning(true);
    try {
      const supabase = getSupabaseClient();
      const technician = technicians.find(t => t.id === selectedTechnicianId);

      const { error } = await supabase
        .from('damage_reports')
        .update({
          assigned_to: selectedTechnicianId,
          assigned_to_name: technician?.full_name,
          status: 'in_progress',
        })
        .eq('id', reportId);

      if (error) throw error;

      onAssigned();
      onClose();
    } catch (err) {
      alert('Greska: ' + (err as Error).message);
    } finally {
      setIsAssigning(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            Dodijeli majstoru
          </DialogTitle>
          <DialogDescription>
            Odaberite majstora kojem zelite dodijeliti ovaj zadatak
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          {isLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : technicians.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">
              Nema dostupnih majstora. Dodajte korisnika sa ulogom &quot;Majstor&quot;.
            </p>
          ) : (
            <Select value={selectedTechnicianId} onValueChange={setSelectedTechnicianId}>
              <SelectTrigger>
                <SelectValue placeholder="Odaberite majstora..." />
              </SelectTrigger>
              <SelectContent>
                {technicians.map((tech) => (
                  <SelectItem key={tech.id} value={tech.id}>
                    {tech.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={onClose}>
              Odustani
            </Button>
            <Button
              onClick={handleAssign}
              disabled={!selectedTechnicianId || isAssigning || technicians.length === 0}
            >
              {isAssigning && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Dodijeli
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
