import { useState, useEffect, useCallback } from 'react';
import { getSupabaseClient } from '@/lib/supabase/client';
import { BoatPlacement } from '@/types/boat.types';

interface UseBoatPlacementsReturn {
  boats: BoatPlacement[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  addBoat: (boat: BoatPlacement) => Promise<boolean>;
  updateBoat: (boat: BoatPlacement) => Promise<boolean>;
  removeBoat: (boatId: string) => Promise<boolean>;
  moveBoat: (boatId: string, position: { lat: number; lng: number }) => void;
}

export function useBoatPlacements(): UseBoatPlacementsReturn {
  const [boats, setBoats] = useState<BoatPlacement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBoats = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const supabase = getSupabaseClient();

      const { data, error: fetchError } = await supabase
        .from('boat_placements')
        .select('*')
        .order('created_at', { ascending: true });

      if (fetchError) {
        console.error('Error fetching boats:', fetchError);
        setError(fetchError.message);
        return;
      }

      if (data && data.length > 0) {
        const loadedBoats: BoatPlacement[] = data.map((row) => ({
          id: row.id,
          berthId: '',
          berthCode: row.berth_code,
          size: row.size as BoatPlacement['size'],
          rotation: row.rotation || 0,
          position: { lat: parseFloat(row.latitude), lng: parseFloat(row.longitude) },
          vesselName: row.vessel_name || undefined,
          vesselRegistration: row.vessel_registration || undefined,
          vesselImageUrl: row.vessel_image_url || undefined,
          placedBy: row.placed_by || 'unknown',
          placedAt: row.created_at,
          updatedAt: row.updated_at,
        }));
        setBoats(loadedBoats);
      } else {
        setBoats([]);
      }
    } catch (err) {
      console.error('Error in fetchBoats:', err);
      setError(err instanceof Error ? err.message : 'Greška pri učitavanju');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchBoats();
  }, [fetchBoats]);

  // Real-time subscription
  useEffect(() => {
    const supabase = getSupabaseClient();

    const subscription = supabase
      .channel('boat_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'boat_placements',
        },
        () => {
          fetchBoats();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchBoats]);

  // Add new boat to database
  const addBoat = useCallback(async (boat: BoatPlacement): Promise<boolean> => {
    try {
      const supabase = getSupabaseClient();

      const { error: insertError } = await supabase
        .from('boat_placements')
        .insert({
          id: boat.id,
          berth_code: boat.berthCode,
          latitude: boat.position.lat,
          longitude: boat.position.lng,
          size: boat.size,
          rotation: boat.rotation,
          vessel_name: boat.vesselName || null,
          vessel_registration: boat.vesselRegistration || null,
          vessel_image_url: boat.vesselImageUrl || null,
        });

      if (insertError) {
        console.error('Error adding boat:', insertError);
        return false;
      }

      // Add to local state immediately
      setBoats((prev) => [...prev, boat]);
      return true;
    } catch (err) {
      console.error('Error adding boat:', err);
      return false;
    }
  }, []);

  // Update boat in database
  const updateBoat = useCallback(async (boat: BoatPlacement): Promise<boolean> => {
    try {
      const supabase = getSupabaseClient();

      const { error: updateError } = await supabase
        .from('boat_placements')
        .update({
          berth_code: boat.berthCode,
          latitude: boat.position.lat,
          longitude: boat.position.lng,
          size: boat.size,
          rotation: boat.rotation,
          vessel_name: boat.vesselName || null,
          vessel_registration: boat.vesselRegistration || null,
          vessel_image_url: boat.vesselImageUrl || null,
        })
        .eq('id', boat.id);

      if (updateError) {
        console.error('Error updating boat:', updateError);
        return false;
      }

      // Update local state immediately
      setBoats((prev) =>
        prev.map((b) => (b.id === boat.id ? boat : b))
      );
      return true;
    } catch (err) {
      console.error('Error updating boat:', err);
      return false;
    }
  }, []);

  // Remove boat from database
  const removeBoat = useCallback(async (boatId: string): Promise<boolean> => {
    try {
      const supabase = getSupabaseClient();

      const { error: deleteError } = await supabase
        .from('boat_placements')
        .delete()
        .eq('id', boatId);

      if (deleteError) {
        console.error('Error removing boat:', deleteError);
        return false;
      }

      // Remove from local state immediately
      setBoats((prev) => prev.filter((b) => b.id !== boatId));
      return true;
    } catch (err) {
      console.error('Error removing boat:', err);
      return false;
    }
  }, []);

  // Move boat (update position locally, will be saved on next updateBoat call)
  const moveBoat = useCallback((boatId: string, position: { lat: number; lng: number }) => {
    setBoats((prev) =>
      prev.map((b) =>
        b.id === boatId
          ? { ...b, position, updatedAt: new Date().toISOString() }
          : b
      )
    );
  }, []);

  return {
    boats,
    isLoading,
    error,
    refetch: fetchBoats,
    addBoat,
    updateBoat,
    removeBoat,
    moveBoat,
  };
}
