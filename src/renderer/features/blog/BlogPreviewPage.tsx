import { lazy, useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ReadingTime } from '../../components/blog/ReadingTime';
import { SeriesNav } from '../../components/blog/SeriesNav';
import { TableOfContents } from '../../components/blog/TableOfContents';
import { recordRecentBlog } from '../../hooks/useRecentHistory';
import { countChars, estimateReadingTime, parseToc } from '../../lib/toc-parser';
import { formatDate } from '../../lib/utils';
import { useAuthStore } from '../../stores/auth-store';
import type { BlogWithTags, Tag } from '../../../shared/types';

const BlogEditorPage = lazy(() => import('./BlogEditorPage').then((m) => ({ default: m.BlogEditorPage })));

function RelatedResources({ blogId }: { blogId: number }) {
  const [refs, setRefs] = useState<any[]>([]); // TODO: define Reference type in shared/types.ts
  useEffect(() => {
    window.api.refGetFrom({ sourceType: 'blog', sourceId: blogId }).then((r) => {
      if (r.success && r.data) setRefs(r.data.filter((ref: any) => ref.target_type === 'knowledge'));
    });
  }, [blogId]);
  if (refs.length === 0) return null;
  return (
    <div
      className="mt-8 rounded-[6px] border p-4"
      style={{ borderColor: 'var(--border-default)', background: 'var(--bg-secondary)' }}
    >
      <h3 className="mb-3 text-[14px] font-medium" style={{ color: 'var(--text-primary)' }}>
        📁 关联的知识库文件 ({refs.length})
      </h3>
      <div className="space-y-1">
        {refs.map((ref: any) => (
          <span
            key={ref.id}
            className="inline-block mr-2 mb-1 rounded-[4px] border px-2 py-1 text-[13px]"
            style={{ borderColor: 'var(--border-default)', background: 'var(--bg-primary)' }}
          >
            📄 {ref.title || `文件 #${ref.target_id}`}
          </span>
        ))}
      </div>
    </div>
  );
}
import DOMPurify from 'dompurify';
import MarkdownIt from 'markdown-it';

const md = new MarkdownIt({ html: false, linkify: true, typographer: true });
// Generate heading ids for TOC scrollIntoView + IntersectionObserver
md.renderer.rules.heading_open = (tokens, idx) => {
  const token = tokens[idx];
  if (!token) return '';
  const text = tokens[idx + 1]?.content || '';
  const id = text.toLowerCase().replace(/[^a-z0-9一-鿿]+/g, '-').replace(/^-+|-+$/g, '');
  token.attrSet('id', id);
  return `<${token.tag}${token.attrs ? ' ' + token.attrs.map(([k, v]) => `${k}="${v}"`).join(' ') : ''}>`;
};

const READING_THEMES: Record<string, { name: string; bg: string; text: string; accent: string; font: string }> = {
  paper: { name: '纸张', bg: '#f8f5ef', text: '#2c2c2c', accent: '#c0392b', font: '"Noto Serif SC", Georgia, serif' },
  midnight: { name: '午夜', bg: '#0d1117', text: '#c9d1d9', accent: '#58a6ff', font: '"JetBrains Mono", monospace' },
  sepia: { name: '复古', bg: '#f4ecd8', text: '#5b4636', accent: '#8b6914', font: '"Lora", Georgia, serif' },
  forest: { name: '森林', bg: '#1a2f1a', text: '#d4e6d4', accent: '#4caf50', font: '"Source Serif 4", Georgia, serif' },
  sakura: { name: '樱花', bg: '#fff5f5', text: '#4a3040', accent: '#e91e63', font: '"Noto Serif SC", serif' },
};

export function BlogPreviewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const user = useAuthStore((s) => s.user);
  const [blog, setBlog] = useState<BlogWithTags | null>(null);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [readingTheme, setReadingTheme] = useState<string>(localStorage.getItem('reading-theme') || 'paper');
  const isEditMode = searchParams.get('mode') === 'edit';
  const scrollContainerRef = useCallback((el: HTMLDivElement | null) => {
    if (!el || !id) return;
    const savedPct = sessionStorage.getItem(`blog-scroll-ratio-${id}`);
    if (savedPct) {
      const pct = Number(savedPct);
      if (pct > 0) el.scrollTop = pct * el.scrollHeight;
      sessionStorage.removeItem(`blog-scroll-ratio-${id}`);
    }
  }, [id]);

  // T1705: Scroll to top on blog navigation
  useEffect(() => {
    window.scrollTo(0, 0);
    const mainEl = document.querySelector('main');
    if (mainEl) mainEl.scrollTop = 0;
  }, [id]);

  useEffect(() => {
    if (id && user)
      window.api.blogGet(Number(id)).then((r) => {
        if (r.success && r.data) {
          setBlog(r.data);
          // T1917: Record recent blog visit
          recordRecentBlog(r.data.id, r.data.title);
          // Restore saved scroll position
          const saved = localStorage.getItem(`blog-progress-${id}`);
          if (saved) {
            const pct = Number(saved);
            if (pct > 0) {
              requestAnimationFrame(() => {
                const total = document.documentElement.scrollHeight - document.documentElement.clientHeight;
                window.scrollTo(0, (total * pct) / 100);
              });
            }
          }
        }
        setLoading(false);
      });
  }, [id, user]);

  // Save progress on unmount via localStorage
  useEffect(() => {
    return () => {
      if (id && progress > 0) {
        localStorage.setItem(`blog-progress-${id}`, String(Math.round(progress)));
      }
    };
  }, [id, progress]);
  const handleScroll = useCallback(() => {
    const h = document.documentElement;
    const total = h.scrollHeight - h.clientHeight;
    setProgress(total > 0 ? Math.min((h.scrollTop / total) * 100, 100) : 0);
  }, []);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  if (loading)
    return (
      <div className="flex h-64 items-center justify-center text-[14px]" style={{ color: 'var(--text-secondary)' }}>
        加载中...
      </div>
    );
  if (!blog)
    return (
      <div className="flex h-64 items-center justify-center text-[14px]" style={{ color: 'var(--accent-red)' }}>
        博客不存在
      </div>
    );

  // T1601: Edit mode — render BlogEditorPage inline at same route
  if (isEditMode) {
    return (
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto">
        <BlogEditorPage />
      </div>
    );
  }

  const rendered = blog.format === 'md' ? md.render(blog.content) : blog.content;
  const tocItems = parseToc(blog.content, blog.format);
  const readingMinutes = estimateReadingTime(blog.content);
  const charTotal = countChars(blog.content);
  const theme = READING_THEMES[readingTheme as keyof typeof READING_THEMES]! ?? READING_THEMES.paper;

  const handleThemeChange = (key: string) => {
    setReadingTheme(key);
    localStorage.setItem('reading-theme', key);
  };

  return (
    <>
      {/* Reading progress bar */}
      <div
        className="fixed top-0 left-0 z-50"
        style={{
          height: 2,
          width: `${progress}%`,
          background: 'var(--accent-blue)',
          transition: 'width 0.1s linear',
        }}
      />

      <div style={{ maxWidth: 'var(--content-max)', margin: '0 auto', position: 'relative' }}>
        <div className="mb-4 flex items-center justify-between">
          <Link
            to="/blog"
            className="mb-0 inline-flex items-center gap-1 text-[14px] no-underline hover:underline transition-colors duration-[0.15s]"
            style={{ color: 'var(--text-secondary)' }}
          >
            ← 返回列表
          </Link>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                const el = document.querySelector('main');
                if (el) {
                  const ratio = el.scrollTop / (el.scrollHeight - el.clientHeight || 1);
                  sessionStorage.setItem(`blog-scroll-ratio-${id}`, String(Math.min(1, Math.max(0, ratio))));
                }
                setSearchParams({ mode: 'edit' }, { replace: true });
              }}
              className="btn-primary !text-[13px] !px-3 !py-1"
            >
              编辑
            </button>
            <div className="flex gap-1">
            {Object.entries(READING_THEMES).map(([key, t]) => (
              <button
                key={key}
                type="button"
                onClick={() => handleThemeChange(key)}
                className="rounded-[3px] px-2 py-0.5 text-[11px] transition-opacity"
                style={{
                  background: readingTheme === key ? 'var(--bg-tertiary)' : 'transparent',
                  color: 'var(--text-secondary)',
                  opacity: readingTheme === key ? 1 : 0.6,
                }}
                title={t.name}
              >
                {t.name === '纸张'
                  ? '纸'
                  : t.name === '午夜'
                    ? '夜'
                    : t.name === '复古'
                      ? '古'
                      : t.name === '森林'
                        ? '森'
                        : '樱'}
              </button>
            ))}
            </div>
          </div>
        </div>

        <article
          className="mt-4 rounded-[8px] p-6 transition-colors duration-500"
          style={{
            background: theme.bg,
            color: theme.text,
            fontFamily: theme.font,
          }}
          onClick={(e) => {
            const target = e.target as HTMLElement;
            const anchor = target.closest('a');
            if (!anchor) return;
            const href = anchor.getAttribute('href');
            if (!href) return;

            // Block dangerous protocols
            if (href.startsWith('javascript:') || href.startsWith('data:')) {
              e.preventDefault();
              return;
            }

            // Allow anchor links (#section-id) to use default browser behavior
            if (href.startsWith('#')) return;

            // Internal route navigation
            if (href.startsWith('/blog/') || href.startsWith('/knowledge/')) {
              e.preventDefault();
              navigate(href);
              return;
            }

            // External links — open via shell
            if (href.startsWith('http://') || href.startsWith('https://')) {
              e.preventDefault();
              window.api.shellOpenExternal(href);
              return;
            }

            // For any other link, let default behavior handle it
          }}
        >
          <h1 className="mb-3" style={{ color: theme.text }}>
            {blog.title}
          </h1>

          <div
            className="mb-6 flex flex-wrap items-center gap-3 text-[14px]"
            style={{ color: 'var(--text-secondary)' }}
          >
            <span>{formatDate(blog.createdAt)}</span>
            {blog.createdAt !== blog.updatedAt && <span>· 更新于 {formatDate(blog.updatedAt)}</span>}
            <span
              className="rounded-[3px] px-1.5 py-0.5 font-mono text-[11px] uppercase"
              style={{ background: 'var(--bg-tertiary)' }}
            >
              {blog.format}
            </span>
          </div>

          <div className="mb-6">
            <ReadingTime minutes={readingMinutes} charCount={charTotal} />
          </div>

          {blog.tags?.length > 0 && (
            <div className="mb-8 flex flex-wrap gap-2">
              {blog.tags.map((t: Tag) => (
                <button
                  key={t.id}
                  type="button"
                  className="tag cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => navigate(`/blog?tagId=${t.id}&tagName=${encodeURIComponent(t.name)}`)}
                  title={`查看标签: ${t.name}`}
                >
                  {t.name}
                </button>
              ))}
            </div>
          )}

          <div className="prose" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(rendered) }} />
        </article>

        {user && blog.seriesId && (
          <SeriesNav userId={user.id} seriesId={blog.seriesId} seriesName={blog.seriesName} currentBlogId={blog.id} />
        )}

        {user && <RelatedResources blogId={blog.id} />}

        <div className="mt-12 border-t pt-6 flex gap-3" style={{ borderColor: 'var(--border-default)' }}>
          <button
            type="button"
            onClick={() => {
              // Save scroll ratio before switching to edit mode
              const el = document.querySelector('main');
              if (el) {
                const ratio = el.scrollTop / (el.scrollHeight - el.clientHeight || 1);
                sessionStorage.setItem(`blog-scroll-ratio-${id}`, String(Math.min(1, Math.max(0, ratio))));
              }
              setSearchParams({ mode: 'edit' }, { replace: true });
            }}
            className="btn-primary inline-flex items-center gap-2"
          >
            编辑此文章
          </button>
          <button
            type="button"
            onClick={async () => {
              const r = await window.api.blogExportPdf(Number(id));
              if (!r.success && r.error !== '已取消') alert(r.error || '导出失败');
            }}
            className="btn-primary inline-flex items-center gap-2"
            style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
          >
            导出 PDF
          </button>
        </div>
      </div>

      <TableOfContents items={tocItems} />
    </>
  );
}
