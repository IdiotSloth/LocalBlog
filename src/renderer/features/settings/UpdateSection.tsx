import { useCallback, useEffect, useState } from 'react';

type UpdatePhase =
  | 'idle'
  | 'checking'
  | 'available'
  | 'not-available'
  | 'downloading'
  | 'downloaded'
  | 'error';

export function UpdateSection() {
  const [phase, setPhase] = useState<UpdatePhase>('idle');
  const [newVersion, setNewVersion] = useState<string | null>(null);
  const [percent, setPercent] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const [checking, setChecking] = useState(false);
  const [currentVersion, setCurrentVersion] = useState('…');

  useEffect(() => {
    // appGetVersion returns a plain string (electron App.getVersion), not ApiResponse
    window.api.appGetVersion().then((v) => {
      setCurrentVersion(String(v || 'dev'));
    });
    const unsub = window.api.onUpdateStatus((data) => {
      switch (data.status) {
        case 'checking':
          setPhase('checking');
          break;
        case 'available':
          setPhase('available');
          setNewVersion(data.version || null);
          break;
        case 'not-available':
          setPhase('not-available');
          break;
        case 'downloading':
          setPhase('downloading');
          setPercent(data.percent || 0);
          break;
        case 'downloaded':
          setPhase('downloaded');
          setNewVersion(data.version || newVersion);
          break;
        case 'error':
          setPhase('error');
          setErrorMsg(data.message || '未知错误');
          break;
      }
    });
    return () => unsub();
  }, []);

  const handleCheckUpdate = useCallback(async () => {
    setChecking(true);
    setErrorMsg('');
    // Phase transitions handled by onUpdateStatus listener
    const r = await window.api.appCheckUpdate();
    setChecking(false);
    if (!r.success) setErrorMsg(r.error || '检查更新失败');
  }, []);

  const handleDownload = useCallback(async () => {
    const r = await window.api.appDownloadUpdate();
    if (!r.success) {
      setPhase('error');
      setErrorMsg(r.error || '下载失败');
    }
  }, []);

  const handleInstall = useCallback(async () => {
    await window.api.appInstallUpdate();
  }, []);

  const handleDismiss = useCallback(() => {
    setPhase('idle');
    setNewVersion(null);
    setPercent(0);
    setErrorMsg('');
  }, []);

  const accentBlue = 'var(--accent-blue)';
  const accentGreen = 'var(--accent-green)';
  const accentRed = 'var(--accent-red)';
  const bgPrimary = 'var(--bg-primary)';
  const bgSecondary = 'var(--bg-secondary)';
  const bgTertiary = 'var(--bg-tertiary)';
  const borderDefault = 'var(--border-default)';
  const textPrimary = 'var(--text-primary)';
  const textSecondary = 'var(--text-secondary)';

  return (
    <section
      className="rounded-[6px] border p-5"
      style={{ background: bgSecondary, borderColor: borderDefault }}
    >
      <h3 className="text-[14px] font-semibold" style={{ color: textPrimary }}>
        更新
      </h3>
      <p className="mb-3 mt-1 text-[13px]" style={{ color: textSecondary }}>
        当前版本 {currentVersion}
      </p>

      {/* Idle / initial state */}
      {phase === 'idle' && (
        <button
          type="button"
          onClick={handleCheckUpdate}
          disabled={checking}
          className="rounded-[4px] px-4 py-2 text-[13px] font-medium transition-all disabled:opacity-50"
          style={{ background: accentBlue, color: 'var(--text-on-accent)' }}
        >
          {checking ? '检查中...' : '检查更新'}
        </button>
      )}

      {/* Checking */}
      {phase === 'checking' && (
        <div className="flex items-center gap-3">
          <div
            className="h-4 w-4 animate-spin rounded-full border-2"
            style={{ borderColor: `${accentBlue}40`, borderTopColor: accentBlue }}
          />
          <span className="text-[13px]" style={{ color: textSecondary }}>
            正在检查更新...
          </span>
        </div>
      )}

      {/* No update available */}
      {phase === 'not-available' && (
        <div>
          <div className="flex items-center gap-2" style={{ color: accentGreen }}>
            <span className="text-[13px] font-medium">已是最新版本</span>
          </div>
          <button
            type="button"
            onClick={handleDismiss}
            className="mt-3 text-[12px] underline"
            style={{ color: textSecondary }}
          >
            关闭
          </button>
        </div>
      )}

      {/* Update available — prompt download */}
      {phase === 'available' && (
        <div>
          <div
            className="mb-3 rounded-[4px] px-3 py-2 text-[13px]"
            style={{ background: 'rgba(63,185,80,0.08)', color: accentGreen }}
          >
            新版本 {newVersion} 可用
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleDownload}
              className="rounded-[4px] px-4 py-2 text-[13px] font-medium transition-all"
              style={{ background: accentBlue, color: 'var(--text-on-accent)' }}
            >
              下载更新
            </button>
            <button
              type="button"
              onClick={handleDismiss}
              className="rounded-[4px] px-4 py-2 text-[13px] transition-all"
              style={{ background: bgTertiary, color: textSecondary }}
            >
              稍后再说
            </button>
          </div>
        </div>
      )}

      {/* Downloading */}
      {phase === 'downloading' && (
        <div>
          <div className="mb-2 flex items-center justify-between text-[13px]">
            <span style={{ color: textSecondary }}>正在下载 {newVersion}...</span>
            <span style={{ color: textPrimary }}>{percent.toFixed(0)}%</span>
          </div>
          <div
            className="h-1.5 w-full overflow-hidden rounded-full"
            style={{ background: bgTertiary }}
          >
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{ width: `${percent}%`, background: accentBlue }}
            />
          </div>
        </div>
      )}

      {/* Downloaded — ready to install */}
      {phase === 'downloaded' && (
        <div>
          <div
            className="mb-3 rounded-[4px] px-3 py-2 text-[13px]"
            style={{ background: 'rgba(63,185,80,0.08)', color: accentGreen }}
          >
            {newVersion} 已下载完毕 — 重启应用后生效
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleInstall}
              className="rounded-[4px] px-4 py-2 text-[13px] font-medium transition-all"
              style={{ background: accentGreen, color: 'var(--text-on-accent)' }}
            >
              立即重启
            </button>
            <button
              type="button"
              onClick={handleDismiss}
              className="rounded-[4px] px-4 py-2 text-[13px] transition-all"
              style={{ background: bgTertiary, color: textSecondary }}
            >
              稍后重启
            </button>
          </div>
        </div>
      )}

      {/* Error */}
      {phase === 'error' && (
        <div>
          <div
            className="mb-3 rounded-[4px] px-3 py-2 text-[13px]"
            style={{ background: 'rgba(248,81,73,0.06)', color: accentRed }}
          >
            更新检查失败: {errorMsg}
          </div>
          <button
            type="button"
            onClick={handleDismiss}
            className="text-[12px] underline"
            style={{ color: textSecondary }}
          >
            关闭
          </button>
        </div>
      )}
    </section>
  );
}
