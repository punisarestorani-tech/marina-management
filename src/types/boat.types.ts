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
  createdAt: string;
  updatedAt: string;
}
