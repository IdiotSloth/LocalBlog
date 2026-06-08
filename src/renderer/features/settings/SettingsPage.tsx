import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth-store';
import { useThemeStore } from '../../stores/theme-store';
import { BackupSection } from './BackupSection';
import { ShortcutSettings } from './ShortcutSettings';
import { AiSection } from './AiSection';
import { UpdateSection } from './UpdateSection';

function BgImageSection() {
  const user = useAuthStore((s) => s.user);
  const [bgImage, setBgImage] = useState<string | null>(
    () => localStorage.getItem('lbkb_bg_image'),
  );
  const [bgOpacity, setBgOpacity] = useState<string>(
    () => localStorage.getItem('lbkb_bg_opacity') || '0.92',
  );

  useEffect(() => {
    applyBg(bgImage, bgOpacity);
  }, [bgImage, bgOpacity]);

  const handlePick = async () => {
    const files = await window.api.selectFiles(['png', 'jpg', 'jpeg', 'webp']);
    if (!files || files.length === 0) return;
    localStorage.setItem('lbkb_bg_image', files[0]);
    setBgImage(files[0]);
  };

  const handleClear = () => {
    localStorage.removeItem('lbkb_bg_image');
    localStorage.removeItem('lbkb_bg_opacity');
    setBgImage(null);
    setBgOpacity('0.92');
    applyBg(null, '0.92');
  };

  return (
    <div>
      <div className="flex items-center gap-3">
        <button type="button" onClick={handlePick}
          className="rounded-[4px] px-3 py-1.5 text-[13px] font-medium transition-opacity hover:opacity-85"
          style={{ background: 'var(--accent-blue)', color: 'var(--text-on-accent)' }}>
          {bgImage ? '更换图片' : '选择图片'}
        </button>
        {bgImage && (
          <button type="button" onClick={handleClear}
            className="rounded-[4px] px-3 py-1.5 text-[13px] transition-opacity hover:opacity-85"
            style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>
            清除背景
          </button>
        )}
        {bgImage && <span className="text-[12px] truncate max-w-[200px]" style={{ color: 'var(--text-muted)' }}>{bgImage.startsWith('data:') ? '已加载背景图' : bgImage.split(/[/\\]/).pop()}</span>}
      </div>
      {bgImage && (
        <div className="mt-3 flex items-center gap-3">
          <span className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>不透明度</span>
          <input type="range" min="0.85" max="0.98" step="0.01" value={bgOpacity}
            aria-label="背景图片不透明度"
            title={`不透明度: ${bgOpacity}`}
            onChange={e => {
              setBgOpacity(e.target.value);
              localStorage.setItem('lbkb_bg_opacity', e.target.value);
            }}
            className="flex-1" />
          <span className="text-[12px] font-mono" style={{ color: 'var(--text-muted)' }}>{bgOpacity}</span>
        </div>
      )}
    </div>
  );
}

function applyBg(image: string | null, opacity: string) {
  if (image) {
    let url: string;
    if (image.startsWith('data:')) {
      url = image;
    } else {
      // Convert file:// path to local-resource:// protocol (avoids CSP block)
      const p = image.replace(/\\/g, '/').replace(/^file:\/\/\//, '');
      url = `local-resource://${p}`;
    }
    document.documentElement.style.setProperty('--bg-image', `url("${url}")`);
    document.documentElement.style.setProperty('--bg-image-opacity', opacity);
  } else {
    document.documentElement.style.setProperty('--bg-image', 'none');
    document.documentElement.style.setProperty('--bg-image-opacity', '0');
  }
}

// T2304: Clipboard monitor settings
function ClipboardSection() {
  const user = useAuthStore((s) => s.user);
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    window.api.clipboardStatus().then(r => {
      if (r.success && r.data) setEnabled(r.data);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const toggle = async () => {
    const next = !enabled;
    setEnabled(next);
    await window.api.clipboardToggle({ enable: next, userId: user?.id ?? 0 });
  };

  return (
    <section className="rounded-[6px] border p-5" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-default)' }}>
      <h3 className="text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>
        剪贴板监听
      </h3>
      <p className="mb-3 mt-1 text-[13px]" style={{ color: 'var(--text-secondary)' }}>
        自动记录复制的文本内容，方便在便签中快速引用。敏感信息 (手机号/身份证/邮箱) 自动打码。
      </p>
      {loading ? (
        <span className="text-[13px]" style={{ color: 'var(--text-muted)' }}>加载中...</span>
      ) : (
        <button
          type="button"
          onClick={toggle}
          aria-label={enabled ? '关闭剪贴板监听' : '开启剪贴板监听'}
          className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
          style={{ background: enabled ? 'var(--accent-blue)' : 'var(--bg-tertiary)' }}
        >
          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${enabled ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
      )}
    </section>
  );
}

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
        if (d.success && d.data) setAutoStart(d.data.enabled);
      })
      .finally(() => setAutoStartLoading(false));
    window.api.appHasStartMenuShortcut().then((d) => {
      if (d.success && d.data) setHasShortcut(d.data.exists);
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
    { value: 'system' as const, label: '跟随系统', desc: '自动切换墨砚/宣纸' },
    { value: 'light' as const, label: '亮色', desc: '传统亮色模式 (无国风色调)' },
    { value: 'dark' as const, label: '暗色', desc: '传统暗色模式 (无国风色调)' },
    { value: 'inkstone' as const, label: '墨砚', desc: '端砚灰底+赭石铜赤 — 新默认暗色' },
    { value: 'tea-bamboo' as const, label: '茶竹', desc: '深烘茶棕底+干竹灰绿 — 有生命力的暗色' },
    { value: 'brass-lamp' as const, label: '夜灯', desc: '暖炭底+旧黄铜 — 稳重沉静的暗色' },
    { value: 'rice-paper' as const, label: '宣纸', desc: '生宣冷白底+靛蓝 — 新默认亮色' },
    { value: 'celadon' as const, label: '青瓷', desc: '瓷胎白底+青釉玉色 — 唯一冷调亮色' },
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

        {/* Background Image */}
        <section
          className="rounded-[6px] border p-5"
          style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-default)' }}
        >
          <h3 className="text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>
            背景图片
          </h3>
          <p className="mb-3 mt-1 text-[13px]" style={{ color: 'var(--text-secondary)' }}>
            选择一张图片作为全局背景 (仅本地存储, 不上传)
          </p>
          <BgImageSection />
        </section>

        {/* T2304: Clipboard monitor */}
        <ClipboardSection />

        {/* Backup */}
        <section
          className="rounded-[6px] border p-5"
          style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-default)' }}
        >
          <BackupSection />
        </section>

        {/* T2210: MD Export */}
        <section
          className="rounded-[6px] border p-5"
          style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-default)' }}
        >
          <h3 className="text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>数据导出</h3>
          <p className="mb-3 mt-1 text-[13px]" style={{ color: 'var(--text-secondary)' }}>
            将全部博客导出为 Markdown 文件（含 YAML frontmatter），知识文件原样复制
          </p>
          <button type="button" onClick={async () => {
            const r = await window.api.workspaceExportMd(user?.id ?? 0);
            alert(r.success ? `导出完成: ${r.data?.dir} (${r.data?.count} 篇博客)` : r.error || '导出失败');
          }}
            className="rounded-[4px] px-3 py-1.5 text-[13px] font-medium transition-opacity hover:opacity-85"
            style={{ background: 'var(--accent-blue)', color: 'var(--text-on-accent)' }}>
            导出 Markdown
          </button>
        </section>

        {/* Update */}
        <UpdateSection />

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

        {/* T2204: Built-in AI chat configuration */}
        <AiSection />

        {/* T2109: AI / MCP Configuration */}
        <section
          className="rounded-[6px] border p-5"
          style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-default)' }}
        >
          <h3 className="text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>
            AI 接入
          </h3>
          <p className="mb-3 mt-1 text-[13px]" style={{ color: 'var(--text-secondary)' }}>
            MCP Server 已就绪。Claude Code / VS Code 可通过以下方式连接：
          </p>
          <div className="space-y-2 text-[12px]" style={{ color: 'var(--text-secondary)' }}>
            <div className="rounded-[4px] px-3 py-2" style={{ background: 'var(--bg-primary)' }}>
              <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>stdio 模式</span>
              <br />
              <code className="text-[11px]" style={{ color: 'var(--accent-blue)' }}>npm run mcp</code>
              <span className="ml-2">— Claude Code / VS Code 本地直连</span>
            </div>
          </div>
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
              ['数据库', 'sqlite-wasm (SQLite 3.53)'],
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
