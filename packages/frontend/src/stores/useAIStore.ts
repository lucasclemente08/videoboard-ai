import { create } from 'zustand';

interface AIState {
  aiPanelOpen: boolean;
  toggleAIPanel: () => void;
  openAIPanel: () => void;
  closeAIPanel: () => void;
}

export const useAIStore = create<AIState>((set) => ({
  aiPanelOpen: false,
  toggleAIPanel: () => set((s) => ({ aiPanelOpen: !s.aiPanelOpen })),
  openAIPanel: () => set({ aiPanelOpen: true }),
  closeAIPanel: () => set({ aiPanelOpen: false }),
}));
