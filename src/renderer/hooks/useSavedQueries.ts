import { useCallback, useSyncExternalStore } from 'react';

const LS_KEY = 'lbkb_saved_queries';

interface SavedQuery {
  name: string;
  query: string;
  createdAt: string;
}

function readAll(): SavedQuery[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeAll(items: SavedQuery[]): void {
  localStorage.setItem(LS_KEY, JSON.stringify(items));
}

let listeners: Array<() => void> = [];
// Cache snapshot to avoid infinite loop from getSnapshot returning new references
let cached: SavedQuery[] = readAll();

function subscribe(cb: () => void): () => void {
  listeners.push(cb);
  return () => { listeners = listeners.filter((l) => l !== cb); };
}

function getSnapshot(): SavedQuery[] {
  return cached;
}

function emit() {
  cached = readAll();
  for (const fn of listeners) fn();
}

export function useSavedQueries() {
  const items = useSyncExternalStore(subscribe, getSnapshot);

  const add = useCallback((name: string, query: string) => {
    const all = readAll();
    all.unshift({ name, query, createdAt: new Date().toISOString() });
    writeAll(all);
    emit();
  }, []);

  const remove = useCallback((idx: number) => {
    const all = readAll();
    all.splice(idx, 1);
    writeAll(all);
    emit();
  }, []);

  return { items, add, remove };
}
