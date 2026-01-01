// Inspection system types

export type InspectionStatus =
  | 'correct'          // Ispravan brod na vezu
  | 'wrong_vessel'     // Pogrešan brod
  | 'illegal_mooring'  // Nelegalno vezivanje
  | 'missing_vessel'   // Brod nije na vezu
  | 'empty_ok';        // Slobodan vez, prazan - OK

export interface Inspection {
  id: string;
  berth_id?: string;
  berth_code: string;
  inspector_id?: string;
  inspector_name?: string;
  status: InspectionStatus;
  found_vessel_name?: string;
  found_vessel_registration?: string;
  expected_vessel_name?: string;
  expected_vessel_registration?: string;
  notes?: string;
  photo_url?: string;
  inspected_at: string;
  created_at: string;
}

export type ViolationType =
  | 'illegal_mooring'   // Nelegalno vezivanje
  | 'wrong_berth'       // Plovilo na pogrešnom vezu
  | 'overstay'          // Prekoračenje vremena
  | 'unpaid'            // Neplaćena naknada
  | 'damage'            // Oštećenje imovine
  | 'rules_violation'   // Kršenje pravila marine
  | 'other';            // Ostalo

export type ViolationStatus = 'open' | 'in_progress' | 'resolved' | 'dismissed';

export interface Violation {
  id: string;
  inspection_id?: string;
  berth_id?: string;
  berth_code?: string;
  location_description?: string;
  violation_type: ViolationType;
  vessel_name?: string;
  vessel_registration?: string;
  vessel_description?: string;
  description: string;
  photo_urls?: string[];
  status: ViolationStatus;
  resolution_notes?: string;
  resolved_by?: string;
  resolved_at?: string;
  reported_by?: string;
  reported_by_name?: string;
  created_at: string;
  updated_at: string;
}

export type LocationType =
  | 'berth'      // Vez
  | 'pontoon'    // Ponton
  | 'dock'       // Gat
  | 'facility'   // Objekt
  | 'electrical' // Električna instalacija
  | 'water'      // Vodovodna instalacija
  | 'other';     // Ostalo

export type DamageCategory =
  | 'electrical'   // Električni kvar
  | 'plumbing'     // Vodovodni kvar
  | 'structural'   // Konstrukcijski problem
  | 'safety'       // Sigurnosni problem
  | 'cleanliness'  // Čistoća
  | 'equipment'    // Oprema
  | 'other';       // Ostalo

export type DamageSeverity = 'low' | 'medium' | 'high' | 'critical';

export type DamageStatus = 'reported' | 'acknowledged' | 'in_progress' | 'completed' | 'cancelled';

export interface DamageReport {
  id: string;
  location_type: LocationType;
  berth_id?: string;
  berth_code?: string;
  location_description: string;
  category: DamageCategory;
  severity: DamageSeverity;
  title: string;
  description: string;
  photo_urls?: string[];
  status: DamageStatus;
  assigned_to?: string;
  assigned_to_name?: string;
  resolution_notes?: string;
  completed_by?: string;
  completed_at?: string;
  reported_by?: string;
  reported_by_name?: string;
  created_at: string;
  updated_at: string;
}

// Labels for UI
export const INSPECTION_STATUS_LABELS: Record<InspectionStatus, string> = {
  correct: 'Ispravno',
  wrong_vessel: 'Pogrešan brod',
  illegal_mooring: 'Nelegalno vezivanje',
  missing_vessel: 'Brod nije na vezu',
  empty_ok: 'Prazan - OK',
};

export const INSPECTION_STATUS_COLORS: Record<InspectionStatus, string> = {
  correct: 'bg-green-500',
  wrong_vessel: 'bg-orange-500',
  illegal_mooring: 'bg-red-500',
  missing_vessel: 'bg-yellow-500',
  empty_ok: 'bg-gray-400',
};

export const VIOLATION_TYPE_LABELS: Record<ViolationType, string> = {
  illegal_mooring: 'Nelegalno vezivanje',
  wrong_berth: 'Pogrešan vez',
  overstay: 'Prekoračenje vremena',
  unpaid: 'Neplaćena naknada',
  damage: 'Oštećenje imovine',
  rules_violation: 'Kršenje pravila',
  other: 'Ostalo',
};

export const VIOLATION_STATUS_LABELS: Record<ViolationStatus, string> = {
  open: 'Otvoreno',
  in_progress: 'U obradi',
  resolved: 'Riješeno',
  dismissed: 'Odbačeno',
};

export const LOCATION_TYPE_LABELS: Record<LocationType, string> = {
  berth: 'Vez',
  pontoon: 'Ponton',
  dock: 'Gat',
  facility: 'Objekt',
  electrical: 'Električna instalacija',
  water: 'Vodovodna instalacija',
  other: 'Ostalo',
};

export const DAMAGE_CATEGORY_LABELS: Record<DamageCategory, string> = {
  electrical: 'Električni kvar',
  plumbing: 'Vodovodni kvar',
  structural: 'Konstrukcijski problem',
  safety: 'Sigurnosni problem',
  cleanliness: 'Čistoća',
  equipment: 'Oprema',
  other: 'Ostalo',
};

export const DAMAGE_SEVERITY_LABELS: Record<DamageSeverity, string> = {
  low: 'Niska',
  medium: 'Srednja',
  high: 'Visoka',
  critical: 'Kritična',
};

export const DAMAGE_SEVERITY_COLORS: Record<DamageSeverity, string> = {
  low: 'bg-blue-500',
  medium: 'bg-yellow-500',
  high: 'bg-orange-500',
  critical: 'bg-red-500',
};

export const DAMAGE_STATUS_LABELS: Record<DamageStatus, string> = {
  reported: 'Prijavljeno',
  acknowledged: 'Primljeno',
  in_progress: 'U popravci',
  completed: 'Završeno',
  cancelled: 'Otkazano',
};
