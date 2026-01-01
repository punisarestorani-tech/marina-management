import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Profile, UserRole } from '@/types/database.types';
import { getSupabaseClient } from '@/lib/supabase/client';

interface AuthState {
  user: Profile | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  setUser: (user: Profile | null) => void;
  fetchProfile: () => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isLoading: true,
      error: null,

      setUser: (user) => set({ user, isLoading: false }),

      fetchProfile: async () => {
        set({ isLoading: true, error: null });

        try {
          const supabase = getSupabaseClient();
          console.log('Fetching auth user...');

          const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
          console.log('Auth user result:', authUser, authError);

          if (authError) {
            console.error('Auth error:', authError);
            set({ user: null, isLoading: false });
            return;
          }

          if (!authUser) {
            console.log('No auth user found');
            set({ user: null, isLoading: false });
            return;
          }

          console.log('Fetching profile for user:', authUser.id);
          const { data: profiles, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', authUser.id);

          console.log('Profile query result:', { profiles, error });
          console.log('Error details:', JSON.stringify(error, null, 2));

          if (error) {
            console.error('Profile error:', JSON.stringify(error));
            throw error;
          }

          let profile = profiles?.[0] || null;

          // If no profile found, create a default one for the authenticated user
          if (!profile && authUser) {
            console.log('No profile found, creating default profile...');
            profile = {
              id: authUser.id,
              full_name: authUser.email?.split('@')[0] || 'User',
              role: 'admin' as const,
              phone: null,
              is_active: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };
          }

          console.log('Setting user profile:', profile);
          set({ user: profile, isLoading: false });
        } catch (error) {
          console.error('fetchProfile catch error:', error);
          set({
            error: error instanceof Error ? error.message : 'Failed to fetch profile',
            isLoading: false,
            user: null
          });
        }
      },

      logout: async () => {
        const supabase = getSupabaseClient();
        await supabase.auth.signOut();
        set({ user: null, isLoading: false, error: null });
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user }),
    }
  )
);

// Helper hooks
export const useUser = () => useAuthStore((state) => state.user);
export const useUserRole = (): UserRole | null => useAuthStore((state) => state.user?.role ?? null);
export const useIsLoading = () => useAuthStore((state) => state.isLoading);
