import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type ViewMode = 'desktop' | 'mobile';

interface ViewModeState {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  toggleViewMode: () => void;
}

export const useViewModeStore = create<ViewModeState>()(
  persist(
    (set) => ({
      viewMode: 'desktop',
      setViewMode: (mode) => set({ viewMode: mode }),
      toggleViewMode: () =>
        set((state) => ({
          viewMode: state.viewMode === 'desktop' ? 'mobile' : 'desktop',
        })),
    }),
    {
      name: 'view-mode-storage',
    }
  )
);

// Hook for easy access
export const useViewMode = () => useViewModeStore((state) => state.viewMode);
export const useIsMobileView = () => useViewModeStore((state) => state.viewMode === 'mobile');
