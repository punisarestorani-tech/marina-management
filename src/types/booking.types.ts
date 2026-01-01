// Booking system types

// Berth types
export type BerthType = 'communal' | 'transit';

// Booking status
export type BookingStatus =
  | 'pending'      // Awaiting confirmation
  | 'confirmed'    // Booking confirmed
  | 'checked_in'   // Guest arrived
  | 'checked_out'  // Guest departed
  | 'cancelled'    // Booking cancelled
  | 'no_show';     // Guest didn't arrive

// Payment status
export type PaymentStatus = 'unpaid' | 'partial' | 'paid' | 'refunded';

// Booking source
export type BookingSource = 'direct' | 'phone' | 'email' | 'online' | 'agent' | 'walk_in';

// Payment method
export type PaymentMethod = 'cash' | 'card' | 'bank_transfer' | 'online' | 'other';

// Vessel type
export type VesselType = 'sailboat' | 'motorboat' | 'yacht' | 'catamaran' | 'other';

// Block reason
export type BlockReason = 'maintenance' | 'private' | 'seasonal_closure' | 'other';

// Main booking interface
export interface Booking {
  id: string;

  // Berth reference
  berthId: string;
  berthCode: string;

  // Dates
  checkInDate: string; // ISO date
  checkOutDate: string;
  actualCheckIn?: string; // ISO datetime
  actualCheckOut?: string;

  // Guest info
  guestName: string;
  guestEmail?: string;
  guestPhone?: string;
  guestCountry?: string;
  guestAddress?: string;
  guestIdNumber?: string;

  // Vessel info
  vesselName?: string;
  vesselRegistration?: string;
  vesselType?: VesselType;
  vesselLength?: number;
  vesselWidth?: number;
  vesselDraft?: number;
  vesselFlag?: string;

  // Status
  status: BookingStatus;

  // Pricing
  pricePerDay: number;
  totalNights: number;
  subtotal: number;
  discountPercent: number;
  discountAmount: number;
  taxPercent: number;
  taxAmount: number;
  totalAmount: number;

  // Payment
  paymentStatus: PaymentStatus;
  amountPaid: number;
  paymentMethod?: PaymentMethod;
  paymentNotes?: string;

  // Additional
  notes?: string;
  internalNotes?: string;
  source: BookingSource;

  // Tracking
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  confirmedAt?: string;
  cancelledAt?: string;
  cancellationReason?: string;
}

// Booking payment
export interface BookingPayment {
  id: string;
  bookingId: string;
  amount: number;
  paymentDate: string;
  paymentMethod?: PaymentMethod;
  referenceNumber?: string;
  notes?: string;
  recordedBy?: string;
  createdAt: string;
}

// Blocked dates
export interface BlockedDates {
  id: string;
  berthId: string;
  startDate: string;
  endDate: string;
  reason: BlockReason;
  notes?: string;
  createdBy?: string;
  createdAt: string;
}

// Seasonal pricing
export interface SeasonalPricing {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  priceMultiplier: number;
  isActive: boolean;
  createdAt: string;
}

// Calendar day status for UI
export interface CalendarDay {
  date: string;
  isAvailable: boolean;
  isBlocked: boolean;
  booking?: {
    id: string;
    guestName: string;
    vesselName?: string;
    status: BookingStatus;
    paymentStatus: PaymentStatus;
    isCheckIn: boolean;
    isCheckOut: boolean;
  };
  blockReason?: BlockReason;
  priceMultiplier: number;
}

// Form data for creating/editing booking
export interface BookingFormData {
  berthId: string;
  berthCode: string;
  checkInDate: string;
  checkOutDate: string;
  guestName: string;
  guestEmail?: string;
  guestPhone?: string;
  guestCountry?: string;
  vesselName?: string;
  vesselRegistration?: string;
  vesselType?: VesselType;
  vesselLength?: number;
  pricePerDay: number;
  discountPercent?: number;
  taxPercent?: number;
  notes?: string;
  source?: BookingSource;
}

// Report types
export interface DailyReport {
  date: string;
  arrivals: Booking[];
  departures: Booking[];
  currentGuests: Booking[];
  totalOccupied: number;
  totalAvailable: number;
  occupancyRate: number;
}

export interface MonthlyReport {
  month: string;
  totalBookings: number;
  totalNights: number;
  totalRevenue: number;
  collectedRevenue: number;
  outstandingAmount: number;
  occupancyRate: number;
  averageDailyRate: number;
}

export interface BerthOccupancyReport {
  berthId: string;
  berthCode: string;
  berthType: BerthType;
  totalBookings: number;
  bookedNights: number;
  totalRevenue: number;
  occupancyRate: number;
}

// Status colors for UI
export const BOOKING_STATUS_COLORS: Record<BookingStatus, { bg: string; text: string; label: string }> = {
  pending: { bg: '#fef3c7', text: '#92400e', label: 'Na čekanju' },
  confirmed: { bg: '#dbeafe', text: '#1e40af', label: 'Potvrđeno' },
  checked_in: { bg: '#dcfce7', text: '#166534', label: 'Prijavljen' },
  checked_out: { bg: '#f3f4f6', text: '#374151', label: 'Odjavljen' },
  cancelled: { bg: '#fee2e2', text: '#991b1b', label: 'Otkazano' },
  no_show: { bg: '#fecaca', text: '#7f1d1d', label: 'Nije došao' },
};

export const PAYMENT_STATUS_COLORS: Record<PaymentStatus, { bg: string; text: string; label: string }> = {
  unpaid: { bg: '#fee2e2', text: '#991b1b', label: 'Neplaćeno' },
  partial: { bg: '#fef3c7', text: '#92400e', label: 'Djelimično' },
  paid: { bg: '#dcfce7', text: '#166534', label: 'Plaćeno' },
  refunded: { bg: '#e0e7ff', text: '#3730a3', label: 'Refundirano' },
};

// Helper to calculate booking total
export function calculateBookingTotal(
  pricePerDay: number,
  nights: number,
  discountPercent: number = 0,
  taxPercent: number = 0
): {
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
} {
  const subtotal = pricePerDay * nights;
  const discountAmount = subtotal * (discountPercent / 100);
  const afterDiscount = subtotal - discountAmount;
  const taxAmount = afterDiscount * (taxPercent / 100);
  const totalAmount = afterDiscount + taxAmount;

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    discountAmount: Math.round(discountAmount * 100) / 100,
    taxAmount: Math.round(taxAmount * 100) / 100,
    totalAmount: Math.round(totalAmount * 100) / 100,
  };
}

// Helper to get nights between dates
export function getNightsBetween(checkIn: string, checkOut: string): number {
  const start = new Date(checkIn);
  const end = new Date(checkOut);
  const diffTime = end.getTime() - start.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

// Helper to format date for display
export function formatDate(dateString: string, locale: string = 'hr-HR'): string {
  return new Date(dateString).toLocaleDateString(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

// Helper to format currency
export function formatCurrency(amount: number, currency: string = 'EUR'): string {
  return new Intl.NumberFormat('hr-HR', {
    style: 'currency',
    currency,
  }).format(amount);
}
