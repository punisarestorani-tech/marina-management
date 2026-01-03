'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { MapContainer, ImageOverlay, Polygon, useMap, Tooltip, TileLayer, useMapEvents, LayersControl, Marker, Popup, Circle, CircleMarker } from 'react-leaflet';
import L, { LatLngBoundsExpression, LatLngExpression } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { cn } from '@/lib/utils';
import { BerthMapData } from '@/types/database.types';
import { BerthMarker } from '@/types/boat.types';

// Marina center - based on A-06 berth position
const MARINA_CENTER: LatLngExpression = [42.2875, 18.8405];
const DEFAULT_ZOOM = 19;

// Tile layer options
const TILE_LAYERS = {
  googleSatellite: {
    url: 'https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
    name: 'Google Satelit',
    maxNativeZoom: 21,
  },
  googleHybrid: {
    url: 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
    name: 'Google Hybrid',
    maxNativeZoom: 21,
  },
  googleStreets: {
    url: 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
    name: 'Google Streets',
    maxNativeZoom: 21,
  },
  esriSatellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    name: 'ESRI Satelit',
    maxNativeZoom: 19,
  },
  openStreetMap: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    name: 'OpenStreetMap',
    maxNativeZoom: 19,
  },
};

// Bounds for orthophoto overlay (adjust these after placing the image)
// Format: [[south, west], [north, east]]
const ORTHOPHOTO_BOUNDS: LatLngBoundsExpression = [
  [42.2870, 18.8375], // Southwest corner
  [42.2905, 18.8430], // Northeast corner
];

// Status colors
const STATUS_COLORS = {
  free: '#22c55e',       // green-500
  occupied: '#ef4444',   // red-500
  reserved: '#eab308',   // yellow-500
  inactive: '#6b7280',   // gray-500
  maintenance: '#9ca3af', // gray-400
};

interface MarinaMapProps {
  berths: BerthMapData[];
  berthMarkers?: BerthMarker[];
  onBerthClick?: (berth: BerthMapData) => void;
  onBerthMarkerClick?: (marker: BerthMarker) => void;
  selectedBerthId?: string | null;
  selectedBerthMarkerId?: string | null;
  className?: string;
  interactive?: boolean;
  onMapClick?: (latlng: { lat: number; lng: number }) => void;
  berthMarkerMode?: boolean;
  onBerthMarkerDragEnd?: (marker: BerthMarker, newPosition: { lat: number; lng: number }) => void;
  showUserLocation?: boolean;
  initialCenter?: { lat: number; lng: number };
}

// User location state
interface UserLocation {
  lat: number;
  lng: number;
  accuracy: number;
  heading?: number | null;
}

// Component to track and display user location
function UserLocationMarker({ onLocationUpdate }: { onLocationUpdate?: (loc: UserLocation) => void }) {
  const [position, setPosition] = useState<UserLocation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const map = useMap();

  useEffect(() => {
    if (!navigator.geolocation) {
      setError('Geolokacija nije podržana');
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const newPos: UserLocation = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          heading: pos.coords.heading,
        };
        setPosition(newPos);
        onLocationUpdate?.(newPos);
      },
      (err) => {
        console.error('Geolocation error:', err);
        setError(err.message);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5000,
      }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [onLocationUpdate]);

  if (!position) return null;

  return (
    <>
      {/* Accuracy circle */}
      <Circle
        center={[position.lat, position.lng]}
        radius={position.accuracy}
        pathOptions={{
          color: '#4285f4',
          fillColor: '#4285f4',
          fillOpacity: 0.15,
          weight: 1,
        }}
      />
      {/* User position dot */}
      <CircleMarker
        center={[position.lat, position.lng]}
        radius={8}
        pathOptions={{
          color: '#fff',
          fillColor: '#4285f4',
          fillOpacity: 1,
          weight: 3,
        }}
      >
        <Popup>
          <div className="text-sm">
            <p className="font-semibold">Vaša lokacija</p>
            <p className="text-xs text-gray-500">
              Tačnost: {Math.round(position.accuracy)}m
            </p>
          </div>
        </Popup>
      </CircleMarker>
      {/* Heading indicator (if available) */}
      {position.heading !== null && position.heading !== undefined && (
        <Marker
          position={[position.lat, position.lng]}
          icon={L.divIcon({
            className: 'user-heading-icon',
            html: `
              <div style="
                width: 0;
                height: 0;
                border-left: 6px solid transparent;
                border-right: 6px solid transparent;
                border-bottom: 12px solid #4285f4;
                transform: rotate(${position.heading}deg);
                transform-origin: center bottom;
              "></div>
            `,
            iconSize: [12, 12],
            iconAnchor: [6, 12],
          })}
        />
      )}
    </>
  );
}

// Create berth marker icon
function createBerthMarkerIcon(marker: BerthMarker, isSelected: boolean, zoom: number): L.DivIcon {
  // Very small base size
  const baseSize = 6;
  const scaleFactor = Math.pow(2, (zoom - 19));
  const size = Math.max(6, Math.round(baseSize * scaleFactor));
  const fontSize = Math.max(4, Math.round(4 * scaleFactor));
  const padding = Math.max(1, Math.round(2 * scaleFactor));

  const statusColors: Record<string, string> = {
    free: '#22c55e',
    occupied: '#ef4444',
    reserved: '#eab308',
    maintenance: '#9ca3af',
  };
  const color = statusColors[marker.status] || '#3b82f6';

  // Calculate dynamic width based on text length
  const textWidth = marker.code.length * fontSize * 0.6;
  const width = Math.max(size, textWidth + padding * 2);

  return L.divIcon({
    className: 'berth-marker-icon',
    html: `
      <div style="
        min-width: ${size}px;
        height: ${size}px;
        padding: 0 ${padding}px;
        background: ${color};
        border: 1px solid ${isSelected ? '#fff' : 'rgba(0,0,0,0.5)'};
        border-radius: 2px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: ${fontSize}px;
        font-weight: bold;
        color: white;
        text-shadow: 0 0 1px rgba(0,0,0,0.8);
        box-shadow: ${isSelected ? '0 0 4px #3b82f6' : '0 1px 2px rgba(0,0,0,0.3)'};
        cursor: pointer;
        white-space: nowrap;
      ">
        ${marker.code}
      </div>
    `,
    iconSize: [width, size],
    iconAnchor: [width / 2, size / 2],
  });
}

// Component to handle map events
function MapEventHandler({
  onMapClick,
  berthMarkerMode,
  onZoomChange,
}: {
  onMapClick?: (latlng: { lat: number; lng: number }) => void;
  berthMarkerMode?: boolean;
  onZoomChange?: (zoom: number) => void;
}) {
  const map = useMap();

  useMapEvents({
    click: (e) => {
      if (berthMarkerMode && onMapClick) {
        onMapClick({ lat: e.latlng.lat, lng: e.latlng.lng });
        console.log(`Clicked at: [${e.latlng.lat.toFixed(6)}, ${e.latlng.lng.toFixed(6)}]`);
      }
    },
    zoomend: () => {
      onZoomChange?.(map.getZoom());
    },
  });

  // Initial zoom
  useEffect(() => {
    onZoomChange?.(map.getZoom());
  }, [map, onZoomChange]);

  return null;
}

// Component to handle map centering
function MapController({ initialCenter }: { initialCenter?: { lat: number; lng: number } }) {
  const map = useMap();

  useEffect(() => {
    const center = initialCenter
      ? [initialCenter.lat, initialCenter.lng] as LatLngExpression
      : MARINA_CENTER;
    map.setView(center, DEFAULT_ZOOM);
  }, [map, initialCenter]);

  return null;
}

// Component for "center on my location" button
function CenterOnLocationButton() {
  const map = useMap();
  const [isLocating, setIsLocating] = useState(false);

  const handleClick = () => {
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        map.flyTo([pos.coords.latitude, pos.coords.longitude], 19, {
          duration: 1,
        });
        setIsLocating(false);
      },
      (err) => {
        console.error('Error getting location:', err);
        alert('Ne mogu dobiti vašu lokaciju. Provjerite da li je lokacija omogućena.');
        setIsLocating(false);
      },
      { enableHighAccuracy: true }
    );
  };

  return (
    <button
      onClick={handleClick}
      disabled={isLocating}
      className="absolute bottom-24 right-3 z-[1000] bg-white dark:bg-slate-800 p-2 rounded-lg shadow-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
      title="Moja lokacija"
    >
      {isLocating ? (
        <svg className="w-5 h-5 animate-spin text-blue-500" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      ) : (
        <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      )}
    </button>
  );
}

export function MarinaMap({
  berths,
  berthMarkers = [],
  onBerthClick,
  onBerthMarkerClick,
  selectedBerthId,
  selectedBerthMarkerId,
  className,
  interactive = true,
  onMapClick,
  berthMarkerMode = false,
  onBerthMarkerDragEnd,
  showUserLocation = true,
  initialCenter,
}: MarinaMapProps) {
  const [isClient, setIsClient] = useState(false);
  const [currentZoom, setCurrentZoom] = useState(DEFAULT_ZOOM);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleZoomChange = useCallback((zoom: number) => {
    setCurrentZoom(zoom);
  }, []);

  // Get color based on berth status
  const getBerthColor = (berth: BerthMapData): string => {
    if (berth.status === 'inactive') return STATUS_COLORS.inactive;
    if (berth.status === 'maintenance') return STATUS_COLORS.maintenance;

    switch (berth.occupancy_status) {
      case 'occupied':
        return STATUS_COLORS.occupied;
      case 'reserved':
        return STATUS_COLORS.reserved;
      case 'free':
      default:
        return STATUS_COLORS.free;
    }
  };

  // Convert berth polygon data to Leaflet format
  const getBerthPositions = (polygon: number[][]): LatLngExpression[] => {
    return polygon.map(([lat, lng]) => [lat, lng] as LatLngExpression);
  };

  if (!isClient) {
    return (
      <div className={cn('w-full h-full bg-slate-200 animate-pulse', className)} />
    );
  }

  return (
    <MapContainer
      center={MARINA_CENTER}
      zoom={DEFAULT_ZOOM}
      minZoom={15}
      maxZoom={22}
      className={cn('w-full h-full', className)}
      style={{ background: '#1e3a5f' }}
      zoomControl={true}
      attributionControl={false}
    >
      <MapController initialCenter={initialCenter} />
      <MapEventHandler onMapClick={onMapClick} berthMarkerMode={berthMarkerMode} onZoomChange={handleZoomChange} />

      {/* User location */}
      {showUserLocation && (
        <>
          <UserLocationMarker onLocationUpdate={setUserLocation} />
          <CenterOnLocationButton />
        </>
      )}

      {/* Layer control for switching between map types */}
      <LayersControl position="topright">
        <LayersControl.BaseLayer checked name={TILE_LAYERS.googleSatellite.name}>
          <TileLayer
            url={TILE_LAYERS.googleSatellite.url}
            maxZoom={22}
            maxNativeZoom={TILE_LAYERS.googleSatellite.maxNativeZoom}
          />
        </LayersControl.BaseLayer>
        <LayersControl.BaseLayer name={TILE_LAYERS.googleHybrid.name}>
          <TileLayer
            url={TILE_LAYERS.googleHybrid.url}
            maxZoom={22}
            maxNativeZoom={TILE_LAYERS.googleHybrid.maxNativeZoom}
          />
        </LayersControl.BaseLayer>
        <LayersControl.BaseLayer name={TILE_LAYERS.esriSatellite.name}>
          <TileLayer
            url={TILE_LAYERS.esriSatellite.url}
            maxZoom={22}
            maxNativeZoom={TILE_LAYERS.esriSatellite.maxNativeZoom}
          />
        </LayersControl.BaseLayer>
        <LayersControl.BaseLayer name={TILE_LAYERS.openStreetMap.name}>
          <TileLayer
            url={TILE_LAYERS.openStreetMap.url}
            maxZoom={22}
            maxNativeZoom={TILE_LAYERS.openStreetMap.maxNativeZoom}
          />
        </LayersControl.BaseLayer>

        {/* Orthophoto overlay option */}
        <LayersControl.Overlay name="Orthophoto (lokalni)">
          <ImageOverlay
            url="/marina-orthophoto.png"
            bounds={ORTHOPHOTO_BOUNDS}
            opacity={0.95}
          />
        </LayersControl.Overlay>
      </LayersControl>

      {/* Berth polygons */}
      {berths.map((berth) => {
        const color = getBerthColor(berth);
        const isSelected = selectedBerthId === berth.id;

        return (
          <Polygon
            key={berth.id}
            positions={getBerthPositions(berth.polygon)}
            pathOptions={{
              color: isSelected ? '#3b82f6' : color,
              fillColor: color,
              fillOpacity: isSelected ? 0.7 : 0.5,
              weight: isSelected ? 3 : 2,
            }}
            eventHandlers={{
              click: () => {
                if (interactive && onBerthClick) {
                  onBerthClick(berth);
                }
              },
            }}
          >
            <Tooltip direction="top" offset={[0, -10]} opacity={0.9}>
              <div className="text-sm">
                <p className="font-semibold">{berth.code}</p>
                <p className="capitalize">
                  {berth.status === 'maintenance' ? 'Na održavanju' :
                   berth.status === 'inactive' ? 'Neaktivan' :
                   berth.occupancy_status === 'occupied' ? 'Zauzet' :
                   berth.occupancy_status === 'reserved' ? 'Rezervisan' : 'Slobodan'}
                </p>
                {berth.vessel_registration && (
                  <p className="text-xs text-gray-500">{berth.vessel_registration}</p>
                )}
              </div>
            </Tooltip>
          </Polygon>
        );
      })}

      {/* Berth markers */}
      {berthMarkers.map((marker) => {
        const isSelected = selectedBerthMarkerId === marker.id;
        const icon = createBerthMarkerIcon(marker, isSelected, currentZoom);

        return (
          <Marker
            key={marker.id}
            position={[marker.position.lat, marker.position.lng]}
            icon={icon}
            draggable={berthMarkerMode}
            eventHandlers={{
              click: () => onBerthMarkerClick?.(marker),
              dragend: (e) => {
                const m = e.target;
                const position = m.getLatLng();
                onBerthMarkerDragEnd?.(marker, { lat: position.lat, lng: position.lng });
              },
            }}
          >
            <Tooltip direction="top" offset={[0, -15]} opacity={0.9}>
              <div className="text-xs">
                <p className="font-semibold">{marker.code}</p>
                <p className="capitalize">
                  {marker.status === 'free' ? 'Slobodan' :
                   marker.status === 'occupied' ? 'Zauzet' :
                   marker.status === 'reserved' ? 'Rezervisan' : 'Na održavanju'}
                </p>
              </div>
            </Tooltip>
          </Marker>
        );
      })}

    </MapContainer>
  );
}

// Legend component
export function MapLegend() {
  return (
    <div className="absolute bottom-4 left-4 z-[1000] bg-white dark:bg-slate-900 rounded-lg shadow-lg p-3">
      <p className="text-xs font-semibold mb-2">Legenda</p>
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: STATUS_COLORS.free }} />
          <span className="text-xs">Slobodan</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: STATUS_COLORS.occupied }} />
          <span className="text-xs">Zauzet</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: STATUS_COLORS.reserved }} />
          <span className="text-xs">Rezervisan</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: STATUS_COLORS.inactive }} />
          <span className="text-xs">Neaktivan</span>
        </div>
      </div>
    </div>
  );
}

// Coordinate display component for drawing mode
export function CoordinateDisplay({ coordinates }: { coordinates: { lat: number; lng: number }[] }) {
  if (coordinates.length === 0) return null;

  return (
    <div className="absolute top-4 right-4 z-[1000] bg-white dark:bg-slate-900 rounded-lg shadow-lg p-3 max-w-xs">
      <p className="text-xs font-semibold mb-2">Koordinate poligona ({coordinates.length} tačaka)</p>
      <div className="text-xs font-mono max-h-40 overflow-y-auto">
        [
        {coordinates.map((coord, i) => (
          <div key={i} className="pl-2">
            [{coord.lat.toFixed(6)}, {coord.lng.toFixed(6)}]{i < coordinates.length - 1 ? ',' : ''}
          </div>
        ))}
        ]
      </div>
    </div>
  );
}
