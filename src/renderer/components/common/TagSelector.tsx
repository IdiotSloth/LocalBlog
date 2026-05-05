import { useCallback, useEffect, useRef, useState } from 'react';

interface TagItem {
  id: number;
  name: string;
  count: number;
}

interface Props {
  userId: number;
  selectedTagIds: number[];
  onChange: (tagIds: number[]) => void;
  openUp?: boolean; // deprecated — positioning is now dynamic via getBoundingClientRect
}

export function TagSelector({ userId, selectedTagIds, onChange }: Props) {
  const [tags, setTags] = useState<TagItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [panelPos, setPanelPos] = useState<React.CSSProperties>({});
  const triggerRef = useRef<HTMLButtonElement>(null);

  const loadTags = useCallback(async () => {
    try {
      const res = (await window.api.tagList(userId)) as { success: boolean; data?: TagItem[] };
      setTags(res?.data || []);
    } catch {
      setTags([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadTags();
  }, [loadTags]);

  const toggle = (tagId: number) => {
    if (selectedTagIds.includes(tagId)) {
      onChange(selectedTagIds.filter((id) => id !== tagId));
    } else {
      onChange([...selectedTagIds, tagId]);
    }
  };

  const createAndAdd = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    setError('');
    try {
      const data = await window.api.tagCreate({ userId, name: newName.trim() });
      const resp = data as { success: boolean; data?: TagItem; error?: string };
      if (resp.success && resp.data) {
        setTags((prev) => [...prev, resp.data!]);
        onChange([...selectedTagIds, resp.data!.id]);
        setNewName('');
      } else {
        setError(resp.error || '创建失败');
      }
    } catch {
      setError('创建失败');
    } finally {
      setCreating(false);
    }
  };

  const selectedTags = tags.filter((t) => selectedTagIds.includes(t.id));

  // Calculate fixed position on open to escape parent clipping (table cells, overflow containers)
  useEffect(() => {
    if (!open || !triggerRef.current) return;
    const calc = () => {
      const rect = triggerRef.current!.getBoundingClientRect();
      const panelH = 340;
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      if (spaceBelow >= panelH || spaceBelow >= spaceAbove) {
        setPanelPos({ position: 'fixed', left: rect.left, top: rect.bottom + 4 });
      } else {
        setPanelPos({ position: 'fixed', left: rect.left, bottom: window.innerHeight - rect.top + 4 });
      }
    };
    calc();
    window.addEventListener('resize', calc);
    window.addEventListener('scroll', calc, { passive: true });
    return () => {
      window.removeEventListener('resize', calc);
      window.removeEventListener('scroll', calc);
    };
  }, [open]);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[13px] font-medium" style={{ color: 'var(--text-secondary)' }}>
          标签:
        </span>
        {selectedTags.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => toggle(t.id)}
            className="inline-flex items-center gap-1 rounded-[4px] px-2 py-1 text-[12px] font-medium transition-colors"
            style={{ background: 'var(--accent-blue)', color: 'var(--text-on-accent)' }}
          >
            {t.name}
            <span className="ml-0.5 opacity-70">×</span>
          </button>
        ))}
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setOpen(!open)}
          className="inline-flex items-center rounded-[4px] border px-2 py-1 text-[12px] transition-colors"
          style={{
            borderColor: 'var(--border-default)',
            color: 'var(--text-secondary)',
            background: open ? 'var(--bg-tertiary)' : 'transparent',
          }}
        >
          {open ? '收起' : '+ 标签'}
        </button>
      </div>

      {open && (
        <div
          className="z-50 w-72 rounded-[6px] border p-3 shadow-lg"
          style={{
            ...panelPos,
            maxHeight: 'min(340px, calc(100vh - 24px))',
            overflowY: 'auto',
            background: 'var(--bg-secondary)',
            borderColor: 'var(--border-default)',
          }}
        >
          {/* Quick create */}
          <div className="mb-2 flex gap-2">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') createAndAdd();
                if (e.key === 'Escape') setOpen(false);
              }}
              placeholder="新建标签..."
              className="input-dark flex-1 !py-1 !text-[12px]"
            />
            <button
              type="button"
              onClick={createAndAdd}
              disabled={creating || !newName.trim()}
              className="rounded-[4px] px-2 py-1 text-[12px] font-medium disabled:opacity-30"
              style={{ background: 'var(--accent-blue)', color: 'var(--text-on-accent)' }}
            >
              创建
            </button>
          </div>
          {error && (
            <p className="mb-2 text-[11px]" style={{ color: 'var(--accent-red)' }}>
              {error}
            </p>
          )}

          {/* Tag list */}
          {loading ? (
            <p className="py-2 text-center text-[12px]" style={{ color: 'var(--text-secondary)' }}>
              加载中...
            </p>
          ) : tags.length === 0 ? (
            <p className="py-2 text-center text-[12px]" style={{ color: 'var(--text-secondary)' }}>
              暂无标签，创建一个吧
            </p>
          ) : (
            <div className="max-h-60 overflow-y-auto space-y-0.5">
              {tags.map((t) => {
                const sel = selectedTagIds.includes(t.id);
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => toggle(t.id)}
                    className={`flex w-full items-center justify-between rounded-[4px] px-2 py-1.5 text-left text-[13px] transition-colors ${sel ? 'font-medium' : ''}`}
                    style={{
                      background: sel ? 'var(--bg-tertiary)' : 'transparent',
                      color: sel ? 'var(--accent-blue)' : 'var(--text-primary)',
                    }}
                  >
                    <span>{t.name}</span>
                    <span
                      className="rounded-[3px] px-1.5 py-0.5 text-[11px]"
                      style={{
                        background: sel ? 'var(--accent-blue)' : 'var(--bg-primary)',
                        color: sel ? 'var(--text-on-accent)' : 'var(--text-secondary)',
                      }}
                    >
                      {t.count ?? 0}
                    </span>
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
