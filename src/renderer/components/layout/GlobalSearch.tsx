import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { FtsSearchResult } from '../../../shared/types';
import { getRecentBlogs, type RecentBlogEntry } from '../../hooks/useRecentHistory';
import { useAuthStore } from '../../stores/auth-store';
import { useSearch } from '../../lib/use-search';

interface Command {
  id: string;
  label: string;
  shortcut?: string;
  action: () => void;
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
  const [recentBlogs, setRecentBlogs] = useState<RecentBlogEntry[]>([]);

  const { search, results } = useSearch(user?.id ?? null);

  // Commands when query is empty
  const commands: Command[] = [
    { id: 'new-blog', label: '新建博客', shortcut: 'Ctrl+N', action: () => navigate('/blog/new') },
    { id: 'blog-list', label: '浏览博客', action: () => navigate('/blog') },
    { id: 'knowledge', label: '知识库', action: () => navigate('/knowledge') },
    { id: 'tags', label: '标签管理', action: () => navigate('/tags') },
    { id: 'notes', label: '便签', action: () => navigate('/notes') },
    { id: 'settings', label: '设置', shortcut: 'Ctrl+,', action: () => navigate('/settings') },
  ];

  // T2104: Parse search operators (tag:, type:, after:, before:) from query
  const parseOperators = (q: string): { cleanQuery: string; tagName?: string; typeFilter?: string } => {
    let clean = q;
    let tagName: string | undefined;
    let typeFilter: string | undefined;
    const tagMatch = clean.match(/\btag:(\S+)/);
    if (tagMatch) { tagName = tagMatch[1]!; clean = clean.replace(tagMatch[0]!, ''); }
    const typeMatch = clean.match(/\btype:(blog|knowledge)\b/);
    if (typeMatch) { typeFilter = typeMatch[1]!; clean = clean.replace(typeMatch[0]!, ''); }
    return { cleanQuery: clean.trim(), tagName, typeFilter };
  };

  const handleChange = (val: string) => {
    setQuery(val);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      const { cleanQuery } = parseOperators(val);
      if (cleanQuery.length >= 1) search(cleanQuery);
    }, 200);
  };

  const operators = parseOperators(query);

  const handleNavigate = (type: 'blog' | 'knowledge', id: number) => {
    setOpen(false);
    setQuery('');
    if (type === 'blog') navigate(`/blog/${id}`);
    else navigate('/knowledge');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const totalItems = query.trim() ? results.length : commands.length + recentBlogs.length;
    if (!open || totalItems === 0) {
      if (e.key === 'Escape') { setOpen(false); setQuery(''); }
      return;
    }
    if (e.key === 'ArrowDown' || (e.key === 'Tab' && !e.shiftKey)) { e.preventDefault(); setSelectedIdx((i) => Math.min(i + 1, totalItems - 1)); }
    else if (e.key === 'ArrowUp' || (e.key === 'Tab' && e.shiftKey)) { e.preventDefault(); setSelectedIdx((i) => Math.max(i - 1, -1)); }
    else if (e.key === 'Enter' && selectedIdx >= 0) {
      e.preventDefault();
      if (query.trim()) {
        // Search results
        if (selectedIdx < results.length && results[selectedIdx]) {
          handleNavigate(results[selectedIdx]!.type, results[selectedIdx]!.id);
        }
      } else {
        // Commands + recent
        if (selectedIdx < commands.length) {
          setOpen(false); setQuery('');
          commands[selectedIdx]!.action();
        } else {
          const blogIdx = selectedIdx - commands.length;
          const entry = recentBlogs[blogIdx];
          if (entry) { setOpen(false); setQuery(''); navigate(`/blog/${entry.id}`); }
        }
      }
    } else if (e.key === 'Escape') { setOpen(false); setQuery(''); }
  };

  // Ctrl+K / Ctrl+F to open
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'f')) {
        e.preventDefault();
        setOpen(true);
        setQuery('');
        setSelectedIdx(-1);
        setRecentBlogs(getRecentBlogs().slice(0, 5));
        setTimeout(() => inputRef.current?.focus(), 50);
      }
      if (e.key === 'Escape' && open) { setOpen(false); setQuery(''); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open]);

  // Click outside to close
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const showCommands = !query.trim();
  // R272: Apply search operators — type: filters results by doc type
  const allResults = operators.typeFilter
    ? results.filter((r) => r.type === operators.typeFilter)
    : results;

  return (
    <>
      {/* Search trigger — always visible in header */}
      <div ref={containerRef} className="relative flex-1 max-w-xl">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => { if (!open) { setOpen(true); setRecentBlogs(getRecentBlogs().slice(0, 5)); } }}
          placeholder="搜索 tag:标签 type:blog|knowledge (Ctrl+K)"
          className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-base)] px-3 py-1.5 text-sm outline-none transition-all focus:border-[var(--color-primary-light)] focus:ring-1 focus:ring-[var(--color-primary-light)]/30 placeholder:text-[var(--color-text-muted)]"
        />

        {/* Dropdown panel */}
        {open && (
          <div className="absolute left-0 right-0 top-full mt-1.5 max-h-[420px] overflow-y-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] shadow-2xl z-50">
            {/* T2104: Active operator chips */}
            {(operators.tagName || operators.typeFilter) && (
              <div className="flex items-center gap-2 px-4 py-2 border-b text-[11px]" style={{ borderColor: 'var(--border-default)' }}>
                <span style={{ color: 'var(--text-muted)' }}>筛选:</span>
                {operators.tagName && (
                  <span className="rounded-[3px] px-1.5 py-0.5" style={{ background: 'var(--bg-tertiary)', color: 'var(--accent-blue)' }}>
                    tag: {operators.tagName}
                  </span>
                )}
                {operators.typeFilter && (
                  <span className="rounded-[3px] px-1.5 py-0.5" style={{ background: 'var(--bg-tertiary)', color: 'var(--accent-green)' }}>
                    type: {operators.typeFilter}
                  </span>
                )}
              </div>
            )}
            {showCommands && (
              <>
                <div className="px-4 py-2 text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>命令</div>
                {commands.map((cmd, i) => (
                  <button
                    key={cmd.id}
                    type="button"
                    onClick={() => { setOpen(false); setQuery(''); cmd.action(); }}
                    className={`w-full flex items-center justify-between px-4 py-2.5 text-left text-[13px] transition-colors ${selectedIdx === i ? 'bg-[var(--bg-tertiary)]' : 'hover:bg-[var(--bg-primary)]'}`}
                  >
                    <span style={{ color: 'var(--text-primary)' }}>{cmd.label}</span>
                    {cmd.shortcut && <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{cmd.shortcut}</span>}
                  </button>
                ))}
                {recentBlogs.length > 0 && (
                  <>
                    <div className="border-t mt-1 pt-1" style={{ borderColor: 'var(--border-default)' }} />
                    <div className="px-4 py-2 text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>最近浏览</div>
                    {recentBlogs.map((entry, i) => (
                      <button
                        key={entry.id}
                        type="button"
                        onClick={() => { setOpen(false); setQuery(''); navigate(`/blog/${entry.id}`); }}
                        className={`w-full px-4 py-2 text-left text-[13px] transition-colors ${selectedIdx === commands.length + i ? 'bg-[var(--bg-tertiary)]' : 'hover:bg-[var(--bg-primary)]'}`}
                        style={{ color: 'var(--text-primary)' }}
                      >
                        <span className="truncate block">{entry.title}</span>
                        <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                          {new Date(entry.timestamp).toLocaleDateString('zh-CN')}
                        </span>
                      </button>
                    ))}
                  </>
                )}
              </>
            )}

            {/* Search results */}
            {!showCommands && allResults.length > 0 && (
              <>
                <div className="px-4 py-2 text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                  搜索结果 ({allResults.length})
                </div>
                {allResults.map((item, i) => (
                  <button
                    key={`${item.type}-${item.id}`}
                    type="button"
                    onClick={() => handleNavigate(item.type, item.id)}
                    className={`w-full px-4 py-2.5 text-left transition-colors ${selectedIdx === i ? 'bg-[var(--bg-tertiary)]' : 'hover:bg-[var(--bg-primary)]'}`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] shrink-0 rounded-[3px] px-1.5 py-0.5" style={{ background: item.type === 'blog' ? 'var(--accent-blue)' : 'var(--accent-green)', color: '#fff' }}>
                        {item.type === 'blog' ? '博' : '知'}
                      </span>
                      <span className="text-[13px] font-medium truncate" style={{ color: 'var(--text-primary)' }}>{item.title}</span>
                    </div>
                    <div className="text-[12px] mt-0.5 ml-8 truncate" style={{ color: 'var(--text-secondary)' }}>{item.snippet}</div>
                  </button>
                ))}
              </>
            )}
            {!showCommands && query.trim().length >= 1 && allResults.length === 0 && (
              <div className="px-4 py-6 text-center text-[13px]" style={{ color: 'var(--text-muted)' }}>未找到匹配结果</div>
            )}
          </div>
        )}
      </div>

      {/* Backdrop overlay when open */}
      {open && (
        <div
          className="fixed inset-0 z-40"
          style={{ background: 'rgba(0,0,0,0.3)' }}
          onClick={() => setOpen(false)}
        />
      )}
    </>
  );
}
