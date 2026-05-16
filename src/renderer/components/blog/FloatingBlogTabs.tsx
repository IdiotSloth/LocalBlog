import { useEffect, useState } from 'react';
import { getTabs, removeTab, subscribe, type MinimizedTab } from './floating-tabs-state';

export function FloatingBlogTabs() {
  const [tabs, setTabs] = useState<MinimizedTab[]>(() => getTabs());

  useEffect(() => {
    const unsub = subscribe(() => {
      setTabs(getTabs());
    });
    return unsub;
  }, []);

  if (tabs.length === 0) return null;

  const handleTabClick = (tab: MinimizedTab) => {
    // Use hash navigation for hash router compatibility
    window.location.hash = `/blog/${tab.id}`;
  };

  const handleClose = (e: React.MouseEvent, tabId: number) => {
    e.stopPropagation();
    removeTab(tabId);
  };

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[9998] flex items-center gap-1 border-t px-3 py-1.5"
      style={{
        background: 'var(--bg-sidebar)',
        borderColor: 'var(--border-default)',
        height: 36,
      }}
    >
      <span className="mr-1 text-[11px] shrink-0" style={{ color: 'var(--text-muted)' }}>
        最小化:
      </span>
      <div className="flex items-center gap-1 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => handleTabClick(tab)}
            aria-label={`切换到 ${tab.title || '无标题'}`}
            className="flex items-center gap-1.5 rounded-[4px] px-2.5 py-0.5 text-[12px] whitespace-nowrap transition-colors hover:opacity-80"
            style={{
              background: 'var(--bg-tertiary)',
              color: 'var(--text-primary)',
            }}
          >
            <span className="max-w-[120px] truncate">{tab.title || '无标题'}</span>
            <span
              className="rounded-[2px] px-1 py-[1px] text-[9px] font-mono uppercase"
              style={{ background: 'var(--bg-primary)', color: 'var(--text-muted)' }}
            >
              {tab.format}
            </span>
            <span
              className="ml-0.5 cursor-pointer text-[12px] leading-none hover:opacity-60"
              style={{ color: 'var(--text-muted)' }}
              onClick={(e) => handleClose(e, tab.id)}
              aria-label={`关闭 ${tab.title || '无标题'}`}
            >
              ×
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
