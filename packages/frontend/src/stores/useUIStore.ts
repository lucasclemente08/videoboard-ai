import { create } from 'zustand';

interface UIState {
  sidebarOpen: boolean;
  rightPanelOpen: boolean;
  rightPanelTab: string;
  viewMode: 'canvas' | 'timeline' | 'calendar' | 'production' | 'checklist' | 'kanban' | 'narrative' | 'emotion' | 'attention' | 'dashboard';

  toggleSidebar: () => void;
  toggleRightPanel: () => void;
  setRightPanelTab: (tab: string) => void;
  setViewMode: (mode: UIState['viewMode']) => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  rightPanelOpen: false,
  rightPanelTab: 'info',
  viewMode: 'canvas',

  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  toggleRightPanel: () => set((s) => ({ rightPanelOpen: !s.rightPanelOpen })),
  setRightPanelTab: (tab) => set({ rightPanelOpen: true, rightPanelTab: tab }),
  setViewMode: (mode) => set({ viewMode: mode }),
}));
