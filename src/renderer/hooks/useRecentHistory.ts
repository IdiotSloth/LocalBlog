/**
 * T1917: Recent browsing history — localStorage-based, max 10 items, LRU eviction.
 * Stores blog ID + title + timestamp when a blog is viewed.
 * localStorage key: 'lbkb_recent_blogs'
 */

const STORAGE_KEY = 'lbkb_recent_blogs';
const MAX_ITEMS = 10;

export interface RecentBlogEntry {
  id: number;
  title: string;
  timestamp: number; // Date.now()
}

function readStorage(): RecentBlogEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as RecentBlogEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeStorage(entries: RecentBlogEntry[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    /* localStorage full or unavailable — best-effort */
  }
}

/** Record a blog visit (LRU: move to front, evict oldest if > MAX_ITEMS) */
export function recordRecentBlog(blogId: number, title: string): void {
  const entries = readStorage();
  // Remove existing entry for same blog
  const filtered = entries.filter((e) => e.id !== blogId);
  // Add to front
  filtered.unshift({ id: blogId, title, timestamp: Date.now() });
  // Trim to max
  writeStorage(filtered.slice(0, MAX_ITEMS));
}

/** Get all recent blog entries (sorted by most recent first) */
export function getRecentBlogs(): RecentBlogEntry[] {
  return readStorage();
}

/** Clear all recent history */
export function clearRecentHistory(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* best-effort */
  }
}
