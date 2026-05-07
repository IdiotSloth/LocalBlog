import { useCallback, useEffect, useRef, useState } from 'react';

interface ShortcutItem {
  id: string;
  key: string;
  label: string;
  description: string;
  group: string;
}

const GROUP_LABELS: Record<string, string> = {
  global: '全局',
  editor: '编辑器',
};

export function ShortcutSettings() {
  const [shortcuts, setShortcuts] = useState<ShortcutItem[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const recordCleanup = useRef<(() => void) | null>(null);

  // Clean up any active recording on unmount
  useEffect(() => {
    return () => {
      if (recordCleanup.current) recordCleanup.current();
    };
  }, []);

  const load = useCallback(async () => {
    const r = await window.api.shortcutGetAll();
    if (r.success && r.data) setShortcuts(r.data);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleRecord = useCallback((id: string) => {
    setEditingId(id);
    const handler = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const parts: string[] = [];
      if (e.ctrlKey || e.metaKey) parts.push('Ctrl');
      if (e.shiftKey) parts.push('Shift');
      if (e.altKey) parts.push('Alt');
      const key = e.key.length === 1 ? e.key.toUpperCase() : e.key;
      if (!['Control', 'Shift', 'Alt', 'Meta'].includes(key)) parts.push(key);
      const combo = parts.join('+');
      // Check conflicts
      const conflict = shortcuts.find((s) => s.id !== id && s.key === combo);
      if (conflict) {
        setMessage(`冲突: 已被"${conflict.label}"占用`);
      } else {
        window.api.shortcutUpdate(id, combo).then((r) => {
          if (r.success) {
            setMessage(`已更新为 ${combo}`);
            load();
          } else {
            setMessage(r.error || '更新失败');
          }
        });
      }
      setEditingId(null);
      window.removeEventListener('keydown', handler, true);
      recordCleanup.current = null;
    };
    window.addEventListener('keydown', handler, true);
    recordCleanup.current = () => {
      window.removeEventListener('keydown', handler, true);
    };
    // Auto-cancel after 5s
    const timer = setTimeout(() => {
      setEditingId(null);
      setMessage('');
      window.removeEventListener('keydown', handler, true);
      recordCleanup.current = null;
    }, 5000);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', handler, true);
      recordCleanup.current = null;
    };
  }, [shortcuts, load]);

  const handleReset = useCallback(async () => {
    await window.api.shortcutReset();
    setMessage('已恢复默认');
    load();
  }, [load]);

  const groups = [...new Set(shortcuts.map((s) => s.group))];

  return (
    <div>
      <h3 className="mb-4 text-[16px] font-semibold" style={{ color: 'var(--text-primary)' }}>
        快捷键
      </h3>
      {message && (
        <div className="mb-3 rounded-[4px] px-3 py-2 text-[13px]" style={{ background: 'rgba(63,185,80,0.1)', color: 'var(--accent-green)' }}>
          {message}
        </div>
      )}
      {groups.map((group) => (
        <div key={group} className="mb-4">
          <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
            {GROUP_LABELS[group] || group}
          </h4>
          <div className="rounded-[6px] border" style={{ borderColor: 'var(--border-default)' }}>
            {shortcuts.filter((s) => s.group === group).map((s, i, arr) => (
              <div
                key={s.id}
                className="flex items-center gap-3 px-4 py-2.5"
                style={{
                  borderBottom: i < arr.length - 1 ? '1px solid var(--border-default)' : 'none',
                }}
              >
                <span className="flex-1 text-[13px]" style={{ color: 'var(--text-primary)' }}>
                  {s.label}
                </span>
                <span className="text-[11px] w-[180px]" style={{ color: 'var(--text-secondary)' }}>
                  {s.description}
                </span>
                <button
                  type="button"
                  onClick={() => handleRecord(s.id)}
                  className="rounded-[4px] border px-3 py-1 text-[12px] font-mono min-w-[100px] text-center transition-colors"
                  style={{
                    background: editingId === s.id ? 'var(--accent-blue)' : 'var(--bg-primary)',
                    borderColor: editingId === s.id ? 'var(--accent-blue)' : 'var(--border-default)',
                    color: editingId === s.id ? '#fff' : 'var(--text-primary)',
                  }}
                >
                  {editingId === s.id ? '按下新快捷键...' : s.key}
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}
      <button type="button" onClick={handleReset} className="text-[12px] hover:underline" style={{ color: 'var(--accent-red)' }}>
        恢复默认快捷键
      </button>
    </div>
  );
}
