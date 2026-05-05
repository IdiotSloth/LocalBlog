import { useState, useEffect, useCallback } from 'react';

interface RefItem { id: number; type: string; title: string; }
interface Props {
  userId: number;
  sourceType: string;
  sourceId: number;
}

export function ReferencePicker({ userId, sourceType, sourceId }: Props) {
  const [refs, setRefs] = useState<(RefItem & { refId: number })[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<RefItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadRefs = useCallback(async () => {
    const d = await window.api.refGetFrom({ sourceType, sourceId });
    const r = d as any;
    if (r.success && r.data) {
      setRefs(r.data.map((ref: any) => ({ id: ref.target_id, type: ref.target_type, title: ref.title, refId: ref.id })));
    }
    setLoading(false);
  }, [sourceType, sourceId]);

  useEffect(() => { loadRefs(); }, [loadRefs]);

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;
    const d = await window.api.refSearch({ userId, scope: sourceType === 'blog' ? 'knowledge' : 'all', query: query.trim() });
    const r = d as any;
    if (r.success) setResults(r.data);
  }, [userId, query, sourceType]);

  const handleAdd = async (targetType: string, targetId: number) => {
    await window.api.refAdd({ sourceType, sourceId, targetType, targetId });
    setSearchOpen(false);
    setQuery('');
    setResults([]);
    loadRefs();
  };

  const handleRemove = async (refId: number) => {
    await window.api.refRemove(refId);
    loadRefs();
  };

  const icon = (type: string) => type === 'blog' ? '📝' : '📄';

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>关联</span>
        <button type="button" onClick={() => setSearchOpen(true)} className="text-[11px] hover:underline" style={{ color: 'var(--accent-blue)' }}>+ 添加引用</button>
      </div>

      {loading ? <p className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>加载中...</p>
      : refs.length === 0 ? <p className="text-[12px]" style={{ color: 'var(--text-placeholder)' }}>暂无关联</p>
      : <div className="space-y-1">
          {refs.map((ref) => (
            <div key={ref.refId} className="flex items-center gap-1.5 rounded-[3px] px-1.5 py-0.5 text-[12px]" style={{ background: 'var(--bg-primary)' }}>
              <span>{icon(ref.type)}</span>
              <span className="truncate flex-1" style={{ color: 'var(--text-primary)' }}>{ref.title}</span>
              <button type="button" onClick={() => handleRemove(ref.refId)} className="text-[11px] shrink-0 hover:underline" style={{ color: 'var(--accent-red)' }}>✕</button>
            </div>
          ))}
        </div>
      }

      {/* Search modal */}
      {searchOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.4)' }} onClick={() => setSearchOpen(false)}>
          <div className="w-full max-w-[420px] rounded-[8px] border p-4 shadow-2xl" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-default)' }} onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <h4 className="text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>添加引用</h4>
              <button type="button" onClick={() => setSearchOpen(false)} style={{ color: 'var(--text-secondary)' }}>✕</button>
            </div>
            <div className="mb-2 flex gap-2">
              <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSearch()} placeholder="搜索博客或知识库文件..." className="input-dark flex-1" autoFocus />
              <button type="button" onClick={handleSearch} className="btn-primary text-[12px]">搜索</button>
            </div>
            <div className="max-h-[240px] overflow-y-auto space-y-1">
              {results.map((item) => (
                <button key={`${item.type}-${item.id}`} type="button" onClick={() => handleAdd(item.type, item.id)}
                  className="flex w-full items-center gap-2 rounded-[4px] px-3 py-2 text-left text-[13px] hover:opacity-80 transition-opacity"
                  style={{ background: 'var(--bg-primary)' }}>
                  <span>{icon(item.type)}</span>
                  <span className="truncate" style={{ color: 'var(--text-primary)' }}>{item.title}</span>
                </button>
              ))}
              {query && results.length === 0 && <p className="text-center text-[12px] py-3" style={{ color: 'var(--text-secondary)' }}>未找到匹配项</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
