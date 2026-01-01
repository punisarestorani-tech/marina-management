// Database Types for Marina Management System
// These types should be regenerated from Supabase after running migrations

export type UserRole = 'inspector' | 'operator' | 'manager' | 'admin';
export type BerthStatus = 'active' | 'inactive' | 'maintenance';
export type OccupancyStatus = 'occupied' | 'free' | 'reserved';
export type VesselType = 'sailboat' | 'motorboat' | 'yacht' | 'catamaran' | 'other';
export type ContractStatus = 'draft' | 'active' | 'expired' | 'cancelled';
export type PaymentStatus = 'pending' | 'paid' | 'overdue' | 'cancelled';
export type PaymentSchedule = 'monthly' | 'quarterly' | 'annual' | 'upfront';
export type ViolationType = 'unpaid_occupancy' | 'no_contract' | 'overstay' | 'size_violation' | 'other';
export type ViolationStatus = 'open' | 'resolved' | 'dismissed';

export interface Profile {
  id: string;
  full_name: string;
  role: UserRole;
  phone: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Pontoon {
  id: string;
  name: string;
  code: string;
  geometry: Record<string, unknown> | null;
  is_active: boolean;
  created_at: string;
}

export interface Berth {
  id: string;
  pontoon_id: string;
  code: string;
  polygon: number[][];  // [[lat, lng], [lat, lng], ...]
  width: number | null;
  length: number | null;
  max_draft: number | null;
  daily_rate: number | null;
  status: BerthStatus;
  // Amenities
  has_water: boolean;
  has_electricity: boolean;
  // Max vessel dimensions
  max_vessel_length: number | null;
  max_vessel_width: number | null;
  created_at: string;
  // Joined data
  pontoon?: Pontoon;
  current_occupancy?: DailyOccupancy | null;
}

export interface Vessel {
  id: string;
  registration_number: string;
  name: string | null;
  type: VesselType | null;
  length: number | null;
  width: number | null;
  draft: number | null;
  owner_name: string | null;
  owner_contact: string | null;
  flag_country: string | null;
  created_at: string;
  updated_at: string;
}

export interface DailyOccupancy {
  id: string;
  berth_id: string;
  vessel_id: string | null;
  date: string;
  status: OccupancyStatus;
  photo_url: string | null;
  notes: string | null;
  recorded_by: string | null;
  recorded_at: string;
  synced_at: string | null;
  // Joined data
  berth?: Berth;
  vessel?: Vessel;
  recorder?: Profile;
}

export interface LeaseContract {
  id: string;
  berth_id: string;
  vessel_id: string;
  owner_name: string;
  owner_email: string | null;
  owner_phone: string | null;
  start_date: string;
  end_date: string;
  annual_price: number;
  payment_schedule: PaymentSchedule | null;
  status: ContractStatus;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  berth?: Berth;
  vessel?: Vessel;
  payments?: Payment[];
}

export interface Payment {
  id: string;
  contract_id: string;
  amount: number;
  due_date: string;
  paid_date: string | null;
  status: PaymentStatus;
  payment_method: string | null;
  receipt_number: string | null;
  notes: string | null;
  recorded_by: string | null;
  created_at: string;
  // Joined data
  contract?: LeaseContract;
  recorder?: Profile;
}

export interface Violation {
  id: string;
  berth_id: string;
  vessel_id: string | null;
  type: ViolationType;
  description: string | null;
  detected_date: string;
  resolved_date: string | null;
  status: ViolationStatus;
  detected_by: string | null;
  created_at: string;
  // Joined data
  berth?: Berth;
  vessel?: Vessel;
  detector?: Profile;
}

export interface AuditLog {
  id: string;
  user_id: string | null;
  action: string;
  table_name: string;
  record_id: string | null;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
  // Joined data
  user?: Profile;
}

// Helper types for forms
export interface CreateOccupancyInput {
  berth_id: string;
  vessel_id?: string;
  date: string;
  status: OccupancyStatus;
  photo_url?: string;
  notes?: string;
  registration_number?: string;  // For creating new vessel on-the-fly
  vessel_type?: VesselType;
}

export interface CreateContractInput {
  berth_id: string;
  vessel_id: string;
  owner_name: string;
  owner_email?: string;
  owner_phone?: string;
  start_date: string;
  end_date: string;
  annual_price: number;
  payment_schedule?: PaymentSchedule;
  notes?: string;
}

export interface CreatePaymentInput {
  contract_id: string;
  amount: number;
  due_date: string;
  paid_date?: string;
  status?: PaymentStatus;
  payment_method?: string;
  receipt_number?: string;
  notes?: string;
}

// Dashboard statistics types
export interface DashboardStats {
  totalBerths: number;
  occupiedBerths: number;
  freeBerths: number;
  reservedBerths: number;
  activeContracts: number;
  pendingPayments: number;
  overduePayments: number;
  openViolations: number;
}

// Map display types
export interface BerthMapData {
  id: string;
  code: string;
  polygon: number[][];
  status: BerthStatus;
  occupancy_status: OccupancyStatus | null;
  has_active_contract: boolean;
  payment_status: PaymentStatus | null;
  vessel_registration: string | null;
}
