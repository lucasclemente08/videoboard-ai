import { create } from 'zustand';

interface User {
  id: string;
  email: string;
  full_name: string;
  role: string;
  avatar_url?: string;
  isPremium?: boolean;
}

interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  setToken: (token: string | null) => void;
  setUser: (user: User | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem('vb_token'),
  user: null,
  isAuthenticated: !!localStorage.getItem('vb_token'),
  setToken: (token) => {
    if (token) {
      localStorage.setItem('vb_token', token);
    } else {
      localStorage.removeItem('vb_token');
    }
    set({ token, isAuthenticated: !!token });
  },
  setUser: (user) => set({ user }),
  logout: () => {
    localStorage.removeItem('vb_token');
    set({ token: null, user: null, isAuthenticated: false });
    window.location.href = '/login';
  },
}));
