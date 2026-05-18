import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';

// ==================== Types ====================

export interface TabDef {
  id: string;
  label: string;
  content: React.ReactNode;
}

interface PanelState {
  tabs: TabDef[];
  sessionId: number;
  activeTab: string;
}

interface ContextPanelAPI {
  registerTabs: (tabs: TabDef[]) => () => void;
}

// ==================== Route whitelist (R195) ====================

function isPanelEnabled(pathname: string): boolean {
  if (pathname === '/knowledge' || pathname === '/graph') return true;
  if (pathname.startsWith('/blog/')) return true;
  return false;
}

// ==================== Shared state (module-level) ====================

let panelSubscribers: Array<(state: PanelState) => void> = [];
let currentState: PanelState = { tabs: [], sessionId: 0, activeTab: '' };

function setPanelState(next: PanelState) {
  currentState = next;
  for (const fn of panelSubscribers) fn(currentState);
}

function subscribePanel(fn: (state: PanelState) => void): () => void {
  panelSubscribers.push(fn);
  return () => { panelSubscribers = panelSubscribers.filter((s) => s !== fn); };
}

// ==================== Context ====================

const Ctx = createContext<ContextPanelAPI>({
  registerTabs: () => () => {},
});

export function useContextPanel(): ContextPanelAPI {
  return useContext(Ctx);
}

// ==================== Provider ====================

export function ContextPanelProvider({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  let sessionId = 0;
  // Using useState counter as session ID source
  const [sid, setSid] = useState(0);

  useEffect(() => {
    const nextSid = sid + 1;
    setSid(nextSid);
    setPanelState({ tabs: [], sessionId: nextSid, activeTab: '' });
  }, [location.pathname]);

  const registerTabs = useCallback(
    (tabs: TabDef[]): (() => void) => {
      const ownerSid = sid;
      const activeTab = tabs[0]?.id ?? '';
      setPanelState({ tabs, sessionId: ownerSid, activeTab });
      return () => {
        // R186: ownership token — only cleanup if still the owner
        if (currentState.sessionId === ownerSid) {
          setPanelState({ tabs: [], sessionId: ownerSid, activeTab: '' });
        }
      };
    },
    [sid],
  );

  const api = useMemo<ContextPanelAPI>(() => ({ registerTabs }), [registerTabs]);

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

// ==================== Panel UI ====================

export function ContextPanel() {
  const location = useLocation();
  const [state, setState] = useState<PanelState>(currentState);
  const [narrow, setNarrow] = useState(() => window.innerWidth < 1200);

  useEffect(() => {
    return subscribePanel((next) => {
      setState(next);
    });
  }, []);

  // R200: Responsive — hide panel when viewport < 1200px (D47)
  useEffect(() => {
    const onResize = () => setNarrow(window.innerWidth < 1200);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Reset active tab when tabs change
  useEffect(() => {
    if (state.tabs.length > 0 && !state.tabs.find((t) => t.id === state.activeTab)) {
      setPanelState({ ...state, activeTab: state.tabs[0]!.id });
    }
  }, [state.tabs, state.activeTab]);

  // Force re-render on route change
  useEffect(() => {
    setState(currentState);
  }, [location.pathname]);

  const visible = isPanelEnabled(location.pathname) && !narrow;
  if (!visible) return null;

  const { tabs, activeTab } = state;

  return (
    <aside
      className="flex shrink-0 flex-col border-l border-[var(--border-default)] overflow-hidden"
      style={{ width: 280, background: 'var(--bg-secondary)' }}
    >
      {tabs.length > 0 && (
        <div
          className="flex shrink-0 border-b border-[var(--border-default)]"
          style={{ height: 'var(--nav-height)' }}
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setPanelState({ ...currentState, activeTab: tab.id })}
              className="px-4 text-[13px] font-medium transition-colors duration-[0.15s] border-b-2"
              style={{
                color: activeTab === tab.id ? 'var(--accent-blue)' : 'var(--text-secondary)',
                borderColor: activeTab === tab.id ? 'var(--accent-blue)' : 'transparent',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4">
        {tabs.find((t) => t.id === activeTab)?.content ?? (
          <p className="text-[13px]" style={{ color: 'var(--text-muted)' }}>
            选择内容以查看上下文
          </p>
        )}
      </div>
    </aside>
  );
}
