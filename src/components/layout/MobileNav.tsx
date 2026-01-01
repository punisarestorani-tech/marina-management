'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/authStore';
import { getNavItemsForRole } from '@/lib/auth/rbac';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import {
  Menu,
  Map,
  Anchor,
  Ship,
  FileText,
  CreditCard,
  AlertTriangle,
  BarChart3,
  Users,
  Settings,
  ScrollText,
} from 'lucide-react';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  map: Map,
  anchor: Anchor,
  ship: Ship,
  'file-text': FileText,
  'credit-card': CreditCard,
  'alert-triangle': AlertTriangle,
  'bar-chart': BarChart3,
  users: Users,
  settings: Settings,
  scroll: ScrollText,
};

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const user = useAuthStore((state) => state.user);

  if (!user) return null;

  const navItems = getNavItemsForRole(user.role);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-6 w-6" />
          <span className="sr-only">Toggle menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 p-0">
        {/* Logo */}
        <div className="flex h-16 items-center px-6 border-b">
          <Anchor className="h-8 w-8 text-blue-600 mr-3" />
          <span className="text-lg font-semibold">Marina</span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3">
          <ul className="space-y-1">
            {/* Dashboard link */}
            <li>
              <Link
                href="/dashboard"
                onClick={() => setOpen(false)}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-3 text-sm transition-colors',
                  pathname === '/dashboard'
                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
                )}
              >
                <BarChart3 className="h-5 w-5" />
                Dashboard
              </Link>
            </li>

            {navItems.map((item) => {
              const Icon = iconMap[item.icon] || Map;
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-3 text-sm transition-colors',
                      isActive
                        ? 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                        : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </SheetContent>
    </Sheet>
  );
}
