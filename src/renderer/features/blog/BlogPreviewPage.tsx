import { lazy, useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ReadingTime } from '../../components/blog/ReadingTime';
import { SeriesNav } from '../../components/blog/SeriesNav';
import { addTab } from '../../components/blog/floating-tabs-state';
import { useContextPanel, type TabDef } from '../../components/layout/ContextPanel';
import { recordRecentBlog } from '../../hooks/useRecentHistory';
import { countChars, estimateReadingTime } from '../../lib/toc-parser';
import { formatDate } from '../../lib/utils';
import { useAuthStore } from '../../stores/auth-store';
import type { BlogWithTags, Reference, Tag } from '../../../shared/types';

const BlogEditorPage = lazy(() => import('./BlogEditorPage').then((m) => ({ default: m.BlogEditorPage })));

function RelatedResources({ blogId }: { blogId: number }) {
  const [refs, setRefs] = useState<Reference[]>([]);
  useEffect(() => {
    window.api.refGetFrom({ sourceType: 'blog', sourceId: blogId }).then((r) => {
      if (r.success && r.data) setRefs(r.data.filter((ref: Reference) => ref.targetType === 'knowledge'));
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
        {refs.map((ref: Reference) => (
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

// ---- T2007/T2008 ContextPanel tab components ----

function parseTocHeadings(content: string, format: string): Array<{ level: number; text: string; id: string }> {
  const result: Array<{ level: number; text: string; id: string }> = [];
  const headingRe = format === 'md' ? /^(#{2,4})\s+(.+)$/gm : /<h([234])[^>]*>(.+?)<\/h[234]>/gi;

  if (format === 'md') {
    let m;
    while ((m = headingRe.exec(content)) !== null) {
      const level = m[1]!.length;
      const text = m[2]!;
      const id = text.toLowerCase().replace(/[^a-z0-9一-鿿]+/g, '-').replace(/^-+|-+$/g, '');
      result.push({ level, text, id });
    }
  }
  return result;
}

function ContextLinksTab({ blogId }: { blogId: number }) {
  const [backlinks, setBacklinks] = useState<Reference[]>([]);
  const [forwardRefs, setForwardRefs] = useState<Reference[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      window.api.refGetTo({ targetType: 'blog', targetId: blogId }),
      window.api.refGetFrom({ sourceType: 'blog', sourceId: blogId }),
    ]).then(([b, f]) => {
      if (b.success && b.data) setBacklinks(b.data);
      if (f.success && f.data) setForwardRefs(f.data);
    }).finally(() => setLoading(false));
  }, [blogId]);

  if (loading) return <p className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>加载中...</p>;

  const allBacklinks = backlinks.filter((r) => r.targetId === blogId);
  const allForward = forwardRefs;

  return (
    <div className="space-y-4">
      {allBacklinks.length > 0 && (
        <div>
          <h4 className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>反向链接 ({allBacklinks.length})</h4>
          <div className="space-y-1">
            {allBacklinks.map((ref) => (
              <a key={ref.id} href={`#/${ref.sourceType}/${ref.sourceId}`}
                className="block rounded-[4px] px-2 py-1.5 text-[12px] no-underline hover:bg-[var(--bg-tertiary)] transition-colors"
                style={{ color: 'var(--text-primary)' }}>
                {ref.sourceTitle || `${ref.sourceType} #${ref.sourceId}`}
              </a>
            ))}
          </div>
        </div>
      )}
      {allForward.length > 0 && (
        <div>
          <h4 className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>引用 ({allForward.length})</h4>
          <div className="space-y-1">
            {allForward.map((ref) => (
              <a key={ref.id} href={`#/${ref.targetType}/${ref.targetId}`}
                className="block rounded-[4px] px-2 py-1.5 text-[12px] no-underline hover:bg-[var(--bg-tertiary)] transition-colors"
                style={{ color: 'var(--text-primary)' }}>
                {ref.targetTitle || `${ref.targetType} #${ref.targetId}`}
              </a>
            ))}
          </div>
        </div>
      )}
      {allBacklinks.length === 0 && allForward.length === 0 && (
        <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>暂无链接</p>
      )}
    </div>
  );
}

function OutlineTab({ headings, activeId }: { headings: Array<{ level: number; text: string; id: string }>; activeId?: string }) {
  return (
    <div className="space-y-0.5">
      {headings.map((h, i) => {
        const isActive = activeId === h.id;
        return (
          <a
            key={i}
            href={`#${h.id}`}
            className="block rounded-[3px] px-2 py-1 text-[12px] no-underline hover:bg-[var(--bg-tertiary)] transition-colors truncate"
            style={{
              color: isActive ? 'var(--accent-blue)' : 'var(--text-secondary)',
              fontWeight: isActive ? 600 : 400,
              paddingLeft: 8 + (h.level - 2) * 12,
            }}
            onClick={(e) => {
              e.preventDefault();
              const el = document.getElementById(h.id);
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }}
          >
            {h.text}
          </a>
        );
      })}
    </div>
  );
}

import DOMPurify from 'dompurify';
import MarkdownIt from 'markdown-it';
import { renderWikilinks } from '../../../shared/wikilink';

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

// D50: 3 reading themes — dark, light, sepia (warm)
const READING_THEMES: Record<string, { name: string; bg: string; text: string; accent: string; font: string }> = {
  dark: { name: '暗', bg: '#0d1117', text: '#c9d1d9', accent: '#58a6ff', font: 'var(--font-body)' },
  light: { name: '亮', bg: '#ffffff', text: '#24292f', accent: '#0969da', font: '"Noto Serif SC", Georgia, serif' },
  sepia: { name: '暖', bg: '#f8f5ef', text: '#2c2c2c', accent: '#c0392b', font: '"Noto Serif SC", Georgia, serif' },
};

// D59: migrate old theme keys to new 3-theme system
function migrateTheme(stored: string | null): string {
  if (!stored) return 'dark';
  const MIGRATE: Record<string, string> = { forest: 'dark', sakura: 'light', paper: 'sepia', midnight: 'dark' };
  return MIGRATE[stored] ?? (stored in READING_THEMES ? stored : 'dark');
}

export function BlogPreviewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const user = useAuthStore((s) => s.user);
  const [blog, setBlog] = useState<BlogWithTags | null>(null);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [readingTheme, setReadingTheme] = useState<string>(() => migrateTheme(localStorage.getItem('reading-theme')));
  const [activeHeadingId, setActiveHeadingId] = useState<string>('');
  const articleElRef = useRef<HTMLElement | null>(null);
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
      }).catch(() => setLoading(false));
  }, [id, user, isEditMode]); // R210: re-fetch when exiting inline edit mode

  // R201: IntersectionObserver for outline heading highlight
  useEffect(() => {
    const el = articleElRef.current;
    if (!el || !blog) return;
    const headings = el.querySelectorAll('h2[id], h3[id], h4[id]');
    if (headings.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) { setActiveHeadingId(entry.target.id); break; }
        }
      },
      { rootMargin: '-80px 0px -60% 0px', threshold: 1.0 },
    );
    headings.forEach((h) => observer.observe(h));
    return () => observer.disconnect();
  }, [blog?.content]); // Re-run when article content changes

  // ---- T2007+T2008: ContextPanel tabs (links + outline) ----
  const contextPanel = useContextPanel();
  useEffect(() => {
    if (!blog) return;
    const tabs: TabDef[] = [];

    // Links tab — load refs asynchronously
    const linksContent = (
      <ContextLinksTab blogId={blog.id} />
    );
    tabs.push({ id: 'links', label: '链接', content: linksContent });

    // Outline tab — from headings
    if (blog.content) {
      const headings = parseTocHeadings(blog.content, blog.format);
      if (headings.length > 0) {
        tabs.push({
          id: 'outline',
          label: '大纲',
          content: <OutlineTab headings={headings} activeId={activeHeadingId} />,
        });
      }
    }

    return contextPanel.registerTabs(tabs);
  }, [blog, contextPanel, activeHeadingId]); // R201: re-register when active heading changes

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

  // R174: md.render → wikilink regex → DOMPurify.sanitize → dangerouslySetInnerHTML
  const rawHtml = blog.format === 'md' ? md.render(blog.content) : blog.content;
  const rendered = renderWikilinks(rawHtml);
  const readingMinutes = estimateReadingTime(blog.content);
  const charTotal = countChars(blog.content);
  const theme = READING_THEMES[readingTheme] ?? READING_THEMES.dark;

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
                addTab({ id: blog.id, title: blog.title || '无标题', format: blog.format || 'md' });
              }}
              title="缩小为标签条，稍后快速切换"
              className="rounded-[4px] border px-2 py-1 text-[12px] transition-opacity hover:opacity-80"
              style={{ borderColor: 'var(--border-default)', color: 'var(--text-secondary)', background: 'transparent' }}
            >
              最小化
            </button>
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
                {t.name}
              </button>
            ))}
            </div>
          </div>
        </div>

        <article
          className="mt-4 rounded-[8px] p-6 transition-colors duration-500 prose"
          ref={(el) => { articleElRef.current = el; }}
          style={{
            background: theme.bg,
            fontFamily: theme.font,
            // R217: Override CSS vars so prose text uses theme color, links use theme accent
            ['--text-primary' as string]: theme.text,
            ['--text-secondary' as string]: theme.text,
            ['--accent-blue' as string]: theme.accent,
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
    </>
  );
}
