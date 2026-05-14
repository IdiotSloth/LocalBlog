import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { FtsSearchResult } from '../../../shared/types';
import { useAuthStore } from '../../stores/auth-store';
import { useSearch } from '../../lib/use-search';

interface DisplayGroup {
  type: 'blog' | 'knowledge';
  label: string;
  items: FtsSearchResult[];
}

export function GlobalSearch() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const { search, results } = useSearch(user?.id ?? null);

  // Group results by type for display
  const groups: DisplayGroup[] = [];
  const blogResults = results.filter((r) => r.type === 'blog');
  const knowledgeResults = results.filter((r) => r.type === 'knowledge');
  if (blogResults.length > 0) groups.push({ type: 'blog', label: '博客', items: blogResults });
  if (knowledgeResults.length > 0) groups.push({ type: 'knowledge', label: '知识库', items: knowledgeResults });

  const totalResults = results.length;

  const doSearch = useCallback(
    async (q: string) => {
      if (q.trim().length < 2) {
        setOpen(false);
        return;
      }
      await search(q);
      setOpen(true);
      setSelectedIdx(-1);
    },
    [search],
  );

  const handleChange = (val: string) => {
    setQuery(val);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => doSearch(val), 300);
  };

  const handleNavigate = (type: 'blog' | 'knowledge', id: number) => {
    setOpen(false);
    setQuery('');
    if (type === 'blog') navigate(`/blog/${id}/edit`);
    else navigate('/knowledge');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open || totalResults === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIdx((i) => Math.min(i + 1, totalResults - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && selectedIdx >= 0) {
      e.preventDefault();
      // Determine which item is selected based on flat index
      let idx = selectedIdx;
      for (const group of groups) {
        if (idx < group.items.length) {
          handleNavigate(group.type, group.items[idx]!.id);
          return;
        }
        idx -= group.items.length;
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
      setQuery('');
    }
  };

  // Ctrl+F to focus
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Click outside to close
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={containerRef} className="relative flex-1 max-w-xl">
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => handleChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          if (totalResults > 0) setOpen(true);
        }}
        placeholder="搜索博客和知识库... (Ctrl+F)"
        className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-base)] px-3 py-1.5 text-sm outline-none transition-all focus:border-[var(--color-primary-light)] focus:ring-1 focus:ring-[var(--color-primary-light)]/30 placeholder:text-[var(--color-text-muted)]"
      />

      {open && totalResults > 0 && (
        <div className="absolute left-0 right-0 top-full mt-1.5 max-h-[400px] overflow-y-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] shadow-2xl z-50">
          {groups.map((group, gIdx) => (
            <div key={group.type}>
              {gIdx > 0 && <div className="border-t border-[var(--color-border)]" />}
              <div className="px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                {group.label} ({group.items.length})
              </div>
              {group.items.map((item, iIdx) => {
                // Calculate flat index across all groups
                let flatIdx = 0;
                for (let gi = 0; gi < gIdx; gi++) {
                  flatIdx += groups[gi]!.items.length;
                }
                flatIdx += iIdx;

                return (
                  <button
                    key={`${item.type}-${item.id}`}
                    type="button"
                    onClick={() => handleNavigate(item.type, item.id)}
                    className={`w-full px-4 py-2.5 text-left transition-colors ${flatIdx === selectedIdx ? 'bg-[var(--color-primary)]/8' : 'hover:bg-[var(--color-bg-base)]'}`}
                  >
                    <div className="text-sm font-medium text-[var(--color-text-primary)] truncate">{item.title}</div>
                    <div className="text-xs text-[var(--color-text-muted)] truncate">{item.snippet}</div>
                    {item.score > 0 && (
                      <div className="text-[10px] text-[var(--color-text-muted)] opacity-60">相关性: {item.score}</div>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
