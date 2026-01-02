'use client';

import dynamic from 'next/dynamic';
import { useState, useMemo, useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { BerthMapData } from '@/types/database.types';
import { BoatPlacement, BOAT_SIZES, BerthMarker } from '@/types/boat.types';
import { BerthPanel, BerthMarkerPanel, OccupancyFormData, BerthInspectionPopup } from '@/components/map';
import { MapLegend } from '@/components/map/MarinaMap';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Trash2, Save, Ship, RotateCw, MapPin, RefreshCw, X } from 'lucide-react';
import { PhotoUpload } from '@/components/ui/photo-upload';
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

  // Boats state
  const [boats, setBoats] = useState<BoatPlacement[]>([]);
  const [boatPlacementMode, setBoatPlacementMode] = useState(false);
  const [selectedBoat, setSelectedBoat] = useState<BoatPlacement | null>(null);
  const [newBoatName, setNewBoatName] = useState('');
  const [newBoatRegistration, setNewBoatRegistration] = useState('');
  const [newBoatImageUrl, setNewBoatImageUrl] = useState('');
  const [newBoatBerthCode, setNewBoatBerthCode] = useState('');

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

  // Load berths from database
  useEffect(() => {
    const loadBerths = async () => {
      try {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase
          .from('berths')
          .select('id, code, polygon, status')
          .eq('status', 'active');

        if (error) {
          console.error('Error loading berths:', error);
          return;
        }

        if (data) {
          // Deduplicate by code, keep first occurrence
          const seen = new Set<string>();
          const uniqueData = data.filter(b => {
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
            return {
              id: berth.id,
              code: berth.code,
              pontoon: berth.code.split('-')[0] || 'A',
              position: { lat, lng },
              status: 'free' as const,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
          });
          setBerthMarkers(markers);
        }
      } catch (err) {
        console.error('Error:', err);
      } finally {
        setIsLoadingBerths(false);
      }
    };
    loadBerths();
  }, []);

  // Load boats from database
  useEffect(() => {
    const loadBoats = async () => {
      try {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase
          .from('boat_placements')
          .select('*');

        if (error) {
          console.error('Error loading boats:', error);
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
        }
      } catch (err) {
        console.error('Error loading boats:', err);
      }
    };
    loadBoats();
  }, []);

  // Update berth marker statuses based on boats
  // Track berth codes that have boats assigned
  const boatBerthCodes = useMemo(() => {
    return boats.map(b => b.berthCode).join(',');
  }, [boats]);

  useEffect(() => {
    if (berthMarkers.length === 0) return;

    // Get all berth codes that have boats
    const occupiedBerthCodes = new Set(boats.map(b => b.berthCode));

    setBerthMarkers(prev => {
      const updated = prev.map(marker => ({
        ...marker,
        status: occupiedBerthCodes.has(marker.code) ? 'occupied' as const : 'free' as const,
        assignedBoatId: boats.find(b => b.berthCode === marker.code)?.id,
      }));
      return updated;
    });
  }, [boatBerthCodes, boats]); // Run when boat assignments change

  const isManager = user?.role === 'manager' || user?.role === 'admin';

  const handleBerthClick = (berth: BerthMapData) => {
    if (!boatPlacementMode && !berthMarkerMode) {
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
      const match = newBerthCode.match(/^([A-Z])-(\d+)$/);
      if (match) {
        const nextNum = parseInt(match[2]) + 1;
        setNewBerthCode(`${match[1]}-${nextNum.toString().padStart(2, '0')}`);
      }
    } else if (boatPlacementMode && isManager) {
      const berthCode = newBoatBerthCode.trim() || `Vez-${boats.length + 1}`;
      const newBoat: BoatPlacement = {
        id: crypto.randomUUID(),
        berthId: '',
        berthCode: berthCode,
        size: 'm',
        rotation: 0,
        position: latlng,
        vesselName: newBoatName || undefined,
        vesselRegistration: newBoatRegistration || undefined,
        vesselImageUrl: newBoatImageUrl || undefined,
        placedBy: user?.id || 'unknown',
        placedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setBoats((prev) => [...prev, newBoat]);
      setSelectedBoat(newBoat);
      setNewBoatName('');
      setNewBoatRegistration('');
      setNewBoatImageUrl('');
      setNewBoatBerthCode('');
    }
  };

  // Find expected boat for a berth
  const getExpectedBoatForBerth = (berthCode: string): BoatPlacement | null => {
    return boats.find(b => b.berthCode === berthCode) || null;
  };

  const handleBoatClick = (boat: BoatPlacement) => {
    if (boatPlacementMode) {
      setSelectedBoat(boat);
    }
  };

  const handleBoatDragEnd = (boat: BoatPlacement, newPosition: { lat: number; lng: number }) => {
    setBoats((prev) =>
      prev.map((b) => b.id === boat.id ? { ...b, position: newPosition } : b)
    );
  };

  const handleRotateBoat = (degrees: number) => {
    if (selectedBoat) {
      const newRotation = (selectedBoat.rotation + degrees + 360) % 360;
      setBoats((prev) =>
        prev.map((b) => b.id === selectedBoat.id ? { ...b, rotation: newRotation } : b)
      );
      setSelectedBoat({ ...selectedBoat, rotation: newRotation });
    }
  };

  const handleDeleteBoat = () => {
    if (selectedBoat) {
      setBoats((prev) => prev.filter((b) => b.id !== selectedBoat.id));
      setSelectedBoat(null);
    }
  };

  // Update berth statuses based on current boats
  const updateBerthStatuses = () => {
    const occupiedBerthCodes = new Set(boats.map(b => b.berthCode));
    setBerthMarkers(prev => prev.map(marker => ({
      ...marker,
      status: occupiedBerthCodes.has(marker.code) ? 'occupied' : 'free',
      assignedBoatId: boats.find(b => b.berthCode === marker.code)?.id,
    })));
  };

  // Save everything to database
  const handleSaveAll = async () => {
    setIsSaving(true);
    try {
      const supabase = getSupabaseClient();

      // Save boats
      for (const boat of boats) {
        await supabase.from('boat_placements').upsert({
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
      }

      // Update berth statuses after saving
      updateBerthStatuses();

      alert(`Sačuvano ${boats.length} brodova!`);
    } catch (error) {
      console.error('Error saving:', error);
      alert('Greška: ' + (error as Error).message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleBerthMarkerClick = (marker: BerthMarker) => {
    if (berthMarkerMode) {
      setSelectedBerthMarker(marker);
    } else if (!boatPlacementMode) {
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
    boatsCount: boats.length,
  }), [uniqueBerths.length, boats.length]);

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
        </div>

        <div className="flex items-center gap-2">
          {isManager && (
            <Button
              variant={berthMarkerMode ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setBerthMarkerMode(!berthMarkerMode);
                setBoatPlacementMode(false);
                if (!berthMarkerMode && !newBerthCode) {
                  setNewBerthCode(`${newBerthPontoon}-01`);
                }
              }}
            >
              <MapPin className="w-4 h-4 mr-1" />
              {berthMarkerMode ? 'Završi' : 'Označi vezove'}
            </Button>
          )}

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

      <MapLegend />

      {/* Boat Placement Panel */}
      {boatPlacementMode && isManager && (
        <Card className="absolute top-16 right-4 z-[1000] p-4 w-80">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold flex items-center gap-2">
              <Ship className="w-5 h-5" />
              Postavljanje brodova
            </h3>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setBoatPlacementMode(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {selectedBoat ? (
            <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-3 mb-4 border-2 border-blue-500">
              <p className="text-sm font-semibold mb-3 text-blue-700 dark:text-blue-300">
                Brod: {selectedBoat.vesselName || selectedBoat.berthCode}
              </p>

              {/* Berth selector */}
              <div className="mb-3">
                <Label className="text-xs mb-2 block">Trenutni vez: <b>{selectedBoat.berthCode}</b></Label>
                <select
                  value={selectedBoat.berthCode}
                  onChange={(e) => {
                    const newCode = e.target.value;
                    setBoats((prev) => prev.map((b) =>
                      b.id === selectedBoat.id ? { ...b, berthCode: newCode } : b
                    ));
                    setSelectedBoat({ ...selectedBoat, berthCode: newCode });
                  }}
                  className="w-full h-9 text-sm border rounded px-2 bg-white dark:bg-slate-800"
                >
                  <option value={selectedBoat.berthCode}>{selectedBoat.berthCode} (trenutni)</option>
                  {uniqueBerths.filter(m => m.code !== selectedBoat.berthCode).map((marker) => (
                    <option key={marker.id} value={marker.code}>{marker.code}</option>
                  ))}
                </select>
              </div>

              {/* Size selector */}
              <div className="mb-3">
                <Label className="text-xs mb-2 block">Veličina</Label>
                <div className="flex gap-1">
                  {Object.values(BOAT_SIZES).map((size) => (
                    <button
                      key={size.id}
                      onClick={() => {
                        setBoats((prev) => prev.map((b) =>
                          b.id === selectedBoat.id ? { ...b, size: size.id } : b
                        ));
                        setSelectedBoat({ ...selectedBoat, size: size.id });
                      }}
                      className={`flex-1 p-1.5 rounded border-2 ${selectedBoat.size === size.id ? 'border-blue-500' : 'border-gray-200'}`}
                    >
                      <img src={size.iconPath} alt={size.label} className="h-6 w-auto mx-auto" />
                      <span className="text-[9px]">{size.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Rotation */}
              <div className="mb-3">
                <Label className="text-xs mb-2 block">Rotacija: {selectedBoat.rotation}°</Label>
                <input
                  type="range" min="0" max="359"
                  value={selectedBoat.rotation}
                  onChange={(e) => {
                    const rot = Number(e.target.value);
                    setBoats((prev) => prev.map((b) =>
                      b.id === selectedBoat.id ? { ...b, rotation: rot } : b
                    ));
                    setSelectedBoat({ ...selectedBoat, rotation: rot });
                  }}
                  className="w-full"
                />
              </div>

              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => handleRotateBoat(-15)} className="flex-1">-15°</Button>
                <Button variant="outline" size="sm" onClick={() => handleRotateBoat(15)} className="flex-1">+15°</Button>
                <Button variant="destructive" size="sm" onClick={handleDeleteBoat}><Trash2 className="w-4 h-4" /></Button>
              </div>

              <Button variant="ghost" size="sm" onClick={() => setSelectedBoat(null)} className="w-full mt-2 text-xs">
                Gotovo
              </Button>
            </div>
          ) : (
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 mb-4 border border-dashed">
              <p className="text-sm text-center text-muted-foreground">Kliknite na mapu da postavite brod</p>
              {/* Berth selector for new boat */}
              <div className="mt-3">
                <Label className="text-xs mb-1 block">Vez za novi brod</Label>
                <select
                  value={newBoatBerthCode}
                  onChange={(e) => setNewBoatBerthCode(e.target.value)}
                  className="w-full h-8 text-sm border rounded px-2 bg-white dark:bg-slate-800"
                >
                  <option value="">-- Izaberi vez --</option>
                  {uniqueBerths.map((marker) => (
                    <option key={marker.id} value={marker.code}>{marker.code}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Save button */}
          <Button onClick={handleSaveAll} className="w-full" disabled={isSaving}>
            {isSaving ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Sačuvaj brodove ({boats.length})
          </Button>
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
              <Label className="text-xs mb-1 block">Šifra veza</Label>
              <Input
                value={newBerthCode}
                onChange={(e) => setNewBerthCode(e.target.value.toUpperCase())}
                placeholder="npr. A-01"
                className="h-8 text-sm font-mono"
              />
            </div>
          </div>
        </Card>
      )}

      {selectedBerth && !boatPlacementMode && !berthMarkerMode && (
        <BerthPanel berth={selectedBerth} userRole={user.role} onClose={handleClosePanel} onSave={handleSaveOccupancy} />
      )}

      {selectedBerthMarker && !boatPlacementMode && !berthMarkerMode && (
        <BerthMarkerPanel marker={selectedBerthMarker} onClose={handleCloseBerthMarkerPanel} onNewBooking={handleNewBooking} />
      )}

      {/* Inspection Popup - when clicking on a berth marker */}
      {inspectionBerth && !boatPlacementMode && !berthMarkerMode && (
        <BerthInspectionPopup
          marker={inspectionBerth}
          expectedBoat={getExpectedBoatForBerth(inspectionBerth.code)}
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
