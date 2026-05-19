import { useEffect, useState } from 'react';
import type { WikiLinkSearchResult } from '../../../shared/types';
import { searchDirect } from '../../lib/use-search';
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

    // D88: Use FTS5 Worker search (CJK-aware, TF-IDF scored, covers blogs+knowledge+notes)
    // Replaces old refSearch (SQL LIKE) + noteList (full pull + JS filter) pattern
    searchDirect(q, user.id).then((results) => {
      if (aborted) return;
      const items: WikiLinkSearchResult[] = results.map((r) => ({
        id: r.id,
        type: r.type as 'blog' | 'knowledge',
        title: r.title,
      }));
      // Also get note-type results not yet indexed by Worker (note content search is limited)
      window.api.noteList(user.id).then((nResp) => {
        if (aborted) return;
        if (nResp.success && nResp.data) {
          for (const n of nResp.data) {
            if (n.title?.toLowerCase().includes(q.toLowerCase()) || n.content?.toLowerCase().includes(q.toLowerCase())) {
              const exists = items.some((i) => i.id === n.id && i.type === 'note');
              if (!exists) items.push({ id: n.id, type: 'note', title: n.title || n.content.slice(0, 40) });
            }
          }
        }
        setResults(items.slice(0, 8));
        setSelectedIdx(0);
        setLoading(false);
      }).catch(() => {
        if (!aborted) { setResults(items.slice(0, 8)); setSelectedIdx(0); setLoading(false); }
      });
    }).catch(() => {
      if (!aborted) { setResults([]); setLoading(false); }
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
