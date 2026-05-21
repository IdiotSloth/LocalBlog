import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { useTabs, type TabItem } from '../../stores/tab-context';

function TabLabel({ tab }: { tab: TabItem }) {
  // Try to resolve dynamic labels for blog routes
  return <span className="truncate">{tab.label}</span>;
}

export function TabBar() {
  const { tabs, activeTabId, switchTab, closeTab } = useTabs();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Scroll active tab into view
  useEffect(() => {
    const el = scrollRef.current?.querySelector(`[data-tab-id="${activeTabId}"]`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
  }, [activeTabId]);

  // T2211: Ctrl+1-8 keyboard tab switching
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey && !e.metaKey && !e.shiftKey) {
        const num = Number(e.key);
        if (num >= 1 && num <= 8 && tabs[num - 1]) {
          e.preventDefault();
          switchTab(tabs[num - 1]!.id);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [tabs, switchTab]);

  if (tabs.length <= 1) return null;

  return (
    <div className="flex shrink-0 items-center border-b overflow-x-auto"
      style={{ borderColor: 'var(--border-default)', background: 'var(--bg-secondary)', height: 36, scrollbarWidth: 'none' }}
      ref={scrollRef}>
      {tabs.map((tab) => {
        const isActive = tab.id === activeTabId;
        const isHome = tab.path === '/';
        return (
          <button key={tab.id} type="button" data-tab-id={tab.id}
            onClick={() => switchTab(tab.id)}
            className="group flex items-center gap-1.5 shrink-0 h-full px-3 text-[12px] font-medium transition-colors duration-[0.15s] border-b-2 max-w-[180px]"
            style={{
              color: isActive ? 'var(--accent-blue)' : 'var(--text-secondary)',
              borderColor: isActive ? 'var(--accent-blue)' : 'transparent',
              background: isActive ? 'var(--bg-primary)' : 'transparent',
              cursor: 'pointer',
            }}>
            <TabLabel tab={tab} />
            {!isHome && (
              <span onClick={(e) => { e.stopPropagation(); closeTab(tab.id); }}
                className="shrink-0 flex items-center justify-center w-4 h-4 rounded-[2px] opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[var(--bg-tertiary)]"
                style={{ color: 'var(--text-muted)' }}
                role="button" tabIndex={-1} aria-label={`关闭 ${tab.label}`}>
                <X size={10} />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
