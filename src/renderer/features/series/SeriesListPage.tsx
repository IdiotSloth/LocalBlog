import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth-store';

interface SeriesItem {
  seriesId: string;
  seriesName: string;
  count: number;
}

export function SeriesListPage() {
  const user = useAuthStore((s) => s.user);
  const [series, setSeries] = useState<SeriesItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadSeries = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const r = await window.api.blogSeriesList(user.id);
      if (r.success && r.data) setSeries(r.data);
    } catch (e) {
      console.error('[SeriesList]', e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadSeries();
  }, [loadSeries]);

  return (
    <div className="mx-auto max-w-[780px]">
      <h2 className="mb-6 text-[24px] font-semibold" style={{ color: 'var(--text-primary)' }}>
        系列{' '}
        <span className="text-[14px] font-normal" style={{ color: 'var(--text-secondary)' }}>
          {series.length} 个系列
        </span>
      </h2>

      {loading ? (
        <p className="py-12 text-center text-[14px]" style={{ color: 'var(--text-secondary)' }}>加载中...</p>
      ) : series.length === 0 ? (
        <div
          className="rounded-[6px] border border-dashed p-12 text-center"
          style={{ borderColor: 'var(--border-default)', background: 'var(--bg-secondary)' }}
        >
          <p className="text-[14px]" style={{ color: 'var(--text-secondary)' }}>
            暂无系列
          </p>
          <p className="mt-1 text-[12px]" style={{ color: 'var(--text-muted)' }}>
            在编辑器中为博客设置系列ID和系列名即可创建系列
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {series.map((s) => (
            <Link
              key={s.seriesId}
              to={`/series/${encodeURIComponent(s.seriesId)}`}
              className="card !p-5 !no-underline"
            >
              <h3
                className="mb-1 text-[15px] font-medium"
                style={{ color: 'var(--text-primary)' }}
              >
                {s.seriesName || s.seriesId}
              </h3>
              <p className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>
                {s.count} 篇
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
