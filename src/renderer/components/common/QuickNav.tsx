import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuickNavStore } from '../../stores/quick-nav-store';

export function QuickNav() {
  const ring = useQuickNavStore((s) => s.ring);
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(0);

  const handleSelect = useCallback(
    (id: number) => {
      setOpen(false);
      navigate(`/blog/${id}`);
    },
    [navigate],
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIdx((i) => Math.min(i + 1, ring.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && ring[selectedIdx]) {
      e.preventDefault();
      handleSelect(ring[selectedIdx]!.id);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'k' && e.ctrlKey && e.shiftKey && !e.metaKey) {
        e.preventDefault();
        if (ring.length > 0) {
          setOpen(true);
          setSelectedIdx(0);
        }
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [ring.length]);

  if (!open || ring.length === 0) return null;

  return (
    <>
      <div className="fixed inset-0 z-[62]" style={{ background: 'rgba(0,0,0,0.25)' }} onClick={() => setOpen(false)} />
      <div
        className="fixed top-[25%] left-1/2 z-[63] rounded-[8px] border shadow-xl overflow-hidden"
        style={{
          transform: 'translateX(-50%)',
          maxWidth: 400,
          width: '85vw',
          borderColor: 'var(--border-default)',
          background: 'var(--bg-primary)',
        }}
      >
        <div
          className="px-4 py-2.5 text-[12px] font-medium"
          style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border-default)' }}
        >
          最近访问
        </div>
        {ring.map((entry, i) => (
          <button
            key={entry.id}
            type="button"
            onClick={() => handleSelect(entry.id)}
            onKeyDown={handleKeyDown}
            className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-left text-[14px] transition-colors ${
              i === selectedIdx ? 'bg-[var(--bg-tertiary)]' : 'hover:bg-[var(--bg-secondary)]'
            }`}
          >
            <span className="shrink-0 text-[11px] tabular-nums" style={{ color: 'var(--text-muted)', width: 18 }}>
              {i + 1}
            </span>
            <span className="truncate" style={{ color: 'var(--text-primary)' }}>
              {entry.title}
            </span>
          </button>
        ))}
      </div>
    </>
  );
}
