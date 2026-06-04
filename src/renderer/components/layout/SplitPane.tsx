import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

// ==================== Split Context (D84 foundation) ====================

export interface SplitContextValue {
  isSplit: boolean;
  rightContent: React.ReactNode;
  activePaneId: string;
  openSplit: (rightContent: React.ReactNode) => void;
  closeSplit: () => void;
}

const SplitCtx = createContext<SplitContextValue>({
  isSplit: false,
  rightContent: null,
  activePaneId: '',
  openSplit: () => {},
  closeSplit: () => {},
});

export function useSplit(): SplitContextValue {
  return useContext(SplitCtx);
}

// ==================== Provider ====================

export function SplitProvider({ children }: { children: React.ReactNode }) {
  const [isSplit, setIsSplit] = useState(false);
  const [rightContent, setRightContent] = useState<React.ReactNode>(null);
  const [activePaneId, setActivePaneId] = useState('');

  const openSplit = useCallback((content: React.ReactNode) => {
    setRightContent(content);
    setIsSplit(true);
  }, []);

  const closeSplit = useCallback(() => {
    setIsSplit(false);
    setRightContent(null);
  }, []);

  // Ctrl+\ toggles split — pages use openSplit to set content
  // This handler only deals with closing; opening is done by page components

  const value = useMemo<SplitContextValue>(
    () => ({ isSplit, rightContent, activePaneId, openSplit, closeSplit }),
    [isSplit, rightContent, activePaneId, openSplit, closeSplit],
  );

  return <SplitCtx.Provider value={value}>{children}</SplitCtx.Provider>;
}

// ==================== SplitPane UI Component ====================

interface SplitPaneProps {
  left: React.ReactNode;
  right: React.ReactNode;
  defaultRatio?: number; // percentage for left pane, default 50
}

const MIN_RATIO = 25;
const MAX_RATIO = 75;

export function SplitPane({ left, right, defaultRatio = 50 }: SplitPaneProps) {
  const [ratio, setRatio] = useState(() => {
    const saved = localStorage.getItem('lbkb_split_ratio');
    const n = saved ? Number(saved) : defaultRatio;
    return Math.max(MIN_RATIO, Math.min(MAX_RATIO, n));
  });
  const [isNarrow, setIsNarrow] = useState(() => window.innerWidth < 900);
  const [dragging, setDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Responsive: stack vertically when width < 900px
  useEffect(() => {
    const onResize = () => setIsNarrow(window.innerWidth < 900);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Drag handler
  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const pct = ((e.clientX - rect.left) / rect.width) * 100;
      setRatio(Math.max(MIN_RATIO, Math.min(MAX_RATIO, pct)));
    };
    const onUp = () => {
      setDragging(false);
      localStorage.setItem('lbkb_split_ratio', String(ratio));
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [dragging, ratio]);

  // Stack vertically on narrow viewports
  if (isNarrow) {
    return (
      <div className="flex flex-col flex-1 overflow-hidden">
        <div className="flex-1 overflow-y-auto" style={{ minHeight: 0 }}>
          {left}
        </div>
        <div
          className="border-t border-[var(--border-default)]"
          style={{ height: 4, background: 'var(--bg-tertiary)' }}
        />
        <div className="flex-1 overflow-y-auto" style={{ minHeight: 0 }}>
          {right}
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="flex flex-1 overflow-hidden" style={{ minWidth: 0 }}>
      {/* Left pane */}
      <div className="flex flex-col overflow-hidden" style={{ width: `${ratio}%`, minWidth: 0 }}>
        <div className="flex-1 overflow-y-auto">{left}</div>
      </div>

      {/* Divider — minimal, 1px, accent on hover */}
      <div
        role="separator"
        aria-label="拖拽调节分屏比例"
        aria-valuenow={Math.round(ratio)}
        aria-valuemin={MIN_RATIO}
        aria-valuemax={MAX_RATIO}
        tabIndex={0}
        className="flex shrink-0 items-center justify-center transition-colors duration-[0.15s] select-none"
        style={{
          width: 5,
          cursor: 'col-resize',
          background: dragging ? 'var(--accent-blue)' : 'var(--border-default)',
          marginLeft: -2,
          marginRight: -2,
          zIndex: 10,
        }}
        onMouseDown={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onMouseEnter={(e) => {
          if (!dragging) (e.currentTarget as HTMLElement).style.background = 'var(--accent-blue)';
        }}
        onMouseLeave={(e) => {
          if (!dragging) (e.currentTarget as HTMLElement).style.background = 'var(--border-default)';
        }}
      />

      {/* Right pane */}
      <div className="flex flex-col overflow-hidden" style={{ width: `${100 - ratio}%`, minWidth: 0 }}>
        <div className="flex-1 overflow-y-auto">{right}</div>
      </div>
    </div>
  );
}
