import { useEffect, useState } from 'react';
import type { WikiLinkSearchResult } from '../../../shared/types';
import { useAuthStore } from '../../stores/auth-store';

interface Props {
  query: string;
  position: { x: number; y: number } | null;
  onSelect: (item: WikiLinkSearchResult) => void;
  onClose: () => void;
}

export function WikilinkSuggestion({ query, position, onSelect, onClose }: Props) {
  const user = useAuthStore((s) => s.user);
  const [results, setResults] = useState<WikiLinkSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(0);

  // R220: Keyboard navigation
  useEffect(() => {
    if (!position || results.length === 0) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIdx((i) => Math.min(i + 1, results.length - 1)); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIdx((i) => Math.max(i - 1, 0)); }
      else if (e.key === 'Enter') { e.preventDefault(); const item = results[selectedIdx]; if (item) onSelect(item); }
      else if (e.key === 'Escape') { e.preventDefault(); onClose(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [position, results, selectedIdx, onSelect, onClose]);

  useEffect(() => {
    if (!user || query.length < 1) {
      setResults([]);
      return;
    }
    let aborted = false;
    setLoading(true);
    const q = query.trim();

    // Search blogs + knowledge via refSearch, notes via noteList
    Promise.all([
      window.api.refSearch({ userId: user.id, scope: 'all', query: q }),
      window.api.noteList(user.id),
    ]).then(([r, notes]) => {
      if (aborted) return;
      const items: WikiLinkSearchResult[] = [];
      if (r.success && r.data) {
        for (const item of r.data as Array<{ id: number; type: string; title: string }>) {
          items.push({ id: item.id, type: item.type as 'blog' | 'knowledge', title: item.title });
        }
      }
      // Also search notes by title/content matching query
      if (notes.success && notes.data) {
        for (const n of notes.data) {
          if (n.title?.toLowerCase().includes(q.toLowerCase()) || n.content?.toLowerCase().includes(q.toLowerCase())) {
            items.push({ id: n.id, type: 'note', title: n.title || n.content.slice(0, 40) });
          }
        }
      }
      if (!aborted) {
        setResults(items.slice(0, 8));
        setSelectedIdx(0);
      }
    }).catch(() => {
      if (!aborted) setResults([]);
    }).finally(() => {
      if (!aborted) setLoading(false);
    });

    return () => { aborted = true; };
  }, [query, user]);

  // Keyboard navigation handled by parent via onClose/onSelect

  if (!position || (!loading && results.length === 0 && query.length >= 2)) return null;

  // If loading and no results, show loading indicator
  if (loading && results.length === 0 && query.length < 2) return null;

  const typeIcon = (t: string) => t === 'blog' ? '博' : t === 'knowledge' ? '知' : '签';
  const typeColor = (t: string) =>
    t === 'blog' ? 'var(--accent-blue)' : t === 'knowledge' ? 'var(--accent-green)' : 'var(--text-secondary)';

  return (
    <div
      className="fixed z-[100] rounded-[8px] border shadow-2xl overflow-hidden"
      style={{
        left: position.x,
        top: position.y + 24,
        background: 'var(--bg-secondary)',
        borderColor: 'var(--border-default)',
        minWidth: 280,
        maxWidth: 360,
        maxHeight: 260,
        overflowY: 'auto',
      }}
    >
      {loading ? (
        <div className="px-4 py-3 text-[12px]" style={{ color: 'var(--text-secondary)' }}>搜索中...</div>
      ) : results.length === 0 ? (
        <div className="px-4 py-3 text-[12px]" style={{ color: 'var(--text-muted)' }}>未找到匹配项</div>
      ) : (
        results.map((item, i) => (
          <button
            key={`${item.type}-${item.id}`}
            type="button"
            onClick={() => onSelect(item)}
            onMouseEnter={() => setSelectedIdx(i)}
            className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${i === selectedIdx ? '' : ''}`}
            style={{
              background: i === selectedIdx ? 'var(--bg-tertiary)' : 'transparent',
            }}
          >
            <span
              className="shrink-0 rounded-[3px] px-1.5 py-0.5 text-[10px] font-medium"
              style={{ background: typeColor(item.type), color: '#fff' }}
            >
              {typeIcon(item.type)}
            </span>
            <span className="truncate text-[13px]" style={{ color: 'var(--text-primary)' }}>
              {item.title}
            </span>
          </button>
        ))
      )}
    </div>
  );
}
