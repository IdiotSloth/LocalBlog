import { create } from 'zustand';

type Theme = 'light' | 'dark' | 'system';

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  initTheme: () => void;
}

let mqlListener: (() => void) | null = null;

function applyTheme(theme: Theme) {
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const isDark = theme === 'dark' || (theme === 'system' && prefersDark);
  document.documentElement.classList.toggle('light', !isDark);
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: (localStorage.getItem('lbkb_theme') as Theme) || 'system',

  setTheme: (theme) => {
    localStorage.setItem('lbkb_theme', theme);
    set({ theme });
    applyTheme(theme);
  },

  initTheme: () => {
    const { theme } = get();
    applyTheme(theme);
    // Guard against duplicate listener registration
    if (mqlListener) return;
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => { if (get().theme === 'system') applyTheme('system'); };
    mql.addEventListener('change', handler);
    mqlListener = () => mql.removeEventListener('change', handler);
  },
}));
