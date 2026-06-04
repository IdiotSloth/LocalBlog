import { useCallback, useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Bookmark,
  Bot,
  Clock,
  FileEdit,
  GitFork,
  HelpCircle,
  Layers,
  Library,
  PanelLeftClose,
  PanelLeftOpen,
  Pencil,
  Settings,
  StickyNote,
  Tags,
  Trash2,
} from 'lucide-react';
import { useShortcuts } from '../../hooks/useShortcuts';
import { useAuthStore } from '../../stores/auth-store';
import { ShortcutHelpPanel } from '../common/ShortcutHelpPanel';
import { GlobalSearch } from './GlobalSearch';
import { QuickNote } from './QuickNote';
import { QuickSwitcher } from './QuickSwitcher';
import { QuickNav } from '../common/QuickNav';
import { SplitPane, SplitProvider, useSplit } from './SplitPane';
import { ContextPanelProvider, ContextPanel } from './ContextPanel';
import { AiChatPanel } from '../ai/AiChatPanel';

const navGroups = [
  {
    label: '写作',
    items: [
      { to: '/', label: '今日', Icon: Pencil },
      { to: '/blog', label: '博客', Icon: FileEdit },
      { to: '/notes', label: '便签', Icon: StickyNote },
    ],
  },
  {
    label: '收纳',
    items: [
      { to: '/knowledge', label: '知识库', Icon: Library },
      { to: '/tags', label: '标签', Icon: Tags },
      { to: '/series', label: '系列', Icon: Layers },
      { to: '/bookmarks', label: '收藏', Icon: Bookmark },
    ],
  },
  {
    label: '思考',
    items: [
      { to: '/whiteboards', label: '白板', Icon: GitFork },
      { to: '/timeline', label: '时间轴', Icon: Clock },
    ],
  },
];

const footerItems = [
  { to: '/guide', label: '指南', Icon: HelpCircle },
  { to: '/settings', label: '设置', Icon: Settings },
  { to: '/recycle', label: '回收站', Icon: Trash2 },
];

const COLLAPSED_WIDTH = 48;
const EXPANDED_WIDTH = 220;

export function MainLayout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    return localStorage.getItem('lbkb_sidebar_collapsed') === 'true';
  });
  const [badges, setBadges] = useState<Record<string, number>>({});
  useShortcuts();

  useEffect(() => {
    localStorage.setItem('lbkb_sidebar_collapsed', String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  // T2306: Load count badges for sidebar
  useEffect(() => {
    if (!user) return;
    window.api.statsGet(user.id).then(r => {
      if (r.success && r.data) {
        setBadges({
          '/blog': r.data.totalBlogs ?? 0,
          '/notes': r.data.totalNotes ?? 0,
          '/knowledge': r.data.totalFiles ?? 0,
          '/tags': r.data.uniqueTags ?? 0,
          '/series': r.data.totalSeries ?? 0,
          '/bookmarks': r.data.totalBookmarks ?? 0,
          '/whiteboards': r.data.totalWhiteboards ?? 0,
        });
      }
    }).catch(() => {});
  }, [user]);

  const sidebarWidth = sidebarCollapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH;

  // R336: Dynamically set --content-max based on available space
  useEffect(() => {
    const update = () => {
      const root = document.documentElement;
      const w = root.clientWidth;
      // sidebar + padding + ContextPanel reserve (ContextPanel ~280px on whitelist routes)
      const reserve = sidebarCollapsed ? 120 : 300;
      const max = Math.max(640, Math.min(960, w - reserve));
      root.style.setProperty('--content-max', `${max}px`);
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [sidebarCollapsed]);

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed((v) => !v);
  }, []);

  // Pet action listener
  useEffect(() => {
    return window.api.onPetAction((action) => {
      if (action === 'new-blog') navigate('/standalone/editor');
    });
  }, [navigate]);

  // Keyboard shortcuts
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      // R193: Ctrl+B toggle sidebar
      if (e.key === 'b' && e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        toggleSidebar();
        return;
      }
      // ? key: show shortcut help
      if (e.key === '?' && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault();
        setShowShortcuts((v) => !v);
      }
      if (e.key === 'Escape' && showShortcuts) setShowShortcuts(false);
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [showShortcuts, toggleSidebar]);

  return (
    <SplitProvider>
      <div className="flex select-none" style={{ height: '100vh', overflow: 'hidden' }}>
          {/* ===== Sidebar — fixed, manual toggle. Always 220px inner, transform for GPU animation (R218) ===== */}
          <aside
          className="flex shrink-0 flex-col border-r border-[var(--border-default)]"
          style={{
            background: 'var(--bg-sidebar)',
            width: sidebarCollapsed ? 48 : 220,
            minWidth: 48,
            height: '100vh',
            transition: 'width 0.15s ease',
            willChange: 'width',
          }}
        >
          {/* Logo — drag handle for frameless window */}
          <div
            className="flex items-center gap-3 border-b border-[var(--border-default)] px-3"
            style={{ height: 'var(--nav-height)', WebkitAppRegion: 'drag' } as React.CSSProperties}
          >
            <span
              className="text-lg font-bold tracking-tight shrink-0"
              style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}
            >
              {sidebarCollapsed ? '~' : 'Idiot'}
            </span>
          </div>

          {/* Nav */}
          <nav className="flex-1 flex flex-col overflow-hidden" style={{ minHeight: 0 }}>
            {/* Main nav groups — scrollable */}
            <div className="flex-1 overflow-y-auto space-y-3 px-2 py-3" style={{ minHeight: 0 }}>
            {navGroups.map((group) => (
              <div key={group.label}>
                {!sidebarCollapsed && (
                  <div
                    className="text-[10px] font-semibold uppercase tracking-wider px-3 mb-0.5"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    {group.label}
                  </div>
                )}
                <div className="space-y-0.5">
                  {group.items.map((item) => {
                    const count = badges[item.to];
                    return (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        title={sidebarCollapsed ? item.label : undefined}
                        aria-label={sidebarCollapsed ? item.label : undefined}
                        end={item.to === '/'}
                        className={({ isActive }) =>
                          `flex items-center gap-3 rounded-[4px] px-3 py-2 text-[14px] transition-colors duration-[0.15s] whitespace-nowrap ${
                            isActive
                              ? 'text-[var(--accent-blue)]'
                              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]/50'
                          }`
                        }
                        style={({ isActive }) => ({
                          borderLeft: isActive ? '3px solid var(--accent-blue)' : '3px solid transparent',
                          background: isActive ? 'var(--bg-tertiary)' : undefined,
                          paddingLeft: isActive ? '9px' : '12px',
                        })}
                      >
                        <item.Icon className="w-4 h-4 shrink-0" />
                        {!sidebarCollapsed && <span className="flex-1">{item.label}</span>}
                        {!sidebarCollapsed && count != null && count > 0 && (
                          <span className="text-[11px] tabular-nums rounded-full min-w-[20px] text-center px-1.5 py-0.5"
                            style={{ background: 'var(--bg-primary)', color: 'var(--text-muted)' }}>
                            {count}
                          </span>
                        )}
                      </NavLink>
                    );
                  })}
                </div>
              </div>
            ))}
            </div>
            {/* Footer items — fixed at bottom */}
            <div className="border-t pt-2 mt-1 space-y-0.5 px-2" style={{ borderColor: 'var(--border-default)' }}>
              {footerItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  title={sidebarCollapsed ? item.label : undefined}
                  aria-label={sidebarCollapsed ? item.label : undefined}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-[4px] px-3 py-2 text-[14px] transition-colors duration-[0.15s] whitespace-nowrap ${
                      isActive
                        ? 'text-[var(--accent-blue)]'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]/50'
                    }`
                  }
                  style={({ isActive }) => ({
                    borderLeft: isActive ? '3px solid var(--accent-blue)' : '3px solid transparent',
                    background: isActive ? 'var(--bg-tertiary)' : undefined,
                    paddingLeft: isActive ? '9px' : '12px',
                  })}
                >
                  <item.Icon className="w-4 h-4 shrink-0" />
                  {!sidebarCollapsed && item.label}
                </NavLink>
              ))}
            </div>
          </nav>

          {/* Quick Note — hidden when collapsed */}
          {user && !sidebarCollapsed && (
            <div className="px-2">
              <QuickNote userId={user.id} />
            </div>
          )}

          {/* Sidebar toggle button (R193) */}
          <div className="border-t border-[var(--border-default)] p-1">
            <button
              type="button"
              onClick={toggleSidebar}
              aria-expanded={!sidebarCollapsed}
              aria-label={sidebarCollapsed ? '展开侧边栏' : '折叠侧边栏'}
              className="flex w-full items-center justify-center rounded-[4px] py-2 transition-colors duration-[0.15s] hover:bg-[var(--bg-tertiary)]"
              style={{ color: 'var(--text-secondary)' }}
              title={sidebarCollapsed ? '展开侧边栏 (Ctrl+B)' : '折叠侧边栏 (Ctrl+B)'}
            >
              {sidebarCollapsed ? (
                <PanelLeftOpen className="w-4 h-4" />
              ) : (
                <PanelLeftClose className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* User footer */}
          <div className="border-t border-[var(--border-default)] p-2" style={{ marginBottom: 24 }}>
            <div
              className="flex items-center justify-center gap-2.5 rounded-[4px] px-2 py-2"
              style={{ background: 'var(--bg-primary)' }}
            >
              <div
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                style={{ background: 'var(--bg-tertiary)', color: 'var(--accent-blue)' }}
              >
                {(user?.username || '?').charAt(0).toUpperCase()}
              </div>
              {!sidebarCollapsed && (
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                    {user?.username}
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      await logout();
                      navigate('/login');
                    }}
                    className="text-[11px] transition-colors duration-[0.15s]"
                    style={{ color: 'var(--text-secondary)' }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--accent-red)')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}
                  >
                    注销登录
                  </button>
                </div>
              )}
            </div>
          </div>
        </aside>

        <ContextPanelProvider>
          <MainContent />
          <ContextPanel />
        </ContextPanelProvider>

        {showShortcuts && <ShortcutHelpPanel onClose={() => setShowShortcuts(false)} />}
        <QuickSwitcher />
        <QuickNav />
      </div>
    </SplitProvider>
  );
}

/** Inner component that reads split state for conditional SplitPane rendering */
function MainContent() {
  const { isSplit, rightContent, closeSplit } = useSplit();
  const location = useLocation();
  const [showChat, setShowChat] = useState(false);

  // Close split on route change — prevents stale right pane content
  useEffect(() => {
    if (isSplit) closeSplit();
  }, [location.pathname]);

  return (
    <>
      <div className="flex flex-1 flex-col overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
        <header
          className="flex items-center border-b border-[var(--border-default)] px-6"
          style={{ background: 'var(--bg-secondary)', height: 'var(--nav-height)', WebkitAppRegion: 'drag' } as React.CSSProperties}
        >
          <div style={{ WebkitAppRegion: 'no-drag', marginRight: 12 } as React.CSSProperties}>
            <GlobalSearch />
          </div>
          <div className="flex-1" />
          <button type="button" onClick={() => setShowChat((v) => !v)}
            className="rounded-[4px] p-1.5 transition-opacity hover:opacity-70"
            style={{ WebkitAppRegion: 'no-drag', color: showChat ? 'var(--accent-blue)' : 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' } as React.CSSProperties}
            title="AI 对话" aria-label="AI 对话">
            <Bot size={18} />
          </button>
        </header>
        {isSplit ? (
          <SplitPane left={<Outlet />} right={rightContent} />
        ) : (
          <main className="flex-1 overflow-y-auto px-6 pt-2 pb-6">
            <Outlet />
          </main>
        )}
      </div>
      {showChat && (
        <div className="fixed right-0 top-0 bottom-0 z-50 shadow-lg" style={{ width: 380, background: 'var(--bg-secondary)', borderLeft: '1px solid var(--border-default)' }}>
          <AiChatPanel onClose={() => setShowChat(false)} />
        </div>
      )}
    </>
  );
}
