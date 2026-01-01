'use client';

import { useEffect, useRef } from 'react';
import { Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { BoatPlacement, BOAT_SIZES } from '@/types/boat.types';

interface BoatMarkerProps {
  boat: BoatPlacement;
  onClick?: (boat: BoatPlacement) => void;
  isSelected?: boolean;
  draggable?: boolean;
  onDragEnd?: (boat: BoatPlacement, newPosition: { lat: number; lng: number }) => void;
  onRotate?: (boat: BoatPlacement, newRotation: number) => void;
}

// Create a custom boat icon with rotation
function createBoatIcon(boat: BoatPlacement, isSelected: boolean): L.DivIcon {
  const sizeInfo = BOAT_SIZES[boat.size];

  return L.divIcon({
    className: 'boat-marker',
    html: `
      <div
        class="boat-icon ${isSelected ? 'selected' : ''}"
        style="
          width: ${sizeInfo.iconWidth}px;
          height: ${sizeInfo.iconHeight}px;
          transform: rotate(${boat.rotation}deg);
          transform-origin: center center;
          transition: transform 0.2s ease;
          filter: ${isSelected ? 'drop-shadow(0 0 8px #3b82f6)' : 'drop-shadow(2px 2px 2px rgba(0,0,0,0.3))'};
          cursor: pointer;
        "
      >
        <img
          src="${sizeInfo.iconPath}"
          alt="Boat ${sizeInfo.label}"
          style="width: 100%; height: 100%;"
        />
      </div>
    `,
    iconSize: [sizeInfo.iconWidth, sizeInfo.iconHeight],
    iconAnchor: [sizeInfo.iconWidth / 2, sizeInfo.iconHeight / 2],
    popupAnchor: [0, -sizeInfo.iconHeight / 2],
  });
}

export function BoatMarker({
  boat,
  onClick,
  isSelected = false,
  draggable = false,
  onDragEnd,
}: BoatMarkerProps) {
  const markerRef = useRef<L.Marker>(null);
  const icon = createBoatIcon(boat, isSelected);
  const sizeInfo = BOAT_SIZES[boat.size];

  const handleDragEnd = () => {
    const marker = markerRef.current;
    if (marker && onDragEnd) {
      const position = marker.getLatLng();
      onDragEnd(boat, { lat: position.lat, lng: position.lng });
    }
  };

  return (
    <Marker
      ref={markerRef}
      position={[boat.position.lat, boat.position.lng]}
      icon={icon}
      draggable={draggable}
      eventHandlers={{
        click: () => onClick?.(boat),
        dragend: handleDragEnd,
      }}
    >
      <Popup>
        <div className="text-sm min-w-[150px]">
          <p className="font-semibold text-base mb-1">{boat.berthCode}</p>
          {boat.vesselName && (
            <p className="text-gray-700">{boat.vesselName}</p>
          )}
          {boat.vesselRegistration && (
            <p className="text-gray-500 text-xs">{boat.vesselRegistration}</p>
          )}
          <div className="mt-2 pt-2 border-t">
            <p className="text-xs text-gray-500">
              Veličina: {sizeInfo.label} ({sizeInfo.lengthRange})
            </p>
            <p className="text-xs text-gray-500">
              Rotacija: {boat.rotation}°
            </p>
          </div>
        </div>
      </Popup>
    </Marker>
  );
}

// Boat size selector component
interface BoatSizeSelectorProps {
  selectedSize: string | null;
  onSelectSize: (size: string) => void;
}

export function BoatSizeSelector({ selectedSize, onSelectSize }: BoatSizeSelectorProps) {
  const sizes = Object.values(BOAT_SIZES);

  return (
    <div className="flex gap-2">
      {sizes.map((size) => (
        <button
          key={size.id}
          onClick={() => onSelectSize(size.id)}
          className={`
            flex flex-col items-center p-2 rounded-lg border-2 transition-all
            ${selectedSize === size.id
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
              : 'border-gray-200 hover:border-gray-300 dark:border-gray-700'
            }
          `}
          title={`${size.description} (${size.lengthRange})`}
        >
          <img
            src={size.iconPath}
            alt={size.label}
            className="h-10 w-auto"
          />
          <span className="text-xs font-medium mt-1">{size.label}</span>
          <span className="text-[10px] text-gray-500">{size.lengthRange}</span>
        </button>
      ))}
    </div>
  );
}

// Rotation control component
interface RotationControlProps {
  rotation: number;
  onChange: (rotation: number) => void;
}

export function RotationControl({ rotation, onChange }: RotationControlProps) {
  const presetAngles = [0, 45, 90, 135, 180, 225, 270, 315];

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <input
          type="range"
          min="0"
          max="359"
          value={rotation}
          onChange={(e) => onChange(Number(e.target.value))}
          className="flex-1"
        />
        <span className="text-sm font-mono w-12 text-right">{rotation}°</span>
      </div>
      <div className="flex flex-wrap gap-1">
        {presetAngles.map((angle) => (
          <button
            key={angle}
            onClick={() => onChange(angle)}
            className={`
              px-2 py-1 text-xs rounded border
              ${rotation === angle
                ? 'bg-blue-500 text-white border-blue-500'
                : 'border-gray-300 hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-800'
              }
            `}
          >
            {angle}°
          </button>
        ))}
      </div>
    </div>
  );
}
