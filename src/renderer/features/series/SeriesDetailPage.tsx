import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { formatDate } from '../../lib/utils';
import { useAuthStore } from '../../stores/auth-store';
import { BlogCard } from '../../components/blog/BlogCard';
import { useContextPanel, type TabDef } from '../../components/layout/ContextPanel';

const CIRCLE_NUMS = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩',
  '⑪', '⑫', '⑬', '⑭', '⑮', '⑯', '⑰', '⑱', '⑲', '⑳'];

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
  const contextPanel = useContextPanel();
  const [readIds, setReadIds] = useState<Set<number>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem(`series_read_${seriesId}`) || '[]')); }
    catch { return new Set<number>(); }
  });

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

  // T2306: ContextPanel with reading progress
  useEffect(() => {
    if (!seriesId) return;
    const tabs: TabDef[] = [
      {
        id: 'progress',
        label: '阅读进度',
        content: (
          <div className="p-2 text-[13px] space-y-2" style={{ color: 'var(--text-secondary)' }}>
            <p style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{seriesName || decodeURIComponent(seriesId)}</p>
            <p>{readIds.size} / {blogs.length} 篇已读</p>
            {blogs.length > 0 && (
              <div className="h-1 rounded-full" style={{ background: 'var(--bg-tertiary)' }}>
                <div className="h-1 rounded-full transition-all" style={{
                  width: `${blogs.length > 0 ? (readIds.size / blogs.length) * 100 : 0}%`,
                  background: 'var(--accent-blue)',
                }} />
              </div>
            )}
            {readIds.size < blogs.length && (
              <button type="button" onClick={() => {
                const all = new Set(blogs.map(b => b.id));
                setReadIds(all);
                localStorage.setItem(`series_read_${seriesId}`, JSON.stringify([...all]));
              }}
                className="text-[12px] hover:underline" style={{ color: 'var(--accent-blue)', background: 'none', border: 'none', cursor: 'pointer' }}>
                标记全部已读
              </button>
            )}
          </div>
        ),
      },
    ];
    return contextPanel.registerTabs(tabs);
  }, [seriesId, contextPanel, seriesName, readIds, blogs]);

  // Mark blog as read on click
  const markRead = (blogId: number) => {
    const next = new Set(readIds);
    next.add(blogId);
    setReadIds(next);
    localStorage.setItem(`series_read_${seriesId}`, JSON.stringify([...next]));
  };

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
        <>
          <div className="space-y-3">
            {blogs.map((blog, i) => (
              <div key={blog.id} className="flex items-start gap-3">
                <span className="shrink-0 w-6 text-center text-[14px] pt-3" style={{ color: 'var(--accent-blue)' }}>
                  {CIRCLE_NUMS[i] || i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <BlogCard
                    blog={{ id: blog.id, title: blog.title, format: blog.format, status: blog.status, createdAt: blog.createdAt, updatedAt: blog.updatedAt, tags: [] } as any}
                    showExcerpt={false}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* T2306: Bottom navigation bar */}
          <div className="mt-6 flex items-center justify-between border-t pt-4" style={{ borderColor: 'var(--border-default)' }}>
            <Link to="/series" className="text-[13px] hover:underline" style={{ color: 'var(--accent-blue)' }}>
              ← 回目录
            </Link>
            <span className="text-[13px]" style={{ color: 'var(--text-muted)' }}>
              {blogs.length} 篇文章
            </span>
            <Link to="/series" className="text-[13px] hover:underline" style={{ color: 'var(--accent-blue)' }}>
              所有系列 →
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
