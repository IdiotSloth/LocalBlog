/**
 * Shared state for minimized blog tabs — persisted to localStorage.
 * No React context needed; uses a simple pub/sub pattern.
 */
export interface MinimizedTab {
  id: number;
  title: string;
  format: string;
}

const STORAGE_KEY = 'lbkb_minimized_blogs';
const listeners = new Set<() => void>();

function notify(): void {
  listeners.forEach((fn) => fn());
}

export function getTabs(): MinimizedTab[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((t: unknown) => t && typeof t === 'object' && 'id' in t).slice(0, 5) as MinimizedTab[];
  } catch {
    return [];
  }
}

export function addTab(tab: MinimizedTab): void {
  const tabs = getTabs().filter((t) => t.id !== tab.id);
  tabs.push(tab);
  // Keep max 5, newest last
  const trimmed = tabs.slice(-5);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  notify();
}

export function removeTab(id: number): void {
  const tabs = getTabs().filter((t) => t.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tabs));
  notify();
}

export function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
