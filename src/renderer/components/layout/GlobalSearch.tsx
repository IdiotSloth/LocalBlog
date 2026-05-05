import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth-store';

interface SearchItem {
  id: number;
  title: string;
  snippet: string;
  matchField: string;
}

export function GlobalSearch() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [blogs, setBlogs] = useState<SearchItem[]>([]);
  const [kbs, setKbs] = useState<SearchItem[]>([]);
  const [open, setOpen] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const doSearch = useCallback(
    async (q: string) => {
      if (q.length < 2) {
        setBlogs([]);
        setKbs([]);
        setOpen(false);
        return;
      }
      if (!user) return;
      const data = await window.api.searchGlobal({ userId: user.id, query: q });
      const resp = data as { success: boolean; data?: { blogs: SearchItem[]; knowledge: SearchItem[] } };
      if (resp.success && resp.data) {
        setBlogs(resp.data.blogs);
        setKbs(resp.data.knowledge);
        setOpen(true);
        setSelectedIdx(-1);
      }
    },
    [user],
  );

  const handleChange = (val: string) => {
    setQuery(val);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => doSearch(val), 300);
  };

  const handleNavigate = (type: 'blog' | 'kb', id: number) => {
    setOpen(false);
    setQuery('');
    if (type === 'blog') navigate(`/blog/${id}/edit`);
    else navigate('/knowledge');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const total = blogs.length + kbs.length;
    if (!open || total === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIdx((i) => Math.min(i + 1, total - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && selectedIdx >= 0) {
      e.preventDefault();
      if (selectedIdx < blogs.length) {
        handleNavigate('blog', blogs[selectedIdx].id);
      } else {
        handleNavigate('kb', kbs[selectedIdx - blogs.length].id);
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
          if (blogs.length || kbs.length) setOpen(true);
        }}
        placeholder="搜索博客和知识库... (Ctrl+F)"
        className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-base)] px-3 py-1.5 text-sm outline-none transition-all focus:border-[var(--color-primary-light)] focus:ring-1 focus:ring-[var(--color-primary-light)]/30 placeholder:text-[var(--color-text-muted)]"
      />

      {open && (blogs.length > 0 || kbs.length > 0) && (
        <div className="absolute left-0 right-0 top-full mt-1.5 max-h-[400px] overflow-y-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] shadow-2xl z-50">
          {blogs.length > 0 && (
            <div>
              <div className="px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                博客 ({blogs.length})
              </div>
              {blogs.map((b, i) => (
                <button
                  key={`b-${b.id}`}
                  type="button"
                  onClick={() => handleNavigate('blog', b.id)}
                  className={`w-full px-4 py-2.5 text-left transition-colors ${i === selectedIdx ? 'bg-[var(--color-primary)]/8' : 'hover:bg-[var(--color-bg-base)]'}`}
                >
                  <div className="text-sm font-medium text-[var(--color-text-primary)] truncate">{b.title}</div>
                  <div className="text-xs text-[var(--color-text-muted)]">{b.snippet}</div>
                </button>
              ))}
            </div>
          )}
          {kbs.length > 0 && (
            <div>
              <div className="px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)] border-t border-[var(--color-border)]">
                知识库 ({kbs.length})
              </div>
              {kbs.map((k, i) => {
                const idx = blogs.length + i;
                return (
                  <button
                    key={`k-${k.id}`}
                    type="button"
                    onClick={() => handleNavigate('kb', k.id)}
                    className={`w-full px-4 py-2.5 text-left transition-colors ${idx === selectedIdx ? 'bg-[var(--color-primary)]/8' : 'hover:bg-[var(--color-bg-base)]'}`}
                  >
                    <div className="text-sm font-medium text-[var(--color-text-primary)] truncate">{k.title}</div>
                    <div className="text-xs text-[var(--color-text-muted)]">{k.snippet}</div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
