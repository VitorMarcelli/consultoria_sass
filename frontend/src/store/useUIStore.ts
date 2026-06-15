import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type NavigationLayout = 'sidebar' | 'topbar';

interface UIState {
  navigationLayout: NavigationLayout;
  setNavigationLayout: (layout: NavigationLayout) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      navigationLayout: 'topbar', // changed default to topbar as it's the requested new innovation, but user can change it
      setNavigationLayout: (layout) => set({ navigationLayout: layout }),
    }),
    {
      name: 'sevilha-ui-preferences',
    }
  )
);
