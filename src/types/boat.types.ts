// Boat size categories
export type BoatSize = 'xs' | 's' | 'm' | 'l' | 'xl';

export interface BoatSizeInfo {
  id: BoatSize;
  label: string;
  description: string;
  lengthRange: string;
  iconPath: string;
  iconWidth: number;
  iconHeight: number;
}

export const BOAT_SIZES: Record<BoatSize, BoatSizeInfo> = {
  xs: {
    id: 'xs',
    label: 'XS',
    description: 'Vrlo mali',
    lengthRange: 'do 6m',
    iconPath: '/boats/boat-xs.svg',
    iconWidth: 20,
    iconHeight: 40,
  },
  s: {
    id: 's',
    label: 'S',
    description: 'Mali',
    lengthRange: '6-9m',
    iconPath: '/boats/boat-s.svg',
    iconWidth: 25,
    iconHeight: 50,
  },
  m: {
    id: 'm',
    label: 'M',
    description: 'Srednji',
    lengthRange: '9-12m',
    iconPath: '/boats/boat-m.svg',
    iconWidth: 30,
    iconHeight: 60,
  },
  l: {
    id: 'l',
    label: 'L',
    description: 'Veliki',
    lengthRange: '12-15m',
    iconPath: '/boats/boat-l.svg',
    iconWidth: 35,
    iconHeight: 70,
  },
  xl: {
    id: 'xl',
    label: 'XL',
    description: 'Jahta',
    lengthRange: '15m+',
    iconPath: '/boats/boat-xl.svg',
    iconWidth: 40,
    iconHeight: 80,
  },
};

// Berth marker on map
export interface BerthMarker {
  id: string;
  code: string; // e.g., "A-01", "B-05"
  pontoon: string; // e.g., "A", "B", "C"
  position: {
    lat: number;
    lng: number;
  };
  status: 'free' | 'occupied' | 'reserved' | 'maintenance';
  assignedBoatId?: string; // ID of the boat assigned to this berth
  createdAt: string;
  updatedAt: string;
}

// Boat placement on map
export interface BoatPlacement {
  id: string;
  berthId: string;
  berthCode: string;
  size: BoatSize;
  rotation: number; // degrees, 0 = pointing up (north)
  position: {
    lat: number;
    lng: number;
  };
  vesselName?: string;
  vesselRegistration?: string;
  vesselImageUrl?: string; // URL to actual photo of the boat
  placedBy: string;
  placedAt: string;
  updatedAt: string;
}
