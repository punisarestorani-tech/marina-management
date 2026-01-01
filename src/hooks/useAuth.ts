'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { hasPermission, PERMISSIONS } from '@/lib/auth/rbac';
import { UserRole } from '@/types/database.types';

export function useAuth() {
  const router = useRouter();
  const { user, isLoading, fetchProfile, logout } = useAuthStore();
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    const supabase = getSupabaseClient();

    // Initial fetch
    fetchProfile().then(() => setInitialized(true));

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN') {
          await fetchProfile();
        } else if (event === 'SIGNED_OUT') {
          useAuthStore.getState().setUser(null);
          router.push('/login');
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchProfile, router]);

  const signIn = async (email: string, password: string) => {
    const supabase = getSupabaseClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw error;
    }

    await fetchProfile();
    router.push('/dashboard');
  };

  const signOut = async () => {
    await logout();
    router.push('/login');
  };

  const checkPermission = (permission: keyof typeof PERMISSIONS): boolean => {
    if (!user) return false;
    return hasPermission(user.role, permission);
  };

  return {
    user,
    isLoading: isLoading || !initialized,
    signIn,
    signOut,
    checkPermission,
    isAuthenticated: !!user,
  };
}

// Hook to protect routes based on role
export function useRequireAuth(requiredRole?: UserRole) {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  return { user, isLoading };
}
