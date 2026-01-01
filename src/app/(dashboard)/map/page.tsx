'use client';

import dynamic from 'next/dynamic';
import { useState, useMemo, useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { BerthMapData } from '@/types/database.types';
import { BoatPlacement, BOAT_SIZES, BerthMarker } from '@/types/boat.types';
import { BerthPanel, BerthMarkerPanel, OccupancyFormData } from '@/components/map';
import { MapLegend } from '@/components/map/MarinaMap';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Trash2, Save, Ship, RotateCw, MapPin, RefreshCw, X } from 'lucide-react';
import { PhotoUpload } from '@/components/ui/photo-upload';
import { useBerthStatus } from '@/hooks/useBerthStatus';
import { useBoatPlacements } from '@/hooks/useBoatPlacements';

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

// Empty berths for now
const BERTHS: BerthMapData[] = [];

// Start with empty berth markers - will be loaded from database
const INITIAL_BERTH_MARKERS: BerthMarker[] = [];

// Empty initial boats - will be loaded from database
const INITIAL_BOATS: BoatPlacement[] = [];

export default function MapPage() {
  const user = useAuthStore((state) => state.user);
  const [selectedBerth, setSelectedBerth] = useState<BerthMapData | null>(null);

  // Fetch berth status from database with real-time updates
  const {
    berthMarkers: dbBerthMarkers,
    isLoading: isLoadingBerths,
    error: berthsError,
    refetch: refetchBerths,
    updateBerthStatus,
    addBerthMarker: addDbBerthMarker,
    removeBerthMarker: removeDbBerthMarker,
    moveBerthMarker: moveDbBerthMarker,
  } = useBerthStatus();

  // Boat placements from database with real-time updates
  const {
    boats,
    isLoading: isLoadingBoats,
    error: boatsError,
    refetch: refetchBoats,
    addBoat,
    updateBoat,
    removeBoat,
    moveBoat,
  } = useBoatPlacements();

  // Boat placement UI states
  const [boatPlacementMode, setBoatPlacementMode] = useState(false);
  const [selectedBoat, setSelectedBoat] = useState<BoatPlacement | null>(null);
  const [newBoatName, setNewBoatName] = useState('');
  const [newBoatRegistration, setNewBoatRegistration] = useState('');
  const [newBoatImageUrl, setNewBoatImageUrl] = useState('');
  const [newBoatBerthCode, setNewBoatBerthCode] = useState('');

  // Berth marker states - use DB data if available, otherwise local state
  const [berthMarkerMode, setBerthMarkerMode] = useState(false);
  const [localBerthMarkers, setLocalBerthMarkers] = useState<BerthMarker[]>(INITIAL_BERTH_MARKERS);
  const [selectedBerthMarker, setSelectedBerthMarker] = useState<BerthMarker | null>(null);
  const [newBerthCode, setNewBerthCode] = useState('');
  const [newBerthPontoon, setNewBerthPontoon] = useState('A');

  // Merge DB markers with local markers (DB takes priority)
  const berthMarkers = useMemo(() => {
    if (dbBerthMarkers.length > 0) {
      return dbBerthMarkers;
    }
    return localBerthMarkers;
  }, [dbBerthMarkers, localBerthMarkers]);

  // Wrapper to update both local and trigger DB update
  const setBerthMarkers = (updater: BerthMarker[] | ((prev: BerthMarker[]) => BerthMarker[])) => {
    setLocalBerthMarkers(updater);
  };

  const isManager = user?.role === 'manager' || user?.role === 'admin';

  const handleBerthClick = (berth: BerthMapData) => {
    if (!boatPlacementMode && !berthMarkerMode) {
      setSelectedBerth(berth);
    }
  };

  const handleClosePanel = () => {
    setSelectedBerth(null);
  };

  const handleSaveOccupancy = async (data: OccupancyFormData) => {
    console.log('Saving occupancy:', data);
    await new Promise((resolve) => setTimeout(resolve, 1000));
  };

  // Map click handler
  const handleMapClick = (latlng: { lat: number; lng: number }) => {
    if (berthMarkerMode && isManager) {
      // Place a new berth marker
      if (!newBerthCode.trim()) {
        alert('Unesite šifru veza prije postavljanja!');
        return;
      }
      const newMarker: BerthMarker = {
        id: `bm-${Date.now()}`,
        code: newBerthCode.trim().toUpperCase(),
        pontoon: newBerthPontoon,
        position: latlng,
        status: 'free',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setBerthMarkers((prev) => [...prev, newMarker]);
      setSelectedBerthMarker(newMarker);
      // Auto-increment code number
      const match = newBerthCode.match(/^([A-Z])-(\d+)$/);
      if (match) {
        const nextNum = parseInt(match[2]) + 1;
        setNewBerthCode(`${match[1]}-${nextNum.toString().padStart(2, '0')}`);
      }
    } else if (boatPlacementMode && isManager) {
      // Place a new boat with default size 'm' - user adjusts after placement
      const berthCode = newBoatBerthCode.trim() || `Vez-${boats.length + 1}`;
      // Generate UUID format ID for database compatibility
      const boatId = crypto.randomUUID();
      const newBoat: BoatPlacement = {
        id: boatId,
        berthId: '',
        berthCode: berthCode,
        size: 'm', // Default size, user adjusts after placement
        rotation: 0, // Start with 0 rotation, user can adjust after placement
        position: latlng,
        vesselName: newBoatName || undefined,
        vesselRegistration: newBoatRegistration || undefined,
        vesselImageUrl: newBoatImageUrl || undefined,
        placedBy: user?.id || 'unknown',
        placedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Add boat directly to database
      addBoat(newBoat).then((success) => {
        if (success) {
          setSelectedBoat(newBoat);
        }
      });

      // Reset form
      setNewBoatName('');
      setNewBoatRegistration('');
      setNewBoatImageUrl('');
      setNewBoatBerthCode('');
    }
  };

  // Boat handlers
  const handleBoatClick = (boat: BoatPlacement) => {
    if (boatPlacementMode) {
      setSelectedBoat(boat);
    }
  };

  const handleBoatDragEnd = (boat: BoatPlacement, newPosition: { lat: number; lng: number }) => {
    const updatedBoat = { ...boat, position: newPosition, updatedAt: new Date().toISOString() };
    updateBoat(updatedBoat);
    if (selectedBoat?.id === boat.id) {
      setSelectedBoat(updatedBoat);
    }
  };

  const handleRotateBoat = (degrees: number) => {
    if (selectedBoat) {
      const newRotation = (selectedBoat.rotation + degrees + 360) % 360;
      const updatedBoat = { ...selectedBoat, rotation: newRotation, updatedAt: new Date().toISOString() };
      updateBoat(updatedBoat);
      setSelectedBoat(updatedBoat);
    }
  };

  const handleDeleteBoat = () => {
    if (selectedBoat) {
      removeBoat(selectedBoat.id);
      setSelectedBoat(null);
    }
  };

  const [isSaving, setIsSaving] = useState(false);

  const handleSaveBoats = async () => {
    setIsSaving(true);
    try {
      const supabase = (await import('@/lib/supabase/client')).getSupabaseClient();

      // Save berth markers to database (boats are saved automatically via hook)
      for (const marker of berthMarkers) {
        // Check if berth already exists
        const { data: existing } = await supabase
          .from('berths')
          .select('id')
          .eq('code', marker.code)
          .single();

        if (existing) {
          // Update existing berth position
          await supabase
            .from('berths')
            .update({
              polygon: [[marker.position.lat, marker.position.lng]],
            })
            .eq('id', existing.id);
        } else {
          // Create new berth
          await supabase
            .from('berths')
            .insert({
              code: marker.code,
              polygon: [[marker.position.lat, marker.position.lng]],
              status: 'active',
              width: 4.0,
              length: 12.0,
              has_water: false,
              has_electricity: false,
            });
        }
      }

      alert(`Sačuvano ${berthMarkers.filter((m, i, self) => i === self.findIndex(x => x.code === m.code)).length} vezova! Brodovi se čuvaju automatski.`);

      // Refresh data from database
      refetchBerths();
    } catch (error) {
      console.error('Error saving:', error);
      alert('Greška pri spremanju: ' + (error as Error).message);
    } finally {
      setIsSaving(false);
    }
  };

  // Berth marker handlers
  const handleBerthMarkerClick = (marker: BerthMarker) => {
    if (berthMarkerMode) {
      // In edit mode, select for editing
      setSelectedBerthMarker(marker);
    } else if (!boatPlacementMode) {
      // In view mode, show details panel
      setSelectedBerthMarker(marker);
    }
  };

  // Close berth marker panel
  const handleCloseBerthMarkerPanel = () => {
    if (!berthMarkerMode) {
      setSelectedBerthMarker(null);
    }
  };

  // Handle new booking from panel
  const handleNewBooking = (berthCode: string) => {
    // Navigate to bookings page with pre-selected berth
    window.location.href = `/bookings?berth=${berthCode}`;
  };

  const handleBerthMarkerDragEnd = (marker: BerthMarker, newPosition: { lat: number; lng: number }) => {
    setBerthMarkers((prev) =>
      prev.map((m) =>
        m.id === marker.id
          ? { ...m, position: newPosition, updatedAt: new Date().toISOString() }
          : m
      )
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
        prev.map((m) =>
          m.id === selectedBerthMarker.id
            ? { ...m, status, updatedAt: new Date().toISOString() }
            : m
        )
      );
      setSelectedBerthMarker({ ...selectedBerthMarker, status });
    }
  };

  // Count stats
  const stats = useMemo(() => {
    return {
      total: BERTHS.length,
      occupied: BERTHS.filter((b) => b.occupancy_status === 'occupied').length,
      free: BERTHS.filter((b) => b.status === 'active' && b.occupancy_status === 'free').length,
      berthMarkersCount: berthMarkers.length,
      reserved: BERTHS.filter((b) => b.occupancy_status === 'reserved').length,
      boatsCount: boats.length,
    };
  }, [boats.length, berthMarkers.length]);

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
          <div className="flex items-center gap-1.5">
            <Ship className="w-4 h-4 text-blue-600" />
            <span>{stats.boatsCount} brodova</span>
          </div>
          {/* Status indicators from bookings */}
          {dbBerthMarkers.length > 0 && (
            <>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span>{dbBerthMarkers.filter(m => m.status === 'free').length} slobodnih</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <span>{dbBerthMarkers.filter(m => m.status === 'occupied').length} zauzetih</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <span>{dbBerthMarkers.filter(m => m.status === 'reserved').length} rezervisanih</span>
              </div>
            </>
          )}
          {/* Refresh button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetchBerths()}
            disabled={isLoadingBerths}
            className="ml-2"
          >
            <RefreshCw className={`w-4 h-4 ${isLoadingBerths ? 'animate-spin' : ''}`} />
          </Button>
          {/* Error indicator */}
          {berthsError && (
            <span className="text-red-500 text-xs">{berthsError}</span>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          {/* Berth marker mode (Manager/Admin only) */}
          {isManager && (
            <Button
              variant={berthMarkerMode ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setBerthMarkerMode(!berthMarkerMode);
                setBoatPlacementMode(false);
                setSelectedBerthMarker(null);
                // Set default berth code
                if (!berthMarkerMode && !newBerthCode) {
                  setNewBerthCode(`${newBerthPontoon}-01`);
                }
              }}
            >
              <MapPin className="w-4 h-4 mr-1" />
              {berthMarkerMode ? 'Završi' : 'Označi vezove'}
            </Button>
          )}

          {/* Boat placement mode (Manager/Admin only) */}
          {isManager && (
            <Button
              variant={boatPlacementMode ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setBoatPlacementMode(!boatPlacementMode);
                setBerthMarkerMode(false);
                setSelectedBoat(null);
              }}
            >
              <Ship className="w-4 h-4 mr-1" />
              {boatPlacementMode ? 'Završi' : 'Postavi brodove'}
            </Button>
          )}
        </div>
      </div>

      {/* Map */}
      <div className="h-full pt-10">
        <MarinaMap
          berths={BERTHS}
          boats={boats}
          berthMarkers={berthMarkers}
          onBerthClick={handleBerthClick}
          onBoatClick={handleBoatClick}
          onBerthMarkerClick={handleBerthMarkerClick}
          selectedBerthId={selectedBerth?.id}
          selectedBoatId={selectedBoat?.id}
          selectedBerthMarkerId={selectedBerthMarker?.id}
          boatPlacementMode={boatPlacementMode}
          berthMarkerMode={berthMarkerMode}
          onMapClick={handleMapClick}
          onBoatDragEnd={handleBoatDragEnd}
          onBerthMarkerDragEnd={handleBerthMarkerDragEnd}
        />
      </div>

      {/* Legend */}
      <MapLegend />

      {/* Boat Placement Panel */}
      {boatPlacementMode && isManager && (
        <Card className="absolute top-16 right-4 z-[1000] p-4 w-80">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold flex items-center gap-2">
              <Ship className="w-5 h-5" />
              Postavljanje brodova
            </h3>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => {
                setBoatPlacementMode(false);
                setSelectedBoat(null);
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Selected boat controls - show prominently when boat is selected */}
          {selectedBoat ? (
            <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-3 mb-4 border-2 border-blue-500">
              <p className="text-sm font-semibold mb-3 text-blue-700 dark:text-blue-300">
                Brod: {selectedBoat.vesselName || selectedBoat.vesselRegistration || 'Nepoznat'}
              </p>

              {/* Berth selector - CHANGE BERTH */}
              <div className="mb-3">
                <Label className="text-xs mb-2 block">Trenutni vez: <span className="font-bold">{selectedBoat.berthCode}</span></Label>
                <select
                  value={selectedBoat.berthCode}
                  onChange={async (e) => {
                    const newBerthCode = e.target.value;
                    const oldBerthCode = selectedBoat.berthCode;

                    if (newBerthCode === oldBerthCode) return;

                    // Update boat with new berth
                    const updatedBoat = {
                      ...selectedBoat,
                      berthCode: newBerthCode,
                      updatedAt: new Date().toISOString()
                    };

                    updateBoat(updatedBoat);
                    setSelectedBoat(updatedBoat);

                    // Record movement in history
                    try {
                      const supabase = (await import('@/lib/supabase/client')).getSupabaseClient();
                      await supabase.from('vessel_movement_history').insert({
                        vessel_registration: selectedBoat.vesselRegistration || 'UNKNOWN',
                        vessel_name: selectedBoat.vesselName || null,
                        from_berth_code: oldBerthCode,
                        to_berth_code: newBerthCode,
                        reason: 'relocation',
                        notes: `Premjesten sa ${oldBerthCode} na ${newBerthCode}`,
                        moved_by_name: user?.full_name || 'System'
                      });
                    } catch (err) {
                      console.error('Error recording movement:', err);
                    }
                  }}
                  className="w-full h-9 text-sm border rounded px-2 bg-white dark:bg-slate-800 font-medium"
                >
                  {/* Trenutni vez broda - uvijek prikaži kao opciju */}
                  {!berthMarkers.find(m => m.code === selectedBoat.berthCode) && (
                    <option value={selectedBoat.berthCode}>
                      {selectedBoat.berthCode} (trenutni)
                    </option>
                  )}
                  {/* Filter duplicates by code */}
                  {berthMarkers
                    .filter((marker, index, self) =>
                      index === self.findIndex(m => m.code === marker.code)
                    )
                    .map((marker) => (
                    <option key={marker.id} value={marker.code}>
                      {marker.code} {marker.code === selectedBoat.berthCode ? '(trenutni)' : marker.status === 'free' ? '(slobodan)' : marker.status === 'occupied' ? '(zauzet)' : `(${marker.status})`}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Izaberi novi vez da premjestiš brod
                </p>
              </div>

              {/* Size selector */}
              <div className="mb-3">
                <Label className="text-xs mb-2 block">Veličina broda</Label>
                <div className="flex gap-1">
                  {Object.values(BOAT_SIZES).map((size) => (
                    <button
                      key={size.id}
                      onClick={() => {
                        const updatedBoat = { ...selectedBoat, size: size.id, updatedAt: new Date().toISOString() };
                        updateBoat(updatedBoat);
                        setSelectedBoat(updatedBoat);
                      }}
                      className={`
                        flex flex-col items-center p-1.5 rounded border-2 transition-all flex-1
                        ${selectedBoat.size === size.id
                          ? 'border-blue-500 bg-white dark:bg-blue-900/50'
                          : 'border-gray-200 hover:border-gray-300 dark:border-gray-600'
                        }
                      `}
                      title={size.lengthRange}
                    >
                      <img src={size.iconPath} alt={size.label} className="h-6 w-auto" />
                      <span className="text-[9px] font-medium">{size.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Rotation controls */}
              <div className="mb-3">
                <Label className="text-xs mb-2 block">Rotacija: {selectedBoat.rotation}°</Label>
                <input
                  type="range"
                  min="0"
                  max="359"
                  value={selectedBoat.rotation}
                  onChange={(e) => {
                    const newRotation = Number(e.target.value);
                    const updatedBoat = { ...selectedBoat, rotation: newRotation, updatedAt: new Date().toISOString() };
                    updateBoat(updatedBoat);
                    setSelectedBoat(updatedBoat);
                  }}
                  className="w-full"
                />
                <div className="flex gap-1 mt-1">
                  {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
                    <button
                      key={angle}
                      onClick={() => {
                        const updatedBoat = { ...selectedBoat, rotation: angle, updatedAt: new Date().toISOString() };
                        updateBoat(updatedBoat);
                        setSelectedBoat(updatedBoat);
                      }}
                      className={`
                        px-1.5 py-0.5 text-[10px] rounded border
                        ${selectedBoat.rotation === angle
                          ? 'bg-blue-500 text-white border-blue-500'
                          : 'border-gray-300 hover:bg-gray-100 dark:border-gray-600'
                        }
                      `}
                    >
                      {angle}°
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleRotateBoat(-15)}
                  className="flex-1"
                >
                  <RotateCw className="w-4 h-4 mr-1 scale-x-[-1]" />
                  -15°
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleRotateBoat(15)}
                  className="flex-1"
                >
                  <RotateCw className="w-4 h-4 mr-1" />
                  +15°
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDeleteBoat}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedBoat(null)}
                className="w-full mt-2 text-xs"
              >
                Gotovo - postavi sljedeći brod
              </Button>
            </div>
          ) : (
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 mb-4 border border-dashed border-gray-300 dark:border-gray-600">
              <p className="text-sm text-center text-muted-foreground">
                Kliknite na mapu da postavite brod
              </p>
            </div>
          )}

          {/* Berth code selector */}
          <div className="mb-4">
            <Label className="text-xs mb-2 block">Broj veza</Label>
            {berthMarkers.length > 0 ? (
              <select
                value={newBoatBerthCode}
                onChange={(e) => setNewBoatBerthCode(e.target.value)}
                className="w-full h-8 text-sm border rounded px-2 bg-white dark:bg-slate-800"
              >
                <option value="">-- Izaberi vez --</option>
                {/* Filter duplicates and show free berths first */}
                {berthMarkers
                  .filter((m, i, self) => i === self.findIndex(x => x.code === m.code))
                  .filter(m => m.status === 'free')
                  .map((marker) => (
                    <option key={marker.id} value={marker.code}>
                      {marker.code} (slobodan)
                    </option>
                  ))}
                {berthMarkers
                  .filter((m, i, self) => i === self.findIndex(x => x.code === m.code))
                  .filter(m => m.status !== 'free')
                  .map((marker) => (
                    <option key={marker.id} value={marker.code}>
                      {marker.code} ({marker.status === 'occupied' ? 'zauzet' : marker.status === 'reserved' ? 'rezervisan' : 'održavanje'})
                    </option>
                  ))}
              </select>
            ) : (
              <div className="text-xs text-muted-foreground p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded border border-yellow-200 dark:border-yellow-800">
                Nema označenih vezova. Prvo označite vezove koristeći "Označi vezove" dugme.
              </div>
            )}
          </div>

          {/* Vessel info (optional) - collapsible */}
          <details className="mb-4">
            <summary className="text-xs font-medium cursor-pointer mb-2">
              Dodatne informacije (opciono)
            </summary>
            <div className="space-y-2 mt-2">
              <div>
                <Label className="text-xs">Ime plovila</Label>
                <Input
                  value={newBoatName}
                  onChange={(e) => setNewBoatName(e.target.value)}
                  placeholder="npr. Sea Spirit"
                  className="h-8 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs">Registracija</Label>
                <Input
                  value={newBoatRegistration}
                  onChange={(e) => setNewBoatRegistration(e.target.value)}
                  placeholder="npr. HR-1234-AB"
                  className="h-8 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs mb-1 block">Slika plovila</Label>
                <PhotoUpload
                  onPhotoUploaded={(url) => setNewBoatImageUrl(url)}
                  currentPhotoUrl={newBoatImageUrl}
                  onPhotoRemoved={() => setNewBoatImageUrl('')}
                />
              </div>
            </div>
          </details>

          {/* Save button */}
          <div className="border-t pt-3">
            <Button onClick={handleSaveBoats} className="w-full">
              <Save className="w-4 h-4 mr-2" />
              Sačuvaj sve brodove ({boats.length})
            </Button>
          </div>
        </Card>
      )}

      {/* Berth Marker Mode Panel */}
      {berthMarkerMode && isManager && (
        <Card className="absolute top-16 right-4 z-[1000] p-4 w-80">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Označavanje vezova
            </h3>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => {
                setBerthMarkerMode(false);
                setSelectedBerthMarker(null);
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Selected berth marker controls */}
          {selectedBerthMarker ? (
            <div className="bg-green-50 dark:bg-green-900/30 rounded-lg p-3 mb-4 border-2 border-green-500">
              <p className="text-sm font-semibold mb-2 text-green-700 dark:text-green-300">
                Vez: {selectedBerthMarker.code}
              </p>

              {/* Status selector */}
              <div className="mb-3">
                <Label className="text-xs mb-2 block">Status veza</Label>
                <div className="flex gap-1">
                  {[
                    { status: 'free' as const, label: 'Slobodan', color: 'bg-green-500' },
                    { status: 'occupied' as const, label: 'Zauzet', color: 'bg-red-500' },
                    { status: 'reserved' as const, label: 'Rezerv.', color: 'bg-yellow-500' },
                    { status: 'maintenance' as const, label: 'Održav.', color: 'bg-gray-400' },
                  ].map(({ status, label, color }) => (
                    <button
                      key={status}
                      onClick={() => handleChangeBerthStatus(status)}
                      className={`
                        flex-1 px-2 py-1 text-[10px] rounded border font-medium
                        ${selectedBerthMarker.status === status
                          ? `${color} text-white border-transparent`
                          : 'border-gray-300 hover:bg-gray-100 dark:border-gray-600'
                        }
                      `}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDeleteBerthMarker}
                  className="flex-1"
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Obriši
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedBerthMarker(null)}
                  className="flex-1"
                >
                  Gotovo
                </Button>
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 mb-4 border border-dashed border-gray-300 dark:border-gray-600">
              <p className="text-sm text-center text-muted-foreground">
                Unesite šifru i kliknite na mapu
              </p>
            </div>
          )}

          {/* New berth inputs */}
          <div className="space-y-3 mb-4">
            <div>
              <Label className="text-xs mb-1 block">Ponton</Label>
              <div className="flex gap-1">
                {['A', 'B', 'C', 'D', 'E'].map((p) => (
                  <button
                    key={p}
                    onClick={() => {
                      setNewBerthPontoon(p);
                      // Update berth code
                      const match = newBerthCode.match(/^[A-Z]-(\d+)$/);
                      if (match) {
                        setNewBerthCode(`${p}-${match[1]}`);
                      } else {
                        setNewBerthCode(`${p}-01`);
                      }
                    }}
                    className={`
                      flex-1 py-1.5 text-sm font-medium rounded border
                      ${newBerthPontoon === p
                        ? 'bg-green-500 text-white border-green-500'
                        : 'border-gray-300 hover:bg-gray-100 dark:border-gray-600'
                      }
                    `}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-xs mb-1 block">Šifra veza</Label>
              <Input
                value={newBerthCode}
                onChange={(e) => setNewBerthCode(e.target.value.toUpperCase())}
                placeholder="npr. A-01"
                className="h-8 text-sm font-mono"
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                Format: PONTON-BROJ (npr. A-01, B-15)
              </p>
            </div>
          </div>

          <p className="text-xs text-muted-foreground mb-3">
            Kliknite na mapu da postavite oznaku veza. Možete ih pomjerati drag & drop.
          </p>

          {/* Save button */}
          <div className="border-t pt-3">
            <Button onClick={handleSaveBoats} className="w-full" disabled={isSaving}>
              {isSaving ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              {isSaving ? 'Spremam...' : `Sačuvaj sve (${berthMarkers.length} vezova)`}
            </Button>
          </div>
        </Card>
      )}

      {/* Berth panel (for polygon berths) */}
      {selectedBerth && !boatPlacementMode && !berthMarkerMode && (
        <BerthPanel
          berth={selectedBerth}
          userRole={user.role}
          onClose={handleClosePanel}
          onSave={handleSaveOccupancy}
        />
      )}

      {/* Berth Marker Panel (for marker berths - shows details & calendar) */}
      {selectedBerthMarker && !boatPlacementMode && !berthMarkerMode && (
        <BerthMarkerPanel
          marker={selectedBerthMarker}
          onClose={handleCloseBerthMarkerPanel}
          onNewBooking={handleNewBooking}
        />
      )}

      {/* Instructions for empty map */}
      {berthMarkers.length === 0 && boats.length === 0 && !boatPlacementMode && !berthMarkerMode && (
        <Card className="absolute bottom-20 left-1/2 -translate-x-1/2 z-[1000] p-4 max-w-md text-center">
          <h3 className="font-semibold mb-2">Mapa je spremna</h3>
          <p className="text-sm text-muted-foreground">
            1. Kliknite "Označi vezove" da označite mjesta za brodove<br/>
            2. Kliknite "Postavi brodove" da postavite brodove na vezove
          </p>
        </Card>
      )}
    </div>
  );
}
