'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/authStore';
import { getNavItemsForRole, ROLE_LABELS, hasPermission } from '@/lib/auth/rbac';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { createClient } from '@/lib/supabase/client';
import {
  Map,
  Anchor,
  Ship,
  FileText,
  CreditCard,
  AlertTriangle,
  AlertCircle,
  BarChart3,
  Users,
  Settings,
  ScrollText,
  LogOut,
  Calendar,
  ClipboardCheck,
  Wrench,
} from 'lucide-react';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  map: Map,
  anchor: Anchor,
  ship: Ship,
  'file-text': FileText,
  'credit-card': CreditCard,
  'alert-triangle': AlertTriangle,
  'alert-circle': AlertCircle,
  'bar-chart': BarChart3,
  users: Users,
  settings: Settings,
  scroll: ScrollText,
  calendar: Calendar,
  'clipboard-check': ClipboardCheck,
  wrench: Wrench,
};

export function Sidebar() {
  const pathname = usePathname();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const [damageReportsCount, setDamageReportsCount] = useState(0);

  // Fetch count of new damage reports (for managers and admins)
  useEffect(() => {
    if (!user || !hasPermission(user.role, 'VIEW_DAMAGE_REPORTS')) return;

    const supabase = createClient();

    const fetchCount = async () => {
      const { count } = await supabase
        .from('damage_reports')
        .select('*', { count: 'exact', head: true })
        .in('status', ['reported', 'acknowledged']);

      setDamageReportsCount(count || 0);
    };

    fetchCount();

    // Subscribe to real-time changes
    const channel = supabase
      .channel('damage_reports_count')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'damage_reports' },
        () => fetchCount()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  if (!user) return null;

  const navItems = getNavItemsForRole(user.role);

  const handleLogout = async () => {
    await logout();
    window.location.href = '/login';
  };

  return (
    <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 bg-slate-900 text-white">
      {/* Logo */}
      <div className="flex h-16 items-center px-6 border-b border-slate-800">
        <Anchor className="h-8 w-8 text-blue-400 mr-3" />
        <span className="text-lg font-semibold">Marina</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        <ul className="space-y-1">
          {/* Dashboard link */}
          <li>
            <Link
              href="/dashboard"
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                pathname === '/dashboard'
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              )}
            >
              <BarChart3 className="h-5 w-5" />
              Dashboard
            </Link>
          </li>

          {navItems.map((item) => {
            const Icon = iconMap[item.icon] || Map;
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            const showBadge = item.href === '/kvarovi' && damageReportsCount > 0;

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                    isActive
                      ? 'bg-slate-800 text-white'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                  )}
                >
                  <div className="relative">
                    <Icon className="h-5 w-5" />
                    {showBadge && (
                      <span className="absolute -top-2 -right-2 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                        {damageReportsCount > 9 ? '9+' : damageReportsCount}
                      </span>
                    )}
                  </div>
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User info */}
      <div className="border-t border-slate-800 p-4">
        <div className="flex items-center gap-3 mb-3">
          <Avatar className="h-10 w-10">
            <AvatarFallback className="bg-blue-600 text-white">
              {user.full_name.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user.full_name}</p>
            <p className="text-xs text-slate-400 truncate">
              {ROLE_LABELS[user.role]}
            </p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 w-full rounded-lg px-3 py-2 text-sm text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Odjava
        </button>
      </div>
    </aside>
  );
}
