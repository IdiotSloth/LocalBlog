import { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useShortcuts } from '../../hooks/useShortcuts';
import { useAuthStore } from '../../stores/auth-store';
import { ShortcutHelpPanel } from '../common/ShortcutHelpPanel';
import { GlobalSearch } from './GlobalSearch';
import { QuickNote } from './QuickNote';

const navItems = [
  { to: '/dashboard', label: '仪表盘', icon: '⌂' },
  { to: '/notes', label: '便签', icon: '📝' },
  { to: '/blog', label: '博客', icon: '✎' },
  { to: '/knowledge', label: '知识库', icon: '▤' },
  { to: '/tags', label: '标签', icon: '#' },
  { to: '/recycle', label: '回收站', icon: '↺' },
  { to: '/guide', label: '指南', icon: '?' },
  { to: '/settings', label: '设置', icon: '⚙' },
];

export function MainLayout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [showShortcuts, setShowShortcuts] = useState(false);
  useShortcuts();

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
      {/* Sidebar — STYLE.md: bg-secondary, right border, 220px */}
      <aside
        className="flex w-[220px] shrink-0 flex-col border-r border-[var(--border-default)]"
        style={{ background: 'var(--bg-secondary)' }}
      >
        {/* Logo */}
        <div
          className="flex items-center gap-3 border-b border-[var(--border-default)] px-4"
          style={{ height: 'var(--nav-height)' }}
        >
          <span
            className="text-lg font-bold tracking-tight"
            style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}
          >
            ~/kb
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-0.5 px-3 py-3">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-[4px] px-3 py-2 text-[14px] transition-colors duration-[0.15s] ${
                  isActive
                    ? 'text-[var(--accent-blue)]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`
              }
              style={({ isActive }) => (isActive ? { background: 'var(--bg-tertiary)' } : {})}
            >
              <span className="w-5 text-center font-mono text-sm">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Quick Note */}
        {user && (
          <div className="px-3">
            <QuickNote userId={user.id} />
          </div>
        )}

        {/* User footer */}
        <div className="border-t border-[var(--border-default)] p-3">
          <div
            className="flex items-center gap-2.5 rounded-[4px] px-3 py-2"
            style={{ background: 'var(--bg-primary)' }}
          >
            <div
              className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold"
              style={{ background: 'var(--bg-tertiary)', color: 'var(--accent-blue)' }}
            >
              {(user?.username || '?')[0].toUpperCase()}
            </div>
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
