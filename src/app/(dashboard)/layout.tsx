'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { useAuthStore } from '@/stores/authStore';
import { useViewModeStore } from '@/stores/viewModeStore';
import { Loader2 } from 'lucide-react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, isLoading, fetchProfile } = useAuthStore();
  const viewMode = useViewModeStore((state) => state.viewMode);
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // Handle redirect in useEffect to avoid setState during render
  useEffect(() => {
    if (!isLoading && !user && !isRedirecting) {
      setIsRedirecting(true);
      router.push('/login');
    }
  }, [isLoading, user, router, isRedirecting]);

  // Show loading while checking auth or redirecting
  if (isLoading || (!user && !isRedirecting) || isRedirecting) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const isMobileView = viewMode === 'mobile';

  return (
    <div className={`min-h-screen bg-slate-50 dark:bg-slate-950 ${isMobileView ? 'mobile-view' : ''}`}>
      {/* Sidebar - hidden on mobile view */}
      {!isMobileView && <Sidebar />}

      {/* Main content area */}
      <div className={isMobileView ? '' : 'md:pl-64'}>
        <Header />
        <main className={isMobileView ? 'p-3' : 'p-4 md:p-6 lg:p-8'}>{children}</main>
      </div>
    </div>
  );
}
