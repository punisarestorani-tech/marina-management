'use client';

import dynamic from 'next/dynamic';
import { useState, useMemo, useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { BerthMapData } from '@/types/database.types';
import { BerthMarker } from '@/types/boat.types';
import { BerthPanel, BerthMarkerPanel, OccupancyFormData, BerthInspectionPopup } from '@/components/map';
import { MapLegend } from '@/components/map/MarinaMap';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Trash2, Save, MapPin, RefreshCw, X } from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabase/client';

// Dynamic import to avoid SSR issues with Leaflet
const MarinaMap = dynamic(
  () => import('@/components/map/MarinaMap').then((mod) => mod.MarinaMap),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full bg-slate-200 dark:bg-slate-800 animate-pulse flex items-center justify-center">
        <p className="text-muted-foreground">Učitavanje mape...</p>
      </div>
    ),
  }
);

const BERTHS: BerthMapData[] = [];
const INITIAL_BERTH_MARKERS: BerthMarker[] = [];

export default function MapPage() {
  const user = useAuthStore((state) => state.user);
  const [selectedBerth, setSelectedBerth] = useState<BerthMapData | null>(null);

  // Berth markers from database
  const [berthMarkers, setBerthMarkers] = useState<BerthMarker[]>(INITIAL_BERTH_MARKERS);
  const [isLoadingBerths, setIsLoadingBerths] = useState(true);
  const [reservedBerthCodes, setReservedBerthCodes] = useState<Set<string>>(new Set());

  // Berth marker mode
  const [berthMarkerMode, setBerthMarkerMode] = useState(false);
  const [selectedBerthMarker, setSelectedBerthMarker] = useState<BerthMarker | null>(null);
  const [newBerthCode, setNewBerthCode] = useState('');
  const [newBerthPontoon, setNewBerthPontoon] = useState('A');
  const [isSaving, setIsSaving] = useState(false);

  // Inspection mode - berth clicked for inspection
  const [inspectionBerth, setInspectionBerth] = useState<BerthMarker | null>(null);

  // Get unique berths for dropdown (no duplicates)
  const uniqueBerths = useMemo(() => {
    const seen = new Set<string>();
    return berthMarkers.filter(m => {
      if (seen.has(m.code)) return false;
      seen.add(m.code);
      return true;
    });
  }, [berthMarkers]);

  // Get A-01 berth position as map center
  const mapCenter = useMemo(() => {
    const a01 = berthMarkers.find(m => m.code === 'A-01');
    if (a01) {
      return { lat: a01.position.lat, lng: a01.position.lng };
    }
    return undefined;
  }, [berthMarkers]);

  // Load berths and reservations to determine berth statuses
  useEffect(() => {
    const loadData = async () => {
      try {
        const supabase = getSupabaseClient();
        const today = new Date().toISOString().split('T')[0];

        // Load berths and active reservations in parallel
        const [berthsResult, reservationsResult] = await Promise.all([
          supabase.from('berths').select('id, code, polygon, status').eq('status', 'active'),
          supabase
            .from('berth_bookings')
            .select('berth_code, check_in_date, check_out_date, status')
            .in('status', ['confirmed', 'checked_in', 'pending'])
            .lte('check_in_date', today)
            .gte('check_out_date', today),
        ]);

        // Process reservations to know which berths have active bookings
        const reservedCodes = new Set<string>();
        const checkedInCodes = new Set<string>();
        if (reservationsResult.data && reservationsResult.data.length > 0) {
          reservationsResult.data.forEach((booking) => {
            if (booking.status === 'checked_in') {
              checkedInCodes.add(booking.berth_code);
            } else {
              reservedCodes.add(booking.berth_code);
            }
          });
        }
        setReservedBerthCodes(reservedCodes);

        // Process berths with correct status based on reservations
        if (berthsResult.data) {
          const seen = new Set<string>();
          const uniqueData = berthsResult.data.filter(b => {
            if (seen.has(b.code)) return false;
            seen.add(b.code);
            return true;
          });

          const markers: BerthMarker[] = uniqueData.map((berth) => {
            const polygon = berth.polygon as number[][] || [];
            let lat = 42.2886, lng = 18.8400;
            if (polygon.length > 0) {
              lat = polygon[0][0] || lat;
              lng = polygon[0][1] || lng;
            }

            // Set status: checked_in (occupied) > reserved > free
            const isCheckedIn = checkedInCodes.has(berth.code);
            const isReserved = reservedCodes.has(berth.code);

            let status: 'occupied' | 'reserved' | 'free' = 'free';
            if (isCheckedIn) {
              status = 'occupied';
            } else if (isReserved) {
              status = 'reserved';
            }

            return {
              id: berth.id,
              code: berth.code,
              pontoon: berth.code.split('-')[0] || 'A',
              position: { lat, lng },
              status,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
          });
          setBerthMarkers(markers);
        }
      } catch (err) {
        console.error('Error loading data:', err);
      } finally {
        setIsLoadingBerths(false);
      }
    };
    loadData();
  }, []);

  const isManager = user?.role === 'manager' || user?.role === 'admin';

  const handleBerthClick = (berth: BerthMapData) => {
    if (!berthMarkerMode) {
      setSelectedBerth(berth);
    }
  };

  const handleClosePanel = () => setSelectedBerth(null);

  const handleSaveOccupancy = async (data: OccupancyFormData) => {
    console.log('Saving occupancy:', data);
  };

  // Map click handler
  const handleMapClick = (latlng: { lat: number; lng: number }) => {
    if (berthMarkerMode && isManager) {
      if (!newBerthCode.trim()) {
        alert('Unesite šifru veza prije postavljanja!');
        return;
      }

      const code = newBerthCode.trim().toUpperCase();

      // Check for duplicate berth code
      const exists = berthMarkers.some(m => m.code === code);
      if (exists) {
        alert(`Vez ${code} već postoji! Izaberite drugu šifru.`);
        return;
      }

      const newMarker: BerthMarker = {
        id: `bm-${Date.now()}`,
        code: code,
        pontoon: newBerthPontoon,
        position: latlng,
        status: 'free',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setBerthMarkers((prev) => [...prev, newMarker]);
      setSelectedBerthMarker(newMarker);

      // Auto-increment to next available number
      const match = code.match(/^([A-Z])-(\d+)$/);
      if (match) {
        let nextNum = parseInt(match[2]) + 1;
        let nextCode = `${match[1]}-${nextNum.toString().padStart(2, '0')}`;
        // Find next available number
        while (berthMarkers.some(m => m.code === nextCode)) {
          nextNum++;
          nextCode = `${match[1]}-${nextNum.toString().padStart(2, '0')}`;
        }
        setNewBerthCode(nextCode);
      }
    }
  };

  // Save berth markers to database
  const handleSaveBerths = async () => {
    setIsSaving(true);
    try {
      const supabase = getSupabaseClient();
      let savedCount = 0;
      let errorCount = 0;

      // Save each berth marker
      for (const marker of berthMarkers) {
        const isNewMarker = marker.id.startsWith('bm-');

        if (isNewMarker) {
          // INSERT new berth (let database generate ID)
          const { error } = await supabase.from('berths').insert({
            code: marker.code,
            polygon: [[marker.position.lat, marker.position.lng]],
            status: 'active',
            berth_type: 'transit',
          });

          if (error) {
            console.error('Error inserting berth:', marker.code, error);
            errorCount++;
          } else {
            savedCount++;
          }
        } else {
          // UPDATE existing berth
          const { error } = await supabase.from('berths')
            .update({
              polygon: [[marker.position.lat, marker.position.lng]],
            })
            .eq('id', marker.id);

          if (error) {
            console.error('Error updating berth:', marker.code, error);
            errorCount++;
          } else {
            savedCount++;
          }
        }
      }

      if (errorCount > 0) {
        alert(`Greška: ${errorCount} vezova nije sačuvano. Provjerite konzolu.`);
      }

      // Reload berths from database to get proper IDs
      const { data: berthsData } = await supabase
        .from('berths')
        .select('id, code, polygon, status')
        .eq('status', 'active')
        .order('code');

      if (berthsData) {
        const markers: BerthMarker[] = berthsData.map((berth) => {
          const polygon = berth.polygon as number[][] || [];
          let lat = 42.2886, lng = 18.8400;
          if (polygon.length > 0) {
            lat = polygon[0][0] || lat;
            lng = polygon[0][1] || lng;
          }

          const isReserved = reservedBerthCodes.has(berth.code);

          let status: 'occupied' | 'reserved' | 'free' = 'free';
          if (isReserved) status = 'reserved';

          return {
            id: berth.id,
            code: berth.code,
            pontoon: berth.code.split('-')[0] || 'A',
            position: { lat, lng },
            status,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
        });
        setBerthMarkers(markers);
      }

      alert(`Sačuvano ${savedCount} vezova!`);
    } catch (error) {
      console.error('Error saving berths:', error);
      alert('Greška: ' + (error as Error).message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleBerthMarkerClick = (marker: BerthMarker) => {
    if (berthMarkerMode) {
      setSelectedBerthMarker(marker);
    } else {
      // Open inspection popup for inspector
      setInspectionBerth(marker);
      setSelectedBerthMarker(null);
      setSelectedBerth(null);
    }
  };

  const handleCloseBerthMarkerPanel = () => {
    if (!berthMarkerMode) {
      setSelectedBerthMarker(null);
    }
  };

  const handleNewBooking = (berthCode: string) => {
    window.location.href = `/bookings?berth=${berthCode}`;
  };

  const handleBerthMarkerDragEnd = (marker: BerthMarker, newPosition: { lat: number; lng: number }) => {
    setBerthMarkers((prev) =>
      prev.map((m) => m.id === marker.id ? { ...m, position: newPosition } : m)
    );
  };

  const handleDeleteBerthMarker = () => {
    if (selectedBerthMarker) {
      setBerthMarkers((prev) => prev.filter((m) => m.id !== selectedBerthMarker.id));
      setSelectedBerthMarker(null);
    }
  };

  const handleChangeBerthStatus = (status: BerthMarker['status']) => {
    if (selectedBerthMarker) {
      setBerthMarkers((prev) =>
        prev.map((m) => m.id === selectedBerthMarker.id ? { ...m, status } : m)
      );
      setSelectedBerthMarker({ ...selectedBerthMarker, status });
    }
  };

  const stats = useMemo(() => ({
    berthMarkersCount: uniqueBerths.length,
  }), [uniqueBerths.length]);

  if (!user) return null;

  return (
    <div className="h-[calc(100vh-8rem)] relative">
      {/* Stats bar */}
      <div className="absolute top-0 left-0 right-0 z-[1000] bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm border-b px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-6 text-sm">
          <div className="flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-green-600" />
            <span>{stats.berthMarkersCount} vezova</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isManager && (
            <Button
              variant={berthMarkerMode ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setBerthMarkerMode(!berthMarkerMode);
                if (!berthMarkerMode && !newBerthCode) {
                  setNewBerthCode(`${newBerthPontoon}-01`);
                }
              }}
            >
              <MapPin className="w-4 h-4 mr-1" />
              {berthMarkerMode ? 'Završi' : 'Označi vezove'}
            </Button>
          )}
        </div>
      </div>

      {/* Map */}
      <div className="h-full pt-10">
        <MarinaMap
          berths={BERTHS}
          berthMarkers={berthMarkers}
          onBerthClick={handleBerthClick}
          onBerthMarkerClick={handleBerthMarkerClick}
          selectedBerthId={selectedBerth?.id}
          selectedBerthMarkerId={selectedBerthMarker?.id}
          berthMarkerMode={berthMarkerMode}
          onMapClick={handleMapClick}
          onBerthMarkerDragEnd={handleBerthMarkerDragEnd}
          initialCenter={mapCenter}
        />
      </div>

      <MapLegend />

      {/* Berth Marker Mode Panel */}
      {berthMarkerMode && isManager && (
        <Card className="fixed md:absolute inset-x-2 bottom-2 md:inset-auto md:top-16 md:right-4 z-[1000] p-3 md:p-4 md:w-80">
          <div className="flex items-center justify-between mb-2 md:mb-3">
            <h3 className="font-semibold flex items-center gap-2 text-sm md:text-base">
              <MapPin className="w-4 h-4 md:w-5 md:h-5" />
              Označavanje vezova
            </h3>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setBerthMarkerMode(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {selectedBerthMarker ? (
            <div className="bg-green-50 dark:bg-green-900/30 rounded-lg p-3 mb-4 border-2 border-green-500">
              <p className="text-sm font-semibold mb-2">Vez: {selectedBerthMarker.code}</p>
              <div className="flex gap-2">
                <Button variant="destructive" size="sm" onClick={handleDeleteBerthMarker} className="flex-1">
                  <Trash2 className="w-4 h-4 mr-1" /> Obriši
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setSelectedBerthMarker(null)} className="flex-1">
                  Gotovo
                </Button>
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 mb-4 border border-dashed">
              <p className="text-sm text-center text-muted-foreground">Unesite šifru i kliknite na mapu</p>
            </div>
          )}

          <div className="space-y-3 mb-4">
            <div>
              <Label className="text-xs mb-1 block">Ponton</Label>
              <div className="flex gap-1">
                {['A', 'B', 'C', 'D', 'E'].map((p) => (
                  <button
                    key={p}
                    onClick={() => {
                      setNewBerthPontoon(p);
                      setNewBerthCode(`${p}-01`);
                    }}
                    className={`flex-1 py-1.5 text-sm font-medium rounded border ${newBerthPontoon === p ? 'bg-green-500 text-white' : 'border-gray-300'}`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-xs mb-1 block">Šifra sljedećeg veza</Label>
              <Input
                value={newBerthCode}
                onChange={(e) => setNewBerthCode(e.target.value.toUpperCase())}
                placeholder="npr. A-01"
                className="h-8 text-sm font-mono"
              />
            </div>
          </div>

          {/* Save berths button */}
          <Button onClick={handleSaveBerths} className="w-full" disabled={isSaving}>
            {isSaving ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Sačuvaj vezove ({berthMarkers.length})
          </Button>
        </Card>
      )}

      {selectedBerth && !berthMarkerMode && (
        <BerthPanel berth={selectedBerth} userRole={user.role} onClose={handleClosePanel} onSave={handleSaveOccupancy} />
      )}

      {selectedBerthMarker && !berthMarkerMode && (
        <BerthMarkerPanel marker={selectedBerthMarker} onClose={handleCloseBerthMarkerPanel} onNewBooking={handleNewBooking} />
      )}

      {/* Inspection Popup - when clicking on a berth marker */}
      {inspectionBerth && !berthMarkerMode && (
        <BerthInspectionPopup
          marker={inspectionBerth}
          onClose={() => setInspectionBerth(null)}
          onInspectionSaved={() => {
            // Optionally refresh data
          }}
          inspectorId={user?.id}
          inspectorName={user?.full_name}
        />
      )}
    </div>
  );
}
