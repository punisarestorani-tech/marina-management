import { UserRole } from '@/types/database.types';

// Role hierarchy: admin > manager > operator > inspector
const ROLE_HIERARCHY: Record<UserRole, number> = {
  inspector: 1,
  operator: 2,
  manager: 3,
  admin: 4,
};

export function hasMinimumRole(userRole: UserRole, requiredRole: UserRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}

export function isInspector(role: UserRole): boolean {
  return hasMinimumRole(role, 'inspector');
}

export function isOperator(role: UserRole): boolean {
  return hasMinimumRole(role, 'operator');
}

export function isManager(role: UserRole): boolean {
  return hasMinimumRole(role, 'manager');
}

export function isAdmin(role: UserRole): boolean {
  return role === 'admin';
}

// Permission definitions
export const PERMISSIONS = {
  // Map & Berths
  VIEW_MAP: ['inspector', 'operator', 'manager', 'admin'] as UserRole[],
  EDIT_BERTH_POLYGON: ['admin'] as UserRole[],

  // Occupancy
  VIEW_OCCUPANCY: ['inspector', 'operator', 'manager', 'admin'] as UserRole[],
  RECORD_OCCUPANCY: ['inspector', 'operator', 'manager', 'admin'] as UserRole[],
  EDIT_OCCUPANCY: ['operator', 'manager', 'admin'] as UserRole[],

  // Vessels
  VIEW_VESSELS: ['operator', 'manager', 'admin'] as UserRole[],
  EDIT_VESSELS: ['manager', 'admin'] as UserRole[],

  // Contracts
  VIEW_CONTRACTS: ['manager', 'admin'] as UserRole[],
  EDIT_CONTRACTS: ['manager', 'admin'] as UserRole[],

  // Bookings (Transit berths)
  VIEW_BOOKINGS: ['operator', 'manager', 'admin'] as UserRole[],
  EDIT_BOOKINGS: ['operator', 'manager', 'admin'] as UserRole[],

  // Payments
  VIEW_PAYMENTS: ['operator', 'manager', 'admin'] as UserRole[],
  VIEW_PAYMENT_DETAILS: ['manager', 'admin'] as UserRole[],
  EDIT_PAYMENTS: ['manager', 'admin'] as UserRole[],

  // Reports
  VIEW_REPORTS: ['operator', 'manager', 'admin'] as UserRole[],
  EXPORT_REPORTS: ['manager', 'admin'] as UserRole[],

  // Violations
  VIEW_VIOLATIONS: ['operator', 'manager', 'admin'] as UserRole[],
  EDIT_VIOLATIONS: ['manager', 'admin'] as UserRole[],

  // Inspection (field work)
  VIEW_INSPECTION: ['inspector', 'operator', 'manager', 'admin'] as UserRole[],
  RECORD_INSPECTION: ['inspector', 'operator', 'manager', 'admin'] as UserRole[],

  // Admin
  MANAGE_USERS: ['admin'] as UserRole[],
  MANAGE_MARINA: ['admin'] as UserRole[],
  VIEW_AUDIT_LOG: ['admin'] as UserRole[],
};

export function hasPermission(userRole: UserRole, permission: keyof typeof PERMISSIONS): boolean {
  return PERMISSIONS[permission].includes(userRole);
}

// Navigation items per role
export interface NavItem {
  label: string;
  href: string;
  icon: string;
  permission: keyof typeof PERMISSIONS;
}

export const NAV_ITEMS: NavItem[] = [
  { label: 'Mapa', href: '/map', icon: 'map', permission: 'VIEW_MAP' },
  { label: 'Vezovi', href: '/berths', icon: 'anchor', permission: 'VIEW_MAP' },
  { label: 'Inspekcija', href: '/inspection', icon: 'clipboard-check', permission: 'VIEW_INSPECTION' },
  { label: 'Rezervacije', href: '/bookings', icon: 'calendar', permission: 'VIEW_BOOKINGS' },
  { label: 'Plovila', href: '/vessels', icon: 'ship', permission: 'VIEW_VESSELS' },
  { label: 'Ugovori', href: '/contracts', icon: 'file-text', permission: 'VIEW_CONTRACTS' },
  { label: 'Plaćanja', href: '/payments', icon: 'credit-card', permission: 'VIEW_PAYMENTS' },
  { label: 'Prekršaji', href: '/violations', icon: 'alert-triangle', permission: 'VIEW_VIOLATIONS' },
  { label: 'Izvještaji', href: '/reports', icon: 'bar-chart', permission: 'VIEW_REPORTS' },
  { label: 'Korisnici', href: '/admin/users', icon: 'users', permission: 'MANAGE_USERS' },
  { label: 'Postavke', href: '/admin/settings', icon: 'settings', permission: 'MANAGE_MARINA' },
  { label: 'Audit Log', href: '/admin/audit', icon: 'scroll', permission: 'VIEW_AUDIT_LOG' },
];

export function getNavItemsForRole(role: UserRole): NavItem[] {
  return NAV_ITEMS.filter(item => hasPermission(role, item.permission));
}

// Role display names
export const ROLE_LABELS: Record<UserRole, string> = {
  inspector: 'Inspektor (Teren)',
  operator: 'Operater (Naplata)',
  manager: 'Menadžer (Ugovori)',
  admin: 'Administrator',
};
