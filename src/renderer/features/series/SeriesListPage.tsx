import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth-store';

interface SeriesItem {
  seriesId: string;
  seriesName: string;
  count: number;
}

const ACCENTS = [
  'var(--accent-blue)',
  'var(--accent-green)',
  'var(--accent-amber)',
  'var(--accent-red)',
] as const;

export function SeriesListPage() {
  const user = useAuthStore((s) => s.user);
  const [series, setSeries] = useState<SeriesItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSeries = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const r = await window.api.blogSeriesList(user.id);
      if (r.success && r.data) setSeries(r.data);
    } catch (e) {
      console.error('[SeriesList]', e);
      setError('加载失败');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadSeries();
  }, [loadSeries]);

  return (
    <div className="mx-auto max-w-[780px]">
      {/* Hero header */}
      <div className="mb-8">
        <p className="text-[12px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
          博客系列
        </p>
        <h2 className="mt-1 text-[28px] font-bold" style={{ color: 'var(--text-primary)' }}>
          系列
        </h2>
        <p className="mt-2 text-[14px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          将相关博客串联成系列，自动生成上一篇/下一篇导航。
          {series.length > 0 && <span> 共 {series.length} 个系列。</span>}
        </p>
      </div>

      {/* Error state */}
      {error && (
        <div style={{ color: 'var(--accent-red)', textAlign: 'center', padding: '3rem' }}>
          <p>{error}</p>
          <button
            onClick={() => { setError(null); loadSeries(); }}
            style={{ color: 'var(--accent-blue)', marginTop: 8, background: 'none', border: 'none', cursor: 'pointer', fontSize: 13 }}
          >
            重试
          </button>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <p className="py-12 text-center text-[14px]" style={{ color: 'var(--text-secondary)' }}>加载中...</p>
      )}

      {/* Empty state */}
      {!loading && !error && series.length === 0 && (
        <div
          className="rounded-[12px] border border-dashed p-12 text-center"
          style={{ borderColor: 'var(--border-default)', background: 'var(--bg-secondary)' }}
        >
          <p className="text-[15px]" style={{ color: 'var(--text-secondary)' }}>暂无系列</p>
          <p className="mt-2 text-[13px]" style={{ color: 'var(--text-muted)' }}>
            在编辑器中为博客设置系列ID和系列名即可创建系列
          </p>
        </div>
      )}

      {/* Series cards */}
      {!loading && !error && series.length > 0 && (
        <div className="space-y-3">
          {series.map((s, idx) => {
            const accent = ACCENTS[idx % ACCENTS.length];
            return (
              <Link
                key={s.seriesId}
                to={`/series/${encodeURIComponent(s.seriesId)}`}
                className="group flex items-center gap-5 rounded-[10px] border p-5 no-underline transition-all duration-[0.15s] hover:-translate-y-0.5 hover:border-[var(--accent-blue)]"
                style={{ borderColor: 'var(--border-default)', background: 'var(--bg-secondary)' }}
              >
                {/* Color bar */}
                <div
                  className="h-14 w-1 shrink-0 rounded-full"
                  style={{ background: accent }}
                />
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <h3
                    className="truncate text-[16px] font-semibold transition-colors group-hover:text-[var(--accent-blue)]"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {s.seriesName || s.seriesId}
                  </h3>
                  <p className="mt-0.5 text-[13px]" style={{ color: 'var(--text-secondary)' }}>
                    {s.count} 篇文章
                  </p>
                </div>
                {/* Arrow */}
                <span
                  className="shrink-0 text-[16px] opacity-0 transition-all group-hover:opacity-100 group-hover:translate-x-1"
                  style={{ color: 'var(--text-muted)' }}
                >
                  →
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
