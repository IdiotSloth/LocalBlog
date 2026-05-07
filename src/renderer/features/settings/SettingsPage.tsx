import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth-store';
import { useThemeStore } from '../../stores/theme-store';
import { BackupSection } from './BackupSection';
import { ShortcutSettings } from './ShortcutSettings';

export function SettingsPage() {
  const { user, deleteAccount } = useAuthStore();
  const { theme, setTheme } = useThemeStore();
  const navigate = useNavigate();
  const [confirmDelete, setConfirmDelete] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [autoStart, setAutoStart] = useState(false);
  const [autoStartLoading, setAutoStartLoading] = useState(true);
  const [hasShortcut, setHasShortcut] = useState(false);
  const [shortcutLoading, setShortcutLoading] = useState(false);
  const [shortcutMsg, setShortcutMsg] = useState('');

  useEffect(() => {
    window.api
      .appGetAutoStart()
      .then((d) => {
        if (d.success) setAutoStart(d.data.enabled);
      })
      .finally(() => setAutoStartLoading(false));
    window.api.appHasStartMenuShortcut().then((d) => {
      if (d.success) setHasShortcut(d.data.exists);
    });
  }, []);

  const handleAutoStart = async (enabled: boolean) => {
    setAutoStart(enabled);
    await window.api.appSetAutoStart(enabled);
  };

  const handleCreateShortcut = async () => {
    setShortcutLoading(true);
    setShortcutMsg('');
    const d = await window.api.appCreateStartMenuShortcut();
    if (d.success) {
      setHasShortcut(true);
      setShortcutMsg('已添加到开始菜单 — 搜索 "Idiot" 即可找到');
    } else setShortcutMsg(d.error || '创建失败');
    setShortcutLoading(false);
  };

  const themes = [
    { value: 'light' as const, label: 'Light', desc: 'GitHub 风格浅色' },
    { value: 'dark' as const, label: 'Dark', desc: '默认深色终端风' },
    { value: 'system' as const, label: 'System', desc: '跟随操作系统' },
  ];

  return (
    <div style={{ maxWidth: 'var(--content-max)', margin: '0 auto' }}>
      <h2 className="mb-6 text-[24px] font-semibold" style={{ color: 'var(--text-primary)' }}>
        设置
      </h2>
      <div className="space-y-4">
        {/* Workspace */}
        <section
          className="rounded-[6px] border p-5"
          style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-default)' }}
        >
          <h3 className="text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>
            工作区
          </h3>
          <p className="mb-3 mt-1 text-[13px]" style={{ color: 'var(--text-secondary)' }}>
            博客和知识库文件的存储位置
          </p>
          <code
            className="block rounded-[4px] px-3 py-2 font-mono text-[13px]"
            style={{ background: 'var(--bg-primary)', color: 'var(--text-secondary)' }}
          >
            {user?.workspacePath || '未设置'}
          </code>
        </section>

        {/* Theme */}
        <section
          className="rounded-[6px] border p-5"
          style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-default)' }}
        >
          <h3 className="text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>
            主题
          </h3>
          <div className="mt-3 flex gap-3">
            {themes.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setTheme(t.value)}
                className="flex-1 rounded-[4px] border px-4 py-3 text-left transition-all duration-[0.15s]"
                style={{
                  borderColor: theme === t.value ? 'var(--accent-blue)' : 'var(--border-default)',
                  background: theme === t.value ? 'var(--bg-tertiary)' : 'transparent',
                }}
              >
                <div
                  className="text-[14px] font-semibold"
                  style={{ color: theme === t.value ? 'var(--accent-blue)' : 'var(--text-primary)' }}
                >
                  {t.label}
                </div>
                <div className="mt-0.5 text-[12px]" style={{ color: 'var(--text-secondary)' }}>
                  {t.desc}
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* Backup */}
        <section
          className="rounded-[6px] border p-5"
          style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-default)' }}
        >
          <BackupSection />
        </section>

        {/* Shortcuts */}
        <section
          className="rounded-[6px] border p-5"
          style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-default)' }}
        >
          <ShortcutSettings />
        </section>

        {/* Startup */}
        <section
          className="rounded-[6px] border p-5"
          style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-default)' }}
        >
          <h3 className="text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>
            启动选项
          </h3>

          {/* Auto-start toggle */}
          <div className="mt-3 flex items-center justify-between">
            <div>
              <div className="text-[14px]" style={{ color: 'var(--text-primary)' }}>
                开机自启动
              </div>
              <div className="mt-0.5 text-[12px]" style={{ color: 'var(--text-secondary)' }}>
                Windows 启动时自动运行应用
              </div>
            </div>
            {autoStartLoading ? (
              <div className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>
                加载中...
              </div>
            ) : (
              <button
                type="button"
                onClick={() => handleAutoStart(!autoStart)}
                aria-label={autoStart ? '关闭开机自启动' : '开启开机自启动'}
                className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
                style={{ background: autoStart ? 'var(--accent-blue)' : 'var(--bg-tertiary)' }}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${autoStart ? 'translate-x-6' : 'translate-x-1'}`}
                />
              </button>
            )}
          </div>

          {/* Start Menu shortcut */}
          <div
            className="mt-4 flex items-center justify-between border-t pt-4"
            style={{ borderColor: 'var(--border-default)' }}
          >
            <div>
              <div className="text-[14px]" style={{ color: 'var(--text-primary)' }}>
                开始菜单快捷方式
              </div>
              <div className="mt-0.5 text-[12px]" style={{ color: 'var(--text-secondary)' }}>
                {hasShortcut ? '已创建 — 搜索 "Idiot" 可找到' : '添加到 Windows 开始菜单'}
              </div>
            </div>
            <button
              type="button"
              onClick={handleCreateShortcut}
              disabled={shortcutLoading || hasShortcut}
              className="rounded-[4px] px-3 py-1.5 text-[13px] font-medium transition-all disabled:opacity-40"
              style={{
                background: hasShortcut ? 'var(--bg-tertiary)' : 'var(--accent-blue)',
                color: hasShortcut ? 'var(--text-secondary)' : 'var(--text-on-accent)',
              }}
            >
              {shortcutLoading ? '创建中...' : hasShortcut ? '已创建' : '创建快捷方式'}
            </button>
          </div>
          {shortcutMsg && (
            <p
              className={`mt-2 text-[12px] ${hasShortcut ? '' : ''}`}
              style={{ color: hasShortcut ? 'var(--accent-green)' : 'var(--accent-red)' }}
            >
              {shortcutMsg}
            </p>
          )}
        </section>

        {/* About */}
        <section
          className="rounded-[6px] border p-5"
          style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-default)' }}
        >
          <h3 className="text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>
            关于
          </h3>
          <div className="mt-3 grid grid-cols-2 gap-2 text-[13px]">
            {[
              ['版本', 'v0.3.0'],
              ['框架', 'Electron 41 + React 19'],
              ['构建', 'Vite 7 + electron-vite 5'],
              ['数据库', 'MySQL 8.3 (sql.js 备选)'],
              ['设计', 'STYLE.md · terminal-aesthetic'],
              ['字体', 'Inter + JetBrains Mono'],
            ].map(([k, v]) => (
              <div key={k} className="rounded-[4px] px-3 py-2" style={{ background: 'var(--bg-primary)' }}>
                <div className="text-[11px] uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                  {k}
                </div>
                <div style={{ color: 'var(--text-primary)' }}>{v}</div>
              </div>
            ))}
          </div>
          <div
            className="mt-4 rounded-[6px] border p-3 text-[13px]"
            style={{ borderColor: 'var(--accent-green)', background: 'rgba(63,185,80,0.06)' }}
          >
            <span className="font-semibold" style={{ color: 'var(--accent-green)' }}>
              本地优先
            </span>
            <span className="ml-2" style={{ color: 'var(--text-secondary)' }}>
              你的数据完全存储在本地。零云服务，零网络依赖，数据永不离开你的设备。
            </span>
          </div>
        </section>
        <section
          className="rounded-[6px] border-2 p-5"
          style={{ borderColor: 'var(--accent-red)', background: 'rgba(248,81,73,0.05)' }}
        >
          <h3 className="text-[14px] font-semibold" style={{ color: 'var(--accent-red)' }}>
            删除账户
          </h3>
          <p className="mb-3 mt-1 text-[12px]" style={{ color: 'var(--accent-red)', opacity: 0.8 }}>
            永久删除所有数据，此操作不可撤销
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={confirmDelete}
              onChange={(e) => setConfirmDelete(e.target.value)}
              placeholder={`输入 "${user?.username}" 确认`}
              className="input-dark flex-1"
            />
            <button
              type="button"
              onClick={async () => {
                setDeleteError('');
                if (confirmDelete !== user?.username) {
                  setDeleteError('用户名不匹配');
                  return;
                }
                const r = await deleteAccount(false);
                if (r.success) navigate('/login');
                else setDeleteError(r.error || '删除失败');
              }}
              disabled={confirmDelete !== user?.username}
              className="btn-danger disabled:opacity-40"
            >
              删除账户
            </button>
          </div>
          {deleteError && (
            <p className="mt-2 text-[12px]" style={{ color: 'var(--accent-red)' }}>
              {deleteError}
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
