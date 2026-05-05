import { useEffect, useState, useCallback } from 'react';
import type { TocItem } from '../../lib/toc-parser';

interface Props {
  items: TocItem[];
}

export function TableOfContents({ items }: Props) {
  const [activeId, setActiveId] = useState<string>('');
  const [collapsed, setCollapsed] = useState(false);

  const handleClick = useCallback((id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  useEffect(() => {
    if (items.length < 2) return;
    const headingElements = items
      .map((item) => document.getElementById(item.id))
      .filter(Boolean) as HTMLElement[];
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) { setActiveId(entry.target.id); break; }
        }
      },
      { rootMargin: '-80px 0px -60% 0px', threshold: 0 },
    );
    headingElements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [items]);

  if (items.length < 2) return null;

  return (
    <>
      {/* Toggle button — always visible */}
      <button
        type="button"
        className="fixed z-40 hidden lg:flex items-center justify-center rounded-full shadow-md transition-all"
        style={{
          top: 100,
          right: collapsed ? 16 : 'max(16px, calc((100vw - 1100px) / 2))',
          width: 32,
          height: 32,
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-default)',
          color: 'var(--text-secondary)',
          fontSize: 14,
        }}
        onClick={() => setCollapsed(!collapsed)}
        title={collapsed ? '展开目录' : '收起目录'}
      >
        {collapsed ? '☰' : '✕'}
      </button>

      {/* TOC panel */}
      {!collapsed && (
        <nav
          className="hidden lg:block"
          style={{
            position: 'fixed',
            top: 100,
            right: 'max(52px, calc((100vw - 1100px) / 2 + 36px))',
            width: 180,
            maxHeight: 'calc(100vh - 160px)',
            overflowY: 'auto',
            fontSize: 13,
            lineHeight: 1.7,
            padding: '8px 12px',
            borderRadius: 8,
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-default)',
          }}
        >
          <div className="mb-2 font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)', fontSize: 11 }}>
            目录
          </div>
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => handleClick(item.id)}
              className="block w-full text-left py-0.5 transition-colors duration-100 truncate"
              style={{
                paddingLeft: (item.level - 1) * 16,
                color: activeId === item.id ? 'var(--accent-blue)' : 'var(--text-secondary)',
                fontWeight: activeId === item.id ? 500 : 400,
                borderLeft: activeId === item.id ? '2px solid var(--accent-blue)' : '2px solid transparent',
                paddingRight: 4,
              }}
            >
              {item.text}
            </button>
          ))}
        </nav>
      )}
    </>
  );
}
