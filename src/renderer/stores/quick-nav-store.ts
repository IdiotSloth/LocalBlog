import { create } from 'zustand';

interface QuickNavEntry {
  id: number;
  title: string;
}

interface QuickNavState {
  ring: QuickNavEntry[];
  push: (id: number, title: string) => void;
}

export const useQuickNavStore = create<QuickNavState>((set) => ({
  ring: [],
  push: (id, title) => {
    set((state) => {
      const filtered = state.ring.filter((e) => e.id !== id);
      filtered.unshift({ id, title });
      return { ring: filtered.slice(0, 5) };
    });
  },
}));
