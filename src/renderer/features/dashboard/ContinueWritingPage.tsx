import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth-store';

interface DraftItem {
  id: number;
  blogId: number;
  blogTitle: string;
  content: string;
  savedAt: string;
}

interface RecentBlog {
  id: number;
  title: string;
  updatedAt: string;
}

interface KnowledgeItem {
  id: number;
  filename: string;
  createdAt: string;
}

export function ContinueWritingPage() {
  const user = useAuthStore((s) => s.user);
  const [drafts, setDrafts] = useState<DraftItem[]>([]);
  const [draftsLoading, setDraftsLoading] = useState(true);
  const [draftsError, setDraftsError] = useState<string | null>(null);
  const [lastBlog, setLastBlog] = useState<RecentBlog | null>(null);
  const [lastBlogLoading, setLastBlogLoading] = useState(true);
  const [lastBlogError, setLastBlogError] = useState<string | null>(null);
  const [recentFiles, setRecentFiles] = useState<KnowledgeItem[]>([]);
  const [recentFilesLoading, setRecentFilesLoading] = useState(true);
  const [recentFilesError, setRecentFilesError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    setDraftsLoading(true);
    setDraftsError(null);
    window.api
      .continueGetDrafts(user.id)
      .then((r) => { if (r.success && r.data) setDrafts(r.data as DraftItem[]); })
      .catch((e) => { console.error('[Continue] Failed to get drafts:', e); setDraftsError('加载草稿失败'); })
      .finally(() => setDraftsLoading(false));

    setLastBlogLoading(true);
    setLastBlogError(null);
    window.api
      .continueGetLastBlog(user.id)
      .then((r) => { if (r.success && r.data) setLastBlog(r.data as RecentBlog); })
      .catch((e) => { console.error('[Continue] Failed to get last blog:', e); setLastBlogError('加载上次停留失败'); })
      .finally(() => setLastBlogLoading(false));

    setRecentFilesLoading(true);
    setRecentFilesError(null);
    window.api
      .continueGetRecentFiles(user.id)
      .then((r) => { if (r.success && r.data) setRecentFiles(r.data as KnowledgeItem[]); })
      .catch((e) => { console.error('[Continue] Failed to get recent files:', e); setRecentFilesError('加载最近素材失败'); })
      .finally(() => setRecentFilesLoading(false));
  }, [user]);

  return (
    <div style={{ maxWidth: 'var(--content-max)', margin: '0 auto' }}>
      <h1
        className="mb-8 text-[24px] font-bold"
        style={{ color: 'var(--text-primary)' }}
      >
        续写与回顾
      </h1>

      {/* Zone 1: Recent Drafts */}
      <section className="mb-8">
        <h3
          className="mb-3 text-[12px] font-semibold uppercase tracking-wider"
          style={{ color: 'var(--text-secondary)' }}
        >
          最近草稿
        </h3>
        {draftsLoading ? (
          <div className="flex justify-center py-8" style={{ color: 'var(--text-secondary)' }}>加载中...</div>
        ) : draftsError ? (
          <div className="flex justify-center py-8" style={{ color: 'var(--accent-red)' }}>加载失败，请刷新重试</div>
        ) : drafts.length === 0 ? (
          <p className="text-[13px]" style={{ color: 'var(--text-muted)' }}>
            暂无草稿，新建博客后 30 秒自动保存草稿
          </p>
        ) : (
          <div className="grid gap-3">
            {drafts.slice(0, 3).map((d) => (
              <Link
                key={d.id}
                to={`/blog/${d.blogId}/edit`}
                className="no-underline rounded-[8px] border p-4 transition-shadow hover:shadow-md"
                style={{ borderColor: 'var(--border-default)', background: 'var(--color-bg-card)' }}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div
                      className="text-[14px] font-medium truncate"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {d.blogTitle}
                    </div>
                    <div
                      className="mt-1 text-[12px] line-clamp-2"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      {d.content?.substring(0, 150) || '(空)'}
                    </div>
                    <div className="mt-1.5 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                      {new Date(d.savedAt).toLocaleDateString('zh-CN')}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Zone 2: Last Visited */}
      <section className="mb-8">
        <h3
          className="mb-3 text-[12px] font-semibold uppercase tracking-wider"
          style={{ color: 'var(--text-secondary)' }}
        >
          上次停留
        </h3>
        {lastBlogLoading ? (
          <div className="flex justify-center py-8" style={{ color: 'var(--text-secondary)' }}>加载中...</div>
        ) : lastBlogError ? (
          <div className="flex justify-center py-8" style={{ color: 'var(--accent-red)' }}>加载失败，请刷新重试</div>
        ) : lastBlog ? (
          <Link
            to={`/blog/${lastBlog.id}`}
            className="no-underline flex items-center gap-4 rounded-[8px] border p-5 transition-shadow hover:shadow-md"
            style={{ borderColor: 'var(--border-default)', background: 'var(--color-bg-card)' }}
          >
            <span className="text-2xl shrink-0">📖</span>
            <div className="min-w-0">
              <div
                className="text-[15px] font-medium truncate"
                style={{ color: 'var(--text-primary)' }}
              >
                {lastBlog.title}
              </div>
              <div className="mt-0.5 text-[12px]" style={{ color: 'var(--text-secondary)' }}>
                {new Date(lastBlog.updatedAt).toLocaleDateString('zh-CN')}
              </div>
            </div>
          </Link>
        ) : (
          <p className="text-[13px]" style={{ color: 'var(--text-muted)' }}>
            还没有写过博客，去写第一篇吧
          </p>
        )}
      </section>

      {/* Zone 3: Recent Knowledge Files */}
      <section className="mb-8">
        <h3
          className="mb-3 text-[12px] font-semibold uppercase tracking-wider"
          style={{ color: 'var(--text-secondary)' }}
        >
          最近素材
        </h3>
        {recentFilesLoading ? (
          <div className="flex justify-center py-8" style={{ color: 'var(--text-secondary)' }}>加载中...</div>
        ) : recentFilesError ? (
          <div className="flex justify-center py-8" style={{ color: 'var(--accent-red)' }}>加载失败，请刷新重试</div>
        ) : recentFiles.length === 0 ? (
          <p className="text-[13px]" style={{ color: 'var(--text-muted)' }}>
            知识库为空，导入文件后在此显示
          </p>
        ) : (
          <div
            className="flex gap-3 overflow-x-auto pb-2"
            style={{ scrollbarWidth: 'thin' }}
          >
            {recentFiles.map((f) => (
              <Link
                key={f.id}
                to="/knowledge"
                className="no-underline shrink-0 rounded-[8px] border p-4 transition-shadow hover:shadow-md"
                style={{
                  width: 180,
                  borderColor: 'var(--border-default)',
                  background: 'var(--color-bg-card)',
                }}
              >
                <div
                  className="text-[13px] font-medium truncate"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {f.filename}
                </div>
                <div className="mt-1 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                  {new Date(f.createdAt).toLocaleDateString('zh-CN')}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Bottom navigation */}
      <div className="mt-8 flex gap-3">
        <Link
          to="/blog"
          className="no-underline rounded-[6px] px-5 py-2.5 text-[14px] font-medium text-white transition-opacity hover:opacity-85"
          style={{ background: 'var(--color-primary)' }}
        >
          全部博客
        </Link>
        <Link
          to="/dashboard"
          className="no-underline rounded-[6px] px-5 py-2.5 text-[14px] font-medium transition-opacity hover:opacity-85"
          style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
        >
          仪表盘
        </Link>
      </div>
    </div>
  );
}
