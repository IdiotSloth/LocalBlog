import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth-store';

interface SwitchItem {
  id: number;
  type: 'blog' | 'knowledge' | 'note';
  title: string;
  path: string;
}

/** T2104: Ctrl+O quick file switcher — instant title-only jump */
export function QuickSwitcher() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<SwitchItem[]>([]);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const searchTitles = useCallback(async (q: string) => {
    if (!user || !q.trim()) { setItems([]); return; }
    try {
      const [blogsR, kbR] = await Promise.all([
        window.api.blogList({ userId: user.id, query: q, sortBy: 'updated_at', offset: 0, limit: 5 }),
        window.api.kbList({ userId: user.id, query: q, offset: 0, limit: 5 }),
      ]);
      const results: SwitchItem[] = [];
      if (blogsR.success && blogsR.data?.blogs) {
        for (const b of blogsR.data.blogs) {
          results.push({ id: b.id, type: 'blog', title: b.title, path: `/blog/${b.id}` });
        }
      }
      if (kbR.success && kbR.data?.files) {
        for (const f of kbR.data.files) {
          results.push({ id: f.id, type: 'knowledge', title: f.filename, path: '/knowledge' });
        }
      }
      setItems(results.slice(0, 6));
      setSelectedIdx(0);
    } catch { setItems([]); }
  }, [user]);

  const handleInput = (val: string) => {
    setQuery(val);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => searchTitles(val), 100);
  };

  const handleSelect = (item: SwitchItem) => {
    setOpen(false);
    setQuery('');
    navigate(item.path);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIdx((i) => Math.min(i + 1, items.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIdx((i) => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter' && items[selectedIdx]) { e.preventDefault(); handleSelect(items[selectedIdx]!); }
    else if (e.key === 'Escape') { setOpen(false); setQuery(''); }
  };

  // Ctrl+O to open
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'o' && e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setOpen(true);
        setQuery('');
        setItems([]);
        setTimeout(() => inputRef.current?.focus(), 50);
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  // R281: Clean up debounce timer on unmount
  useEffect(() => {
    return () => clearTimeout(timerRef.current);
  }, []);

  if (!open) return null;

  const typeIcon = (t: string) => t === 'blog' ? '博' : t === 'knowledge' ? '知' : '签';
  const typeColor = (t: string) =>
    t === 'blog' ? 'var(--accent-blue)' : t === 'knowledge' ? 'var(--accent-green)' : 'var(--text-secondary)';

  return (
    <>
      <div className="fixed inset-0 z-[60]" style={{ background: 'rgba(0,0,0,0.3)' }} onClick={() => setOpen(false)} />
      <div
        className="fixed top-[20%] left-1/2 z-[61] rounded-[8px] border shadow-2xl overflow-hidden"
        style={{
          transform: 'translateX(-50%)',
          maxWidth: 480,
          width: '90vw',
          borderColor: 'var(--border-default)',
          background: 'var(--bg-primary)',
        }}
      >
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => handleInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="快速跳转到..."
          className="w-full border-0 bg-transparent px-4 py-3 text-[15px] outline-none"
          style={{ color: 'var(--text-primary)' }}
        />
        {items.length > 0 && (
          <div className="border-t" style={{ borderColor: 'var(--border-default)' }}>
            {items.map((item, i) => (
              <button
                key={`${item.type}-${item.id}`}
                type="button"
                onClick={() => handleSelect(item)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left text-[13px] transition-colors ${i === selectedIdx ? 'bg-[var(--bg-tertiary)]' : 'hover:bg-[var(--bg-secondary)]'}`}
              >
                <span
                  className="shrink-0 rounded-[3px] px-1.5 py-0.5 text-[10px] font-semibold"
                  style={{ background: typeColor(item.type), color: '#fff' }}
                >
                  {typeIcon(item.type)}
                </span>
                <span className="truncate" style={{ color: 'var(--text-primary)' }}>{item.title}</span>
              </button>
            ))}
          </div>
        )}
        {query && items.length === 0 && (
          <div className="border-t px-4 py-4 text-center text-[13px]" style={{ borderColor: 'var(--border-default)', color: 'var(--text-muted)' }}>
            未找到匹配项
          </div>
        )}
      </div>
    </>
  );
}
