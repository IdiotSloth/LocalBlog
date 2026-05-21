import { Link } from 'react-router-dom';
import { FileEdit, Link2 } from 'lucide-react';
import { countChars, estimateReadingTime } from '../../lib/toc-parser';
import { formatDate } from '../../lib/utils';
import type { BlogWithTags } from '../../../shared/types';

interface Props {
  blog: BlogWithTags & { content?: string };
  showExcerpt?: boolean;
  showRefCount?: boolean;
  onClick?: () => void;
  isBatchSelected?: boolean;
  onBatchToggle?: () => void;
  children?: React.ReactNode;
}

const COLOR_MAP: Record<string, string> = {
  blue: 'var(--accent-blue)', green: 'var(--accent-green)', red: 'var(--accent-red)',
  amber: 'var(--accent-yellow)', purple: 'var(--text-secondary)', gray: 'var(--text-muted)',
};

export function BlogCard({ blog, showExcerpt = true, showRefCount = true, onClick, isBatchSelected, onBatchToggle, children }: Props) {
  const timeAgo = formatDate(blog.updatedAt);
  const excerpt = (blog as any).content?.replace(/<[^>]+>/g, '').slice(0, 150) || '';
  const readingMin = estimateReadingTime((blog as any).content || '');

  return (
    <article className="card group cursor-pointer relative" onClick={onClick} title={blog.title || ''}>
      {isBatchSelected !== undefined && (
        <input
          type="checkbox"
          checked={isBatchSelected}
          onChange={onBatchToggle}
          className="absolute top-3 left-3 z-10"
          aria-label={`选择 ${blog.title || '无标题'}`}
          onClick={(e) => e.stopPropagation()}
        />
      )}
      <Link to={`/blog/${blog.id}`} className="blog-card-title no-underline hover:underline" style={{ color: 'var(--text-primary)' }}>
        {blog.isPinned ? <span className="mr-1.5" title="已置顶">📌</span> : null}
        {blog.color ? (
          <span className="inline-block w-2.5 h-2.5 rounded-full mr-1.5 align-middle"
            style={{ background: COLOR_MAP[blog.color] || 'var(--accent-blue)' }} />
        ) : null}
        {blog.title || '无标题'}
      </Link>

      <div className="blog-card-meta">
        <span>{timeAgo}</span>
        {readingMin > 0 && <><span className="mx-1">·</span><span>{readingMin} 分钟阅读</span></>}
        <span className="mx-1">·</span>
        <span className="rounded-[3px] px-1.5 py-0.5 font-mono text-[10px] uppercase"
          style={{ background: 'var(--bg-tertiary)' }}>{blog.format}</span>
      </div>

      {/* Excerpt — line-clamp-3, secondary color */}
      {showExcerpt && excerpt && (
        <p className="blog-card-excerpt">{excerpt}</p>
      )}

      {/* Footer — tags + ref count */}
      <div className="blog-card-footer">
        {blog.tags && blog.tags.length > 0 && (
          <span className="flex items-center gap-1">
            <Link2 size={10} />
            {blog.tags.slice(0, 4).map((t: any) => (
              <Link key={t.id} to={`/blog?tagId=${t.id}&tagName=${encodeURIComponent(t.name)}`}
                className="no-underline rounded-[3px] px-1.5 py-0.5 text-[11px] hover:opacity-80"
                style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
                onClick={(e) => e.stopPropagation()}>
                {t.name}
              </Link>
            ))}
            {blog.tags.length > 4 && <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>+{blog.tags.length - 4}</span>}
          </span>
        )}
        {showRefCount && (blog as any).refCount > 0 && (
          <span className="flex items-center gap-1 text-[11px]" style={{ color: 'var(--text-muted)' }}>
            <Link2 size={10} />
            {(blog as any).refCount}
          </span>
        )}
        {children && <div className="flex-1" />}
      </div>

      {/* Extra footer content (folder move, delete, etc.) */}
      {children}
    </article>
  );
}
