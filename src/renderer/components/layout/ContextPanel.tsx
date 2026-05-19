import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useSplit } from './SplitPane';

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

// ==================== Module-level shared state (HMR-safe via window) ====================

const WIN_KEY = '__lbkb_context_panel__';

interface PanelStore {
  subscribers: Array<(state: PanelState) => void>;
  paneStates: Map<string, PanelState>;
  currentPaneId: string;
}

function getStore(): PanelStore {
  const w = window as any;
  if (!w[WIN_KEY]) {
    w[WIN_KEY] = { subscribers: [], paneStates: new Map(), currentPaneId: '' };
  }
  return w[WIN_KEY] as PanelStore;
}

function getCurrentState(): PanelState {
  const s = getStore();
  return s.paneStates.get(s.currentPaneId) ?? { tabs: [], sessionId: 0, activeTab: '' };
}

function setPanelState(next: PanelState) {
  const s = getStore();
  s.paneStates.set(s.currentPaneId, next);
  for (const fn of s.subscribers) fn(next);
}

function subscribePanel(fn: (state: PanelState) => void): () => void {
  const s = getStore();
  s.subscribers.push(fn);
  return () => { s.subscribers = s.subscribers.filter((x) => x !== fn); };
}

/** D84: Switch active pane. Notifies subscribers with the new pane's state. */
function switchActivePane(paneId: string) {
  const s = getStore();
  s.currentPaneId = paneId;
  for (const fn of s.subscribers) fn(getCurrentState());
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
  const { activePaneId } = useSplit();
  const [sid, setSid] = useState(0);

  // D84: Sync module-level currentPaneId with SplitContext
  useEffect(() => {
    const paneId = activePaneId ?? '';
    switchActivePane(paneId);
  }, [activePaneId]);

  // Route change → new session, clear current pane's tabs
  useEffect(() => {
    const nextSid = sid + 1;
    setSid(nextSid);
    const paneId = activePaneId ?? '';
    getStore().currentPaneId = paneId;
    setPanelState({ tabs: [], sessionId: nextSid, activeTab: '' });
  }, [location.pathname]);
  // activePaneId intentionally excluded — session reset is route-driven

  const registerTabs = useCallback(
    (tabs: TabDef[]): (() => void) => {
      const ownerSid = sid;
      const ownerPaneId = activePaneId ?? '';
      const activeTab = tabs[0]?.id ?? '';

      // Only register if we're the active pane
      if (ownerPaneId === getStore().currentPaneId) {
        setPanelState({ tabs, sessionId: ownerSid, activeTab });
      } else {
        // Store in the owning pane's slot without broadcasting
        getStore().paneStates.set(ownerPaneId, { tabs, sessionId: ownerSid, activeTab });
      }

      return () => {
        // D84: ownership token — check both paneId AND sessionId match
        const stored = getStore().paneStates.get(ownerPaneId);
        if (stored && stored.sessionId === ownerSid) {
          getStore().paneStates.delete(ownerPaneId);
          // Only clear UI if the cleaned pane is the currently active one
          if (getStore().currentPaneId === ownerPaneId) {
            setPanelState({ tabs: [], sessionId: ownerSid, activeTab: '' });
          }
        }
      };
    },
    [sid, activePaneId],
  );

  const api = useMemo<ContextPanelAPI>(() => ({ registerTabs }), [registerTabs]);

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

// ==================== Panel UI ====================

export function ContextPanel() {
  const location = useLocation();
  const [state, setState] = useState<PanelState>(getCurrentState);
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
    setState(getCurrentState());
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
              onClick={() => setPanelState({ ...getCurrentState(), activeTab: tab.id })}
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
