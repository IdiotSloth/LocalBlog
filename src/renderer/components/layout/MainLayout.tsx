import { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useShortcuts } from '../../hooks/useShortcuts';
import { useAuthStore } from '../../stores/auth-store';
import { ShortcutHelpPanel } from '../common/ShortcutHelpPanel';
import { GlobalSearch } from './GlobalSearch';
import { QuickNote } from './QuickNote';

const navGroups = [
  {
    label: '写作',
    items: [
      { to: '/notes', label: '便签', icon: '📝' },
      { to: '/memo', label: '备忘录', icon: '📋' },
      { to: '/blog', label: '博客', icon: '✎' },
    ],
  },
  {
    label: '资料',
    items: [
      { to: '/knowledge', label: '知识库', icon: '▤' },
      { to: '/tags', label: '标签', icon: '#' },
    ],
  },
  {
    label: '洞察',
    items: [
      { to: '/', label: '续写', icon: '⌂' },
      { to: '/dashboard', label: '仪表盘', icon: '⌂' },
      { to: '/series', label: '系列', icon: '≡' },
    ],
  },
  {
    label: '系统',
    items: [
      { to: '/recycle', label: '回收站', icon: '↺' },
      { to: '/guide', label: '指南', icon: '?' },
      { to: '/settings', label: '设置', icon: '⚙' },
    ],
  },
];

export function MainLayout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    return localStorage.getItem('lbkb_sidebar_collapsed') !== 'false';
  });
  useShortcuts();

  useEffect(() => {
    localStorage.setItem('lbkb_sidebar_collapsed', String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  const sidebarWidth = sidebarCollapsed ? 64 : 220;

  // Pet action listener — only 'new-blog' opens main window (standalone editor)
  useEffect(() => {
    return window.api.onPetAction((action) => {
      if (action === 'new-blog') navigate('/standalone/editor');
    });
  }, [navigate]);

  // ? key: show shortcut help
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === '?' && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault();
        setShowShortcuts((v) => !v);
      }
      if (e.key === 'Escape' && showShortcuts) setShowShortcuts(false);
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [showShortcuts]);

  return (
    <div className="flex h-full select-none">
      {/* Sidebar — STYLE.md: bg-secondary, right border, collapsible */}
      <aside
        className="flex shrink-0 flex-col border-r border-[var(--border-default)] overflow-hidden"
        style={{
          background: 'var(--bg-sidebar)',
          width: sidebarWidth,
          transition: 'width 0.2s ease',
        }}
        onMouseEnter={() => setSidebarCollapsed(false)}
        onMouseLeave={() => setSidebarCollapsed(true)}
      >
        {/* Logo */}
        <div
          className="flex items-center gap-3 border-b border-[var(--border-default)] px-4"
          style={{ height: 'var(--nav-height)' }}
        >
          <span
            className="text-lg font-bold tracking-tight shrink-0"
            style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}
          >
            {sidebarCollapsed ? '~' : '~/kb'}
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-3 px-3 py-3 overflow-y-auto">
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
                {group.items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    title={sidebarCollapsed ? item.label : undefined}
                    end={item.to === '/'}
                    className={({ isActive }) =>
                      `flex items-center gap-3 rounded-[4px] px-3 py-2 text-[14px] transition-colors duration-[0.15s] whitespace-nowrap ${
                        isActive
                          ? 'text-[var(--accent-blue)]'
                          : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                      }`
                    }
                    style={({ isActive }) => (isActive ? { background: 'var(--bg-tertiary)' } : {})}
                  >
                    <span className="w-5 text-center font-mono text-[18px] shrink-0">{item.icon}</span>
                    {!sidebarCollapsed && item.label}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Quick Note — hidden when collapsed */}
        {user && !sidebarCollapsed && (
          <div className="px-3">
            <QuickNote userId={user.id} />
          </div>
        )}

        {/* User footer */}
        <div className="border-t border-[var(--border-default)] p-2">
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

      {/* Main */}
      <div className="flex flex-1 flex-col overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
        <header
          className="flex items-center border-b border-[var(--border-default)] px-6"
          style={{ background: 'var(--bg-secondary)', height: 'var(--nav-height)' }}
        >
          <GlobalSearch />
        </header>
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>

      {showShortcuts && <ShortcutHelpPanel onClose={() => setShowShortcuts(false)} />}
    </div>
  );
}
