import { useState, useEffect, useCallback } from 'react';
import { getSupabaseClient } from '@/lib/supabase/client';
import { BerthMarker } from '@/types/boat.types';
import { Booking } from '@/types/booking.types';

export type BerthStatusType = 'free' | 'occupied' | 'reserved' | 'maintenance';

interface BerthWithStatus extends BerthMarker {
  booking?: Partial<Booking>;
}

interface UseBerthStatusReturn {
  berthMarkers: BerthWithStatus[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  updateBerthStatus: (berthId: string, status: BerthStatusType) => void;
  addBerthMarker: (marker: BerthMarker) => void;
  removeBerthMarker: (berthId: string) => void;
  moveBerthMarker: (berthId: string, position: { lat: number; lng: number }) => void;
}

// Determine berth status based on bookings
function determineBerthStatus(
  berthCode: string,
  bookings: Partial<Booking>[],
  today: string
): { status: BerthStatusType; booking?: Partial<Booking> } {
  // Find active booking for this berth
  const activeBooking = bookings.find((b) => {
    if (b.berthCode !== berthCode) return false;

    const checkIn = b.checkInDate || '';
    const checkOut = b.checkOutDate || '';

    // Check if today is within booking period
    if (today >= checkIn && today < checkOut) {
      // Active statuses
      return ['checked_in', 'confirmed', 'pending'].includes(b.status || '');
    }

    return false;
  });

  if (!activeBooking) {
    return { status: 'free' };
  }

  // Determine status based on booking status
  switch (activeBooking.status) {
    case 'checked_in':
      return { status: 'occupied', booking: activeBooking };
    case 'confirmed':
    case 'pending':
      return { status: 'reserved', booking: activeBooking };
    default:
      return { status: 'free' };
  }
}

export function useBerthStatus(): UseBerthStatusReturn {
  const [berthMarkers, setBerthMarkers] = useState<BerthWithStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBerthStatus = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const supabase = getSupabaseClient();
      const today = new Date().toISOString().split('T')[0];

      // Fetch berths (we'll use berth_code from berths table)
      const { data: berths, error: berthsError } = await supabase
        .from('berths')
        .select('id, code, polygon, status, pontoon_id')
        .eq('status', 'active');

      if (berthsError) {
        console.error('Error fetching berths:', berthsError);
        // Continue with empty berths if table doesn't exist yet
      }

      // Fetch active bookings for today
      const { data: bookings, error: bookingsError } = await supabase
        .from('berth_bookings')
        .select('*')
        .lte('check_in_date', today)
        .gt('check_out_date', today)
        .in('status', ['pending', 'confirmed', 'checked_in']);

      if (bookingsError) {
        console.error('Error fetching bookings:', bookingsError);
        // Continue with empty bookings if table doesn't exist yet
      }

      // Convert berths to BerthMarker format with status from bookings
      const markers: BerthWithStatus[] = (berths || []).map((berth) => {
        const { status, booking } = determineBerthStatus(
          berth.code,
          (bookings || []).map((b) => ({
            berthCode: b.berth_code,
            checkInDate: b.check_in_date,
            checkOutDate: b.check_out_date,
            status: b.status,
            guestName: b.guest_name,
            vesselName: b.vessel_name,
            vesselRegistration: b.vessel_registration,
          })),
          today
        );

        // Get center of polygon for marker position
        const polygon = berth.polygon as number[][] || [];
        let lat = 42.2886;
        let lng = 18.8400;

        if (polygon.length > 0) {
          lat = polygon.reduce((sum, p) => sum + p[0], 0) / polygon.length;
          lng = polygon.reduce((sum, p) => sum + p[1], 0) / polygon.length;
        }

        return {
          id: berth.id,
          code: berth.code,
          pontoon: berth.code.split('-')[0] || 'A',
          position: { lat, lng },
          status,
          booking,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      });

      setBerthMarkers(markers);
    } catch (err) {
      console.error('Error in fetchBerthStatus:', err);
      setError(err instanceof Error ? err.message : 'Greška pri učitavanju');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchBerthStatus();
  }, [fetchBerthStatus]);

  // Set up real-time subscription for booking changes
  useEffect(() => {
    const supabase = getSupabaseClient();

    const subscription = supabase
      .channel('booking_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'berth_bookings',
        },
        () => {
          // Refetch when bookings change
          fetchBerthStatus();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchBerthStatus]);

  // Manual status update (for local state before saving to DB)
  const updateBerthStatus = useCallback((berthId: string, status: BerthStatusType) => {
    setBerthMarkers((prev) =>
      prev.map((m) =>
        m.id === berthId
          ? { ...m, status, updatedAt: new Date().toISOString() }
          : m
      )
    );
  }, []);

  // Add new berth marker (local state)
  const addBerthMarker = useCallback((marker: BerthMarker) => {
    setBerthMarkers((prev) => [...prev, { ...marker, status: marker.status as BerthStatusType }]);
  }, []);

  // Remove berth marker (local state)
  const removeBerthMarker = useCallback((berthId: string) => {
    setBerthMarkers((prev) => prev.filter((m) => m.id !== berthId));
  }, []);

  // Move berth marker (local state)
  const moveBerthMarker = useCallback((berthId: string, position: { lat: number; lng: number }) => {
    setBerthMarkers((prev) =>
      prev.map((m) =>
        m.id === berthId
          ? { ...m, position, updatedAt: new Date().toISOString() }
          : m
      )
    );
  }, []);

  return {
    berthMarkers,
    isLoading,
    error,
    refetch: fetchBerthStatus,
    updateBerthStatus,
    addBerthMarker,
    removeBerthMarker,
    moveBerthMarker,
  };
}

// Hook to save berth marker to database
export function useSaveBerthMarker() {
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const saveBerthMarker = async (marker: BerthMarker): Promise<boolean> => {
    setIsSaving(true);
    setError(null);

    try {
      const supabase = getSupabaseClient();

      // Check if berth exists
      const { data: existing } = await supabase
        .from('berths')
        .select('id')
        .eq('code', marker.code)
        .single();

      if (existing) {
        // Update existing berth position
        const { error: updateError } = await supabase
          .from('berths')
          .update({
            polygon: [[marker.position.lat, marker.position.lng]],
          })
          .eq('id', existing.id);

        if (updateError) throw updateError;
      } else {
        // Create new berth
        const { error: insertError } = await supabase
          .from('berths')
          .insert({
            code: marker.code,
            pontoon_id: null, // Would need to look up or create pontoon
            polygon: [[marker.position.lat, marker.position.lng]],
            status: 'active',
          });

        if (insertError) throw insertError;
      }

      return true;
    } catch (err) {
      console.error('Error saving berth marker:', err);
      setError(err instanceof Error ? err.message : 'Greška pri spremanju');
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  return { saveBerthMarker, isSaving, error };
}

// Hook to update booking status (check-in, check-out)
export function useUpdateBookingStatus() {
  const [isUpdating, setIsUpdating] = useState(false);

  const checkIn = async (bookingId: string): Promise<boolean> => {
    setIsUpdating(true);
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase
        .from('berth_bookings')
        .update({
          status: 'checked_in',
          actual_check_in: new Date().toISOString(),
        })
        .eq('id', bookingId);

      if (error) throw error;
      return true;
    } catch (err) {
      console.error('Error checking in:', err);
      return false;
    } finally {
      setIsUpdating(false);
    }
  };

  const checkOut = async (bookingId: string): Promise<boolean> => {
    setIsUpdating(true);
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase
        .from('berth_bookings')
        .update({
          status: 'checked_out',
          actual_check_out: new Date().toISOString(),
        })
        .eq('id', bookingId);

      if (error) throw error;
      return true;
    } catch (err) {
      console.error('Error checking out:', err);
      return false;
    } finally {
      setIsUpdating(false);
    }
  };

  return { checkIn, checkOut, isUpdating };
}
