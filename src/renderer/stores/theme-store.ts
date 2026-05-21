import { create } from 'zustand';

type LegacyTheme = 'light' | 'dark' | 'system';
/** Phase 23: 5 国风主题 + system */
export type GuofengTheme = 'inkstone' | 'tea-bamboo' | 'brass-lamp' | 'rice-paper' | 'celadon';
type Theme = LegacyTheme | GuofengTheme;

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  initTheme: () => void;
}

let mqlListener: (() => void) | null = null;

/** D115: system → family mapping */
function systemTheme(): GuofengTheme {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'inkstone' : 'rice-paper';
}

function applyTheme(theme: Theme) {
  const el = document.documentElement;

  // D107: 双轨并行 — 保留 .light 兼容旧组件
  if (theme === 'light') {
    el.classList.add('light');
    el.removeAttribute('data-theme');
  } else if (theme === 'dark') {
    el.classList.remove('light');
    el.removeAttribute('data-theme');
  } else if (theme === 'system') {
    const sys = systemTheme();
    el.classList.toggle('light', sys === 'rice-paper');
    el.setAttribute('data-theme', sys);
  } else {
    // Guofeng theme
    const isLight = theme === 'rice-paper' || theme === 'celadon';
    el.classList.toggle('light', isLight);
    el.setAttribute('data-theme', theme);
  }
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: (localStorage.getItem('lbkb_theme') as Theme) || 'system',

  setTheme: (theme) => {
    localStorage.setItem('lbkb_theme', theme);
    set({ theme });
    applyTheme(theme);
  },

  initTheme: () => {
    const { theme, setTheme } = get();
    // Migrate old dark/light to guofeng themes
    if (theme === 'dark') { setTheme('inkstone'); return; }
    if (theme === 'light') { setTheme('rice-paper'); return; }
    applyTheme(theme);
    if (mqlListener) return;
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
      if (get().theme === 'system') applyTheme('system');
    };
    mql.addEventListener('change', handler);
    mqlListener = () => mql.removeEventListener('change', handler);
  },
}));
