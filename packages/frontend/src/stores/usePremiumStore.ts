import { create } from 'zustand';

interface PremiumState {
  isPremium: boolean;
  setPremium: (val: boolean) => void;
  canUse: (feature: string) => boolean;
}

const FREE_LIMITS = {
  aiMessagesPerDay: 10,
  storyboardGenerations: 3,
  exports: 5,
};

export const usePremiumStore = create<PremiumState>((set, get) => ({
  isPremium: false,
  setPremium: (val) => set({ isPremium: val }),
  canUse: (feature) => {
    // Premium users have unlimited access
    if (get().isPremium) return true;
    // Free tier limits
    return feature !== 'unlimited_ai' && feature !== 'advanced_export';
  },
}));

export { FREE_LIMITS };
