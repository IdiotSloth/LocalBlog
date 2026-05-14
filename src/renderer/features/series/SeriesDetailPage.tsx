import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { formatDate } from '../../lib/utils';
import { useAuthStore } from '../../stores/auth-store';

interface Blog {
  id: number;
  userId: number;
  title: string;
  format: string;
  status: string;
  seriesId?: string;
  seriesName?: string;
  createdAt: string;
  updatedAt: string;
}

export function SeriesDetailPage() {
  const { seriesId } = useParams<{ seriesId: string }>();
  const user = useAuthStore((s) => s.user);
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(true);
  const [seriesName, setSeriesName] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const loadBlogs = useCallback(async () => {
    if (!seriesId) return;
    setLoading(true);
    try {
      const r = await window.api.blogSeriesGet(seriesId);
      if (r.success && r.data) {
        const list = r.data as Blog[];
        setBlogs(list);
        if (list.length > 0) {
          const first = list[0];
          if (first?.seriesName) setSeriesName(first.seriesName);
        }
      }
    } catch (e) {
      console.error('[SeriesDetail]', e);
    } finally {
      setLoading(false);
    }
  }, [seriesId]);

  const handleRename = useCallback(async () => {
    const trimmed = editName.trim();
    if (!trimmed || trimmed === seriesName || !user || !seriesId) {
      setIsEditing(false);
      return;
    }
    try {
      const r = await window.api.blogSeriesRename({ seriesId, newName: trimmed, userId: user.id });
      if (r.success) {
        setSeriesName(trimmed);
        alert('系列名已更新');
      } else {
        alert(r.error || '重命名失败');
      }
    } catch (e) {
      alert('重命名失败');
    } finally {
      setIsEditing(false);
    }
  }, [editName, seriesName, user, seriesId]);

  const startEditing = useCallback(() => {
    setEditName(seriesName || decodeURIComponent(seriesId || ''));
    setIsEditing(true);
  }, [seriesName, seriesId]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  useEffect(() => {
    loadBlogs();
  }, [loadBlogs]);

  return (
    <div className="mx-auto max-w-[780px]">
      {/* Breadcrumb back to series list */}
      <div className="mb-2 text-[13px]">
        <Link
          to="/series"
          className="hover:underline transition-colors"
          style={{ color: 'var(--accent-blue)' }}
        >
          ← 系列
        </Link>
        <span className="mx-1" style={{ color: 'var(--text-muted)' }}>›</span>
        <span style={{ color: 'var(--text-primary)' }}>{seriesName || decodeURIComponent(seriesId || '')}</span>
      </div>

      <div className="mb-6 flex items-center gap-2">
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleRename();
              if (e.key === 'Escape') setIsEditing(false);
            }}
            onBlur={handleRename}
            className="surface-input px-2 py-1 text-[20px] font-semibold"
            style={{ color: 'var(--text-primary)', maxWidth: 400 }}
            title="输入新系列名称"
            placeholder="系列名称"
          />
        ) : (
          <h2 className="text-[24px] font-semibold" style={{ color: 'var(--text-primary)' }}>
            {seriesName || decodeURIComponent(seriesId || '')}
          </h2>
        )}
        {!isEditing && (
          <button
            type="button"
            onClick={startEditing}
            className="text-[16px] opacity-50 hover:opacity-100 transition-opacity cursor-pointer"
            style={{ color: 'var(--text-secondary)' }}
            title="重命名系列"
          >
            ✏️
          </button>
        )}
        <span className="text-[14px] font-normal" style={{ color: 'var(--text-secondary)' }}>
          {blogs.length} 篇
        </span>
      </div>

      {loading ? (
        <p className="py-12 text-center text-[14px]" style={{ color: 'var(--text-secondary)' }}>加载中...</p>
      ) : blogs.length === 0 ? (
        <div
          className="rounded-[6px] border border-dashed p-12 text-center"
          style={{ borderColor: 'var(--border-default)', background: 'var(--bg-secondary)' }}
        >
          <p className="text-[14px]" style={{ color: 'var(--text-secondary)' }}>该系列暂无文章</p>
        </div>
      ) : (
        <div className="space-y-2">
          {blogs.map((blog, i) => (
            <Link
              key={blog.id}
              to={`/blog/${blog.id}`}
              className="card flex items-center justify-between !p-4 !no-underline"
            >
              <div className="flex items-center gap-3">
                <span
                  className="text-[12px] font-mono shrink-0 w-6 text-right"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {i + 1}
                </span>
                <span className="text-[14px]" style={{ color: 'var(--text-primary)' }}>
                  {blog.title}
                </span>
              </div>
              <span className="text-[12px] shrink-0" style={{ color: 'var(--text-muted)' }}>
                {formatDate(blog.createdAt)}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
