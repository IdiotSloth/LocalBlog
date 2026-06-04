import { useLayoutEffect, useRef, useState, useCallback, useEffect } from 'react';
import { ArrowUp, ArrowDown, Pencil, ArrowLeft } from 'lucide-react';

interface TocHeading {
  level: number;
  text: string;
  id: string;
}

interface Props {
  blogId: number;
  headings: TocHeading[];
  onEdit: () => void;
  onBack: () => void;
}

export function FloatingMenu({ blogId, headings, onEdit, onBack }: Props) {
  const [right, setRight] = useState(32);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [visible, setVisible] = useState(true);
  const tocRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    function updatePosition() {
      const main = document.querySelector('main');
      if (main) {
        const rect = main.getBoundingClientRect();
        setRight(window.innerWidth - rect.right + 16);
      }
      setVisible(window.innerWidth >= 900);
    }
    updatePosition();
    const ro = new ResizeObserver(updatePosition);
    const main = document.querySelector('main');
    if (main) ro.observe(main);
    window.addEventListener('resize', updatePosition);
    return () => { ro.disconnect(); window.removeEventListener('resize', updatePosition); };
  }, []);

  useLayoutEffect(() => {
    if (headings.length < 2) return;
    const els = headings.map((h) => document.getElementById(h.id)).filter(Boolean) as HTMLElement[];
    if (els.length === 0) return;
    const io = new IntersectionObserver(
      (entries) => {
        const intersecting = entries.filter((e) => e.isIntersecting);
        if (intersecting.length > 0) {
          setActiveId(intersecting[0]!.target.id);
        }
      },
      { rootMargin: '-80px 0px -60% 0px' },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [headings]);

  // Auto-scroll TOC to active heading
  useEffect(() => {
    if (!activeId || !tocRef.current) return;
    const el = tocRef.current.querySelector(`[data-toc-id="${activeId}"]`);
    if (el) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [activeId]);

  const handleBack = useCallback(() => {
    const h = document.documentElement;
    const total = h.scrollHeight - h.clientHeight;
    const percent = total > 0 ? Math.round((h.scrollTop / total) * 100) : 0;
    if (percent > 5 && percent < 95) {
      sessionStorage.setItem(`blog-progress-${blogId}`, String(percent));
    }
    onBack();
  }, [blogId, onBack]);

  const scrollToHeading = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  if (!visible) return null;

  return (
    <div
      style={{
        position: 'fixed',
        right: `${right}px`,
        top: '50%',
        transform: 'translateY(-50%)',
        zIndex: 40,
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 8,
        border: '1px solid var(--border-default)',
        background: 'var(--bg-secondary)',
        opacity: 0.25,
        transition: 'opacity 200ms ease, width 200ms ease',
        width: 32,
        overflow: 'hidden',
        maxHeight: '90vh',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.opacity = '1';
        e.currentTarget.style.width = '160px';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.opacity = '0.25';
        e.currentTarget.style.width = '32px';
      }}
    >
      {/* Fixed button area */}
      <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, padding: '6px 2px 4px' }}>
        <MenuBtn icon={<ArrowUp size={16} />} label="回到顶部" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} />
        <MenuBtn icon={<ArrowDown size={16} />} label="到达底部" onClick={() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })} />
        <MenuBtn icon={<Pencil size={16} />} label="编辑" onClick={onEdit} />
        <MenuBtn icon={<ArrowLeft size={16} />} label="返回列表" onClick={handleBack} />
      </div>

      {/* Scrollable TOC area */}
      {headings.length >= 2 && (
        <div ref={tocRef} style={{ flex: 1, overflowY: 'auto', scrollbarWidth: 'thin', padding: '0 4px 6px', borderTop: '1px solid var(--border-default)', margin: '0 4px' }}>
          {headings.map((h) => (
            <button
              key={h.id}
              type="button"
              data-toc-id={h.id}
              onClick={() => scrollToHeading(h.id)}
              className="block w-full text-left truncate text-[11px] py-0.5 hover:opacity-80"
              style={{
                color: activeId === h.id ? 'var(--accent-blue)' : 'var(--text-muted)',
                paddingLeft: (h.level - 2) * 12,
              }}
              title={h.text}
            >
              {h.text}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function MenuBtn({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-2 w-full px-2 py-1 rounded-[4px] hover:opacity-80 whitespace-nowrap"
      style={{ color: 'var(--text-secondary)' }}
      title={label}
    >
      {icon}
      <span className="text-[11px] opacity-0 group-hover:opacity-100 transition-opacity">{label}</span>
    </button>
  );
}
