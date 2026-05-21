import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { FtsSearchResult } from '../../../shared/types';
import { getRecentBlogs, type RecentBlogEntry } from '../../hooks/useRecentHistory';
import { useSavedQueries } from '../../hooks/useSavedQueries';
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
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [recentBlogs, setRecentBlogs] = useState<RecentBlogEntry[]>([]);

  const { search, results } = useSearch(user?.id ?? null);
  const { items: savedQueries, add: saveQuery } = useSavedQueries();
  const [showSaveInput, setShowSaveInput] = useState(false);
  const [saveName, setSaveName] = useState('');

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
      <div ref={containerRef} className="relative w-80 lg:w-96">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => { if (!open) { setOpen(true); setRecentBlogs(getRecentBlogs().slice(0, 5)); } }}
          className="w-full rounded-lg border px-3 py-1.5 text-sm outline-none transition-all focus:outline-none"
          style={{
            borderColor: 'var(--border-default)',
            background: 'var(--bg-primary)',
            color: 'var(--text-primary)',
          }}
          placeholder="搜索 tag:标签 type:blog|knowledge (Ctrl+K)"
        />

        {/* Dropdown panel */}
        {open && (
          <div className="absolute left-0 right-0 top-full mt-1.5 max-h-[420px] overflow-y-auto rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] shadow-2xl z-50">
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
            {!showCommands && query.trim().length >= 1 && allResults.length > 0 && (
              <div className="border-t px-4 py-2" style={{ borderColor: 'var(--border-default)' }}>
                {showSaveInput ? (
                  <div className="flex gap-2">
                    <input type="text" value={saveName} onChange={(e) => setSaveName(e.target.value)}
                      placeholder="查询名称..."
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && saveName.trim()) { saveQuery(saveName.trim(), query); setSaveName(''); setShowSaveInput(false); }
                        if (e.key === 'Escape') { setShowSaveInput(false); setSaveName(''); }
                      }}
                      className="flex-1 rounded-[4px] border px-2 py-1 text-[12px] outline-none"
                      style={{ background: 'var(--bg-primary)', borderColor: 'var(--border-default)', color: 'var(--text-primary)' }}
                      autoFocus />
                    <button type="button" onClick={() => { if (saveName.trim()) { saveQuery(saveName.trim(), query); setSaveName(''); setShowSaveInput(false); } }}
                      className="rounded-[4px] px-2 py-1 text-[12px] font-medium"
                      style={{ background: 'var(--accent-blue)', color: '#fff', border: 'none', cursor: 'pointer' }}>
                      保存
                    </button>
                  </div>
                ) : (
                  <button type="button" onClick={() => { setShowSaveInput(true); setSaveName(query); }}
                    className="w-full text-left text-[12px] py-1 hover:opacity-70"
                    style={{ color: 'var(--accent-blue)', background: 'none', border: 'none', cursor: 'pointer' }}>
                    + 保存此查询
                  </button>
                )}
              </div>
            )}
            {!showCommands && query.trim().length >= 1 && allResults.length === 0 && (
              <div className="px-4 py-6 text-center text-[13px]" style={{ color: 'var(--text-muted)' }}>未找到匹配结果</div>
            )}
            {/* T2206: Saved queries shown when empty */}
            {showCommands && savedQueries.length > 0 && (
              <div className="border-t px-4 py-2" style={{ borderColor: 'var(--border-default)' }}>
                <p className="text-[11px] font-medium mb-1" style={{ color: 'var(--text-muted)' }}>已保存的查询</p>
                {savedQueries.slice(0, 5).map((sq, i) => (
                  <button key={i} type="button"
                    onClick={() => {
                      setQuery(sq.query);
                      search(sq.query);
                      setOpen(true);
                      setSelectedIdx(-1);
                    }}
                    className="w-full text-left flex items-center gap-2 rounded-[4px] px-2 py-1 text-[12px] transition-colors hover:bg-[var(--bg-primary)]"
                    style={{ color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer' }}>
                    <span style={{ color: 'var(--text-muted)' }}>🔍</span>
                    <span className="flex-1 truncate">{sq.name}</span>
                    <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{sq.query}</span>
                  </button>
                ))}
              </div>
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
