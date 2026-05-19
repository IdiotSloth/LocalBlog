import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export type ShortcutMap = Record<string, () => void>;

const GLOBAL_SHORTCUTS: Record<string, string> = {
  'Ctrl+N': '/blog/new',
  'Ctrl+H': '/',
};

/** Register global keyboard shortcuts */
export function useShortcuts(extraShortcuts?: ShortcutMap) {
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const key = `${e.ctrlKey || e.metaKey ? 'Ctrl+' : ''}${e.altKey ? 'Alt+' : ''}${e.shiftKey && e.key.length > 1 ? 'Shift+' : ''}${e.key.length === 1 ? e.key.toUpperCase() : e.key}`;

      // Try extra shortcuts first
      if (extraShortcuts?.[key]) {
        e.preventDefault();
        extraShortcuts[key]();
        return;
      }

      // Global navigation shortcuts
      const route = GLOBAL_SHORTCUTS[key];
      if (route) {
        e.preventDefault();
        navigate(route);
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [navigate, extraShortcuts]);
}
