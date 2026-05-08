import { useEffect, useState } from 'react';
import { useToast } from '../../components/common/Toast';
import { useAuthStore } from '../../stores/auth-store';

interface TocEntry {
  title: string;
  href: string;
  level: number;
}
interface Progress {
  done: number;
  total: number;
  title: string;
  status: string;
}

export function ManualCollectTab() {
  const user = useAuthStore((s) => s.user);
  const { toast } = useToast();
  const [url, setUrl] = useState('');
  const [toc, setToc] = useState<TocEntry[]>([]);
  const [extracting, setExtracting] = useState(false);
  const [collecting, setCollecting] = useState(false);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [result, setResult] = useState<{ succeeded: number; failed: number; seriesId: string; seriesName: string } | null>(null);

  // Listen for progress events
  useEffect(() => {
    const unsub = window.api.onManualCollectProgress((data) => {
      setProgress(data);
    });
    return unsub;
  }, []);

  const handleExtract = async () => {
    if (!url.trim()) return;
    setExtracting(true);
    setToc([]);
    setResult(null);
    try {
      const r = await window.api.scrapeExtractToc(url.trim());
      if (r.success && r.data) {
        if (r.data.length === 0) {
          toast('未检测到手册目录，将作为单页收藏', 'info');
        }
        setToc(r.data);
      } else {
        toast(r.error || '目录提取失败', 'error');
      }
    } catch {
      toast('目录提取失败', 'error');
    } finally {
      setExtracting(false);
    }
  };

  const handleCollect = async () => {
    if (!user || toc.length === 0) return;
    setCollecting(true);
    setProgress({ done: 0, total: toc.length, title: '', status: 'ok' });
    try {
      // Use page title or URL host as series name
      let seriesName = '';
      try { seriesName = new URL(url).hostname; } catch { seriesName = url; }
      const r = await window.api.scrapeCollectManual({ userId: user.id, seriesName, entries: toc });
      if (r.success && r.data) {
        setResult(r.data);
        if (r.data.total > toc.length) toast(`已截取前 ${toc.length} 页`, 'info');
      } else {
        toast(r.error || '批量采集失败', 'error');
      }
    } catch {
      toast('批量采集失败', 'error');
    } finally {
      setCollecting(false);
    }
  };

  const progressPct = progress ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <div className="mx-auto max-w-[780px]">
      <h2 className="mb-2 text-[24px] font-semibold" style={{ color: 'var(--text-primary)' }}>
        📘 批量手册
      </h2>
      <p className="mb-4 text-[13px]" style={{ color: 'var(--text-secondary)' }}>
        输入在线手册首页链接，自动提取目录并批量收藏为系列博客。限 50 页。
      </p>

      {/* URL input */}
      <div className="mb-4 flex gap-2">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleExtract()}
          placeholder="https://example.com/docs/"
          className="flex-1 rounded-[4px] border px-3 py-2 text-[14px] outline-none"
          style={{ background: 'var(--bg-primary)', borderColor: 'var(--border-default)', color: 'var(--text-primary)' }}
        />
        <button
          type="button"
          onClick={handleExtract}
          disabled={extracting || !url.trim()}
          className="btn-primary !text-[13px]"
        >
          {extracting ? '提取中...' : '提取目录'}
        </button>
      </div>

      {/* Progress card */}
      {collecting && progress && (
        <div
          className="mb-4 rounded-[8px] border p-4"
          style={{ borderColor: 'var(--accent-blue)', background: 'var(--bg-secondary)' }}
        >
          <div className="mb-2 flex items-center justify-between text-[13px]">
            <span style={{ color: 'var(--text-primary)' }}>
              采集进度: {progress.done}/{progress.total}
            </span>
            <span style={{ color: 'var(--text-secondary)' }}>{progressPct}%</span>
          </div>
          <div className="mb-1 h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-tertiary)' }}>
            <div
              className="h-full transition-all duration-300"
              style={{ width: `${progressPct}%`, background: 'var(--accent-blue)' }}
            />
          </div>
          {progress.title && (
            <p className="mt-1 truncate text-[12px]" style={{ color: 'var(--text-muted)' }}>
              {progress.status === 'fail' ? '❌' : '✅'} {progress.title}
            </p>
          )}
        </div>
      )}

      {/* Result card */}
      {result && (
        <div
          className="mb-4 rounded-[8px] border p-4"
          style={{ borderColor: 'var(--accent-green)', background: 'var(--bg-secondary)' }}
        >
          <p className="text-[14px] font-medium" style={{ color: 'var(--text-primary)' }}>
            ✅ 采集完成
          </p>
          <p className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>
            系列「{result.seriesName}」— 成功 {result.succeeded} 篇，失败 {result.failed} 篇
          </p>
        </div>
      )}

      {/* TOC preview */}
      {toc.length > 0 && !collecting && !result && (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <span className="text-[14px]" style={{ color: 'var(--text-secondary)' }}>
              已提取 {toc.length} 个章节
            </span>
            <button type="button" onClick={handleCollect} className="btn-primary !text-[13px]">
              开始收藏
            </button>
          </div>
          <div
            className="max-h-[400px] overflow-y-auto rounded-[6px] border p-3"
            style={{ borderColor: 'var(--border-default)', background: 'var(--bg-secondary)' }}
          >
            {toc.map((entry, i) => (
              <div
                key={i}
                className="truncate py-1 text-[13px]"
                style={{ paddingLeft: 8 + entry.level * 16, color: 'var(--text-secondary)' }}
              >
                {entry.title}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty/toc not found */}
      {!toc.length && !extracting && !collecting && !result && url.trim() && (
        <p className="text-[13px]" style={{ color: 'var(--text-muted)' }}>
          输入链接后点击"提取目录"
        </p>
      )}
    </div>
  );
}
