import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

interface SeriesBlog {
  id: number;
  title: string;
}

interface Props {
  userId: number;
  seriesId: string;
  seriesName: string;
  currentBlogId: number;
}

export function SeriesNav({ userId, seriesId, seriesName, currentBlogId }: Props) {
  const [blogs, setBlogs] = useState<SeriesBlog[]>([]);

  useEffect(() => {
    window.api.blogSeriesGet(seriesId).then((d: unknown) => {
      const r = d as any;
      if (r.success && r.data) setBlogs(r.data);
    });
  }, [seriesId]);

  const idx = blogs.findIndex((b) => b.id === currentBlogId);
  const prev = idx > 0 ? blogs[idx - 1] : null;
  const next = idx < blogs.length - 1 ? blogs[idx + 1] : null;

  return (
    <div
      className="mt-8 rounded-[6px] border p-4"
      style={{ borderColor: 'var(--border-default)', background: 'var(--bg-secondary)' }}
    >
      <div className="mb-3 flex items-center gap-2">
        <span className="text-[11px] uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
          系列
        </span>
        <span className="text-[14px] font-medium" style={{ color: 'var(--text-primary)' }}>
          {seriesName}{' '}
          <span className="font-normal text-[12px]" style={{ color: 'var(--text-secondary)' }}>
            ({idx + 1}/{blogs.length})
          </span>
        </span>
      </div>
      <div className="flex items-center justify-between gap-4">
        {prev ? (
          <Link
            to={`/blog/${prev.id}`}
            className="text-[13px] no-underline hover:underline transition-colors"
            style={{ color: 'var(--accent-blue)' }}
          >
            ← {prev.title}
          </Link>
        ) : (
          <span className="text-[13px] opacity-30" style={{ color: 'var(--text-secondary)' }}>
            ← 已是第一篇
          </span>
        )}
        {next ? (
          <Link
            to={`/blog/${next.id}`}
            className="text-[13px] no-underline hover:underline transition-colors text-right"
            style={{ color: 'var(--accent-blue)' }}
          >
            {next.title} →
          </Link>
        ) : (
          <span className="text-[13px] opacity-30 text-right" style={{ color: 'var(--text-secondary)' }}>
            已是最后一篇 →
          </span>
        )}
      </div>
    </div>
  );
}
