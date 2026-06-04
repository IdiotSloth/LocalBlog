import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import hljs from 'highlight.js';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { BookmarkButton } from '../../components/common/BookmarkButton';
import { ReadingTime } from '../../components/blog/ReadingTime';
import { SeriesNav } from '../../components/blog/SeriesNav';
import { FloatingMenu } from '../../components/blog/FloatingMenu';
import { recordRecentBlog } from '../../hooks/useRecentHistory';
import { useQuickNavStore } from '../../stores/quick-nav-store';
import { useContextPanel, type TabDef } from '../../components/layout/ContextPanel';
import { countChars, estimateReadingTime } from '../../lib/toc-parser';
import { formatDate } from '../../lib/utils';
import { searchSimilarDocs } from '../../lib/use-search';
import { useAiSettings } from '../../stores/ai-settings';
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
  const [wikiResolver, setWikiResolver] = useState<Map<string, { type: string; id: number }> | undefined>();
  const { settings: aiSettings, effectiveModel, effectiveBaseUrl } = useAiSettings();
  const [aiCtxMenu, setAiCtxMenu] = useState<{ x: number; y: number; text: string } | null>(null);
  const articleElRef = useRef<HTMLElement | null>(null);

  // T2406: HoverPreview — transient wikilink context, 200ms delay, no interaction
  interface HoverData { title: string; excerpt: string; updatedAt: string; tags: string[]; refCount: number; backlinkCount: number; }
  const [hoverPrev, setHoverPrev] = useState<{ x: number; y: number; data: HoverData } | null>(null);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const el = articleElRef.current;
    if (!el) return;
    const onEnter = (e: MouseEvent) => {
      const link = (e.target as HTMLElement).closest('a.wiki-link') as HTMLAnchorElement | null;
      if (!link) return;
      const href = link.getAttribute('href') || '';
      const mBlog = href.match(/^#\/blog\/(\d+)/);
      const mKb = href.match(/select=(\d+)/);
      const tid = mBlog ? { type: 'blog', id: Number(mBlog[1]) } : mKb ? { type: 'knowledge', id: Number(mKb[1]) } : null;
      if (!tid) return;
      const rect = link.getBoundingClientRect();
      hoverTimerRef.current = setTimeout(async () => {
        try {
          let data: HoverData | null = null;
          const userId = user?.id;
          if (!userId) return;
          if (tid.type === 'blog') {
            const r = await window.api.blogGet(tid.id);
            if (r.success && r.data) {
              const [refsR, backR] = await Promise.all([
                window.api.refGetFrom({ sourceType: 'blog', sourceId: tid.id }),
                window.api.refGetTo({ targetType: 'blog', targetId: tid.id }),
              ]);
              const tags = (r.data as any).tags?.map?.((t: any) => t.name) || [];
              data = {
                title: r.data.title || '无标题',
                excerpt: (r.data.content || '').replace(/<[^>]*>/g, '').slice(0, 120),
                updatedAt: r.data.updatedAt || '',
                tags: tags.slice(0, 5),
                refCount: refsR.success && refsR.data ? refsR.data.length : 0,
                backlinkCount: backR.success && backR.data ? backR.data.length : 0,
              };
            }
          } else {
            const r = await window.api.kbGet({ fileId: tid.id, userId });
            if (r.success && r.data) {
              const backR = await window.api.refGetTo({ targetType: 'knowledge', targetId: tid.id });
              data = {
                title: r.data.filename || '未知文件',
                excerpt: (r.data.description || '').slice(0, 120),
                updatedAt: r.data.updatedAt || r.data.createdAt || '',
                tags: [],
                refCount: 0,
                backlinkCount: backR.success && backR.data ? backR.data.length : 0,
              };
            }
          }
          if (data) setHoverPrev({ x: rect.left, y: rect.bottom + 4, data });
        } catch { /* best-effort preview */ }
      }, 200);
    };
    const onLeave = (e: MouseEvent) => {
      const link = (e.target as HTMLElement).closest('a.wiki-link');
      if (!link) return;
      if (hoverTimerRef.current) { clearTimeout(hoverTimerRef.current); hoverTimerRef.current = null; }
      setHoverPrev(null);
    };
    el.addEventListener('mouseover', onEnter as EventListener, true);
    el.addEventListener('mouseout', onLeave as EventListener, true);
    return () => {
      el.removeEventListener('mouseover', onEnter as EventListener, true);
      el.removeEventListener('mouseout', onLeave as EventListener, true);
    };
  }, [user?.id]);
  const isEditMode = searchParams.get('mode') === 'edit';
  const contentRef = useRef<HTMLDivElement | null>(null);
  const contextPanel = useContextPanel();

  useEffect(() => {
    if (id && user)
      window.api.blogGet(Number(id)).then((r) => {
        if (r.success && r.data) {
          setBlog(r.data);
          // T1917: Record recent blog visit
          recordRecentBlog(r.data.id, r.data.title);
          // T2406 QuickNav: push to in-memory traversal ring (pure memory, no persistence, max 5, FIFO)
          useQuickNavStore.getState().push(r.data.id, r.data.title);
          window.scrollTo(0, 0);
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

  // T2007/T2008/T2203: ContextPanel tabs (links + outline + recommend)
  useEffect(() => {
    if (!blog) return;
    const tabs: TabDef[] = [];

    tabs.push({
      id: 'links',
      label: '链接',
      content: <ContextLinksTab blogId={blog.id} />,
    });

    if (user) {
      tabs.push({
        id: 'recommend',
        label: '推荐',
        badge: true,
        content: <RecommendTab docId={blog.id} docType="blog" userId={user.id} />,
      });
    }

    return contextPanel.registerTabs(tabs);
  }, [blog, contextPanel, activeHeadingId, user]);

  // §3.2 reading progress: save percent on unmount, restore on mount
  useEffect(() => {
    if (!id) return;
    const key = `blog-progress-${id}`;
    const saved = sessionStorage.getItem(key);
    if (saved) {
      const percent = Number(saved);
      if (percent > 5 && percent < 95) {
        requestAnimationFrame(() => {
          const h = document.documentElement;
          const total = h.scrollHeight - h.clientHeight;
          if (total > 0) h.scrollTop = (percent / 100) * total;
        });
      }
    } else {
      window.scrollTo(0, 0);
    }
  }, [id]);
  useEffect(() => {
    return () => {
      if (!id) return;
      const h = document.documentElement;
      const total = h.scrollHeight - h.clientHeight;
      const percent = total > 0 ? Math.round((h.scrollTop / total) * 100) : 0;
      if (percent > 5 && percent < 95) {
        sessionStorage.setItem(`blog-progress-${id}`, String(percent));
      }
    };
  }, [id]);
  const handleScroll = useCallback(() => {
    const h = document.documentElement;
    const total = h.scrollHeight - h.clientHeight;
    setProgress(total > 0 ? Math.min((h.scrollTop / total) * 100, 100) : 0);
  }, []);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  // Load refs to resolve [[wikilinks]] to direct links
  useEffect(() => {
    if (!id || !user) return;
    Promise.all([
      window.api.refGetFrom({ sourceType: 'blog', sourceId: Number(id) }),
      window.api.refGetTo({ targetType: 'blog', targetId: Number(id) }),
    ]).then(([from, to]) => {
      const map = new Map<string, { type: string; id: number }>();
      const addRef = (r: any) => {
        const title = r.targetTitle || r.sourceTitle || '';
        const type = r.targetType || r.sourceType || '';
        const rid = r.targetId || r.sourceId || 0;
        if (title && type && rid) map.set(title, { type, id: rid });
      };
      if (from.success && from.data) from.data.forEach(addRef);
      if (to.success && to.data) to.data.forEach(addRef);
      setWikiResolver(map);
    }).catch(() => setWikiResolver(undefined));
  }, [id, user]);

  // T2205: Load transclusion content after DOM is rendered
  useEffect(() => {
    if (!blog || !user) return;
    // Wait for next frame to ensure DOM is painted
    const timer = setTimeout(() => {
      const blocks = document.querySelectorAll<HTMLElement>('.transclusion');
      if (blocks.length === 0) return;

      // D97: Batch gather all targets first, then fetch
      const targets: Array<{ el: HTMLElement; type: string; id: number; title: string }> = [];
      for (const el of blocks) {
        const refType = el.getAttribute('data-ref-type');
        const refId = Number(el.getAttribute('data-ref-id'));
        const refTitle = el.getAttribute('data-ref-title') || '';
        if (refId && refType && refType !== 'unknown') {
          targets.push({ el: el as HTMLElement, type: refType, id: refId, title: refTitle });
        }
      }

      // Load each transclusion — R283: all content through DOMPurify before innerHTML
      for (const t of targets) {
        const failHtml = (msg: string) => DOMPurify.sanitize(`<p style="color:var(--accent-red)">${msg}</p>`);
        const notFoundHtml = (msg: string) => DOMPurify.sanitize(`<p style="color:var(--text-muted)">${msg}</p>`);

        if (t.type === 'blog') {
          window.api.blogGet(t.id).then((r) => {
            if (r.success && r.data) {
              const excerpt = escT(r.data.content || '').substring(0, 200);
              const title = escT(r.data.title);
              t.el.innerHTML = DOMPurify.sanitize(`<p>${excerpt}</p><div class="transclusion-source">来自博客: <a href="#/blog/${t.id}">${title}</a></div>`);
            } else {
              t.el.innerHTML = notFoundHtml(`无法加载嵌入内容: ${escT(t.title)}`);
            }
          }).catch(() => {
            t.el.innerHTML = failHtml(`加载失败: ${escT(t.title)}`);
          });
        } else if (t.type === 'knowledge') {
          window.api.kbGet({ fileId: t.id, userId: user.id }).then((r) => {
            if (r.success && r.data) {
              const excerpt = escT(r.data.content_text || r.data.filename || '').substring(0, 200);
              const fname = escT(r.data.filename);
              t.el.innerHTML = DOMPurify.sanitize(`<p>${excerpt}</p><div class="transclusion-source">来自知识库: <a href="#/knowledge">${fname}</a></div>`);
            } else {
              t.el.innerHTML = notFoundHtml(`无法加载嵌入内容: ${escT(t.title)}`);
            }
          }).catch(() => {
            t.el.innerHTML = failHtml(`加载失败: ${escT(t.title)}`);
          });
        } else if (t.type === 'note') {
          window.api.noteList(user.id, undefined).then((r) => {
            const note = (r.success && r.data) ? r.data.find((n) => n.id === t.id) : null;
            if (note) {
              const excerpt = escT(note.content || '');
              t.el.innerHTML = DOMPurify.sanitize(`<p>${excerpt}</p><div class="transclusion-source">来自便签</div>`);
            } else {
              t.el.innerHTML = notFoundHtml(`无法加载嵌入内容: ${escT(t.title)}`);
            }
          }).catch(() => {
            t.el.innerHTML = failHtml(`加载失败: ${escT(t.title)}`);
          });
        }
      }

      function escT(s: string): string {
        return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [blog, user]);

  // T2302: Code highlight + copy — must be before any conditional return
  const rawHtml = blog ? (blog.format === 'md' ? md.render(blog.content) : blog.content) : '';
  const rendered = rawHtml ? renderWikilinks(rawHtml, wikiResolver) : '';
  const purifyConfig: DOMPurify.Config = {
    ADD_ATTR: ['data-ref-type', 'data-ref-id', 'data-ref-title', 'target', 'rel'],
    ADD_TAGS: [],
  };
  useEffect(() => {
    const el = contentRef.current;
    if (!el || !rendered) return;
    const pres = el.querySelectorAll('pre');
    pres.forEach((pre) => {
      const code = pre.querySelector('code');
      let lang = '';
      if (code) {
        const cls = code.className || '';
        const m = cls.match(/language-(\w+)/);
        if (m) lang = m[1];
        if (lang) { code.classList.forEach(c => { if (c.startsWith('language-')) code.classList.remove(c); }); code.classList.add('language-' + lang); hljs.highlightElement(code as HTMLElement); }
        else { hljs.highlightElement(code as HTMLElement); }
      }
      if (lang && !pre.querySelector('.code-lang-label')) {
        const lbl = document.createElement('span'); lbl.textContent = lang; lbl.className = 'code-lang-label';
        lbl.style.cssText = 'position:absolute;top:6px;left:12px;font-size:10px;text-transform:uppercase;color:var(--text-muted);font-family:var(--font-mono)';
        pre.style.position = 'relative'; pre.style.paddingTop = '28px'; pre.insertBefore(lbl, pre.firstChild);
      }
      if (!pre.querySelector('.code-copy-btn')) {
        const btn = document.createElement('button'); btn.textContent = '复制'; btn.className = 'code-copy-btn';
        btn.style.cssText = 'position:absolute;top:6px;right:8px;padding:1px 8px;font-size:11px;border-radius:4px;border:1px solid var(--border-default);background:var(--bg-secondary);color:var(--text-secondary);cursor:pointer;opacity:0;transition:opacity 0.15s';
        btn.onclick = async () => { const text = code?.textContent || ''; await navigator.clipboard.writeText(text); btn.textContent = '已复制!'; setTimeout(() => { btn.textContent = '复制'; }, 1500); };
        pre.appendChild(btn); pre.addEventListener('mouseenter', () => { btn.style.opacity = '1'; }); pre.addEventListener('mouseleave', () => { btn.style.opacity = '0'; });
      }
    });
  }, [rendered]);

  const readingMinutes = blog ? estimateReadingTime(blog.content) : 0;
  const charTotal = blog ? countChars(blog.content) : 0;
  const theme = READING_THEMES[readingTheme] ?? READING_THEMES.dark;

  const handleThemeChange = (key: string) => {
    setReadingTheme(key);
    localStorage.setItem('reading-theme', key);
  };

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

  if (isEditMode) {
    return (
      <div className="flex flex-col h-full">
        <div className="mb-2 flex items-center gap-3">
          <button
            type="button"
            onClick={() => setSearchParams({}, { replace: true })}
            className="inline-flex items-center gap-1 text-[13px] hover:underline"
            style={{ color: 'var(--accent-blue)', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            ← 返回阅读
          </button>
          <span className="text-[12px]" style={{ color: 'var(--text-muted)' }}>编辑: {blog.title}</span>
        </div>
        <div className="flex-1" style={{ animation: 'fadeIn 0.3s ease' }}>
          <Suspense fallback={<p className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>加载编辑器...</p>}>
            <BlogEditorPage variant="frameless" />
          </Suspense>
        </div>
      </div>
    );
  }

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
        <div className="mb-4 flex items-center justify-end">
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

        <article
          className="mt-4 rounded-[8px] p-6 transition-colors duration-500 prose"
          ref={(el) => { articleElRef.current = el; }}
          onContextMenu={(e) => {
            const sel = window.getSelection()?.toString()?.trim();
            if (sel && aiSettings.enabled) {
              e.preventDefault();
              setAiCtxMenu({ x: e.clientX, y: e.clientY, text: sel });
            }
          }}
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
          <h1 className="mb-3 flex items-center gap-2" style={{ color: theme.text }}>
            {blog.title}
            <BookmarkButton targetType="blog" targetId={blog.id} title={blog.title} />
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

          <div className="prose" ref={contentRef} dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(rendered, purifyConfig) }} />
        </article>

        {user && blog.seriesId && (
          <SeriesNav userId={user.id} seriesId={blog.seriesId} seriesName={blog.seriesName} currentBlogId={blog.id} />
        )}

        {user && <RelatedResources blogId={blog.id} />}

        {/* Floating side menu */}
        {blog.content && (
          <FloatingMenu
            blogId={blog.id}
            headings={parseTocHeadings(blog.content, blog.format)}
            onEdit={() => setSearchParams({ mode: 'edit' }, { replace: true })}
            onBack={() => navigate('/blog')}
          />
        )}

        {/* Right-click AI context menu */}
        {aiCtxMenu && (
          <div className="fixed z-[9999] rounded-[6px] border py-1 shadow-lg min-w-[140px]"
            style={{ left: aiCtxMenu.x, top: aiCtxMenu.y, background: 'var(--bg-secondary)', borderColor: 'var(--border-default)' }}
            onMouseLeave={() => setAiCtxMenu(null)}>
            {[
              { id: 'continue', label: 'AI 续写' },
              { id: 'summarize', label: 'AI 摘要' },
              { id: 'polish', label: 'AI 润色' },
              { id: 'translate', label: 'AI 翻译' },
            ].map((item) => (
              <button key={item.id} type="button"
                onClick={async () => {
                  const text = aiCtxMenu.text;
                  setAiCtxMenu(null);
                  try {
                    const resp = await window.api.aiChat({
                      settings: { ...aiSettings, model: effectiveModel, baseUrl: effectiveBaseUrl },
                      request: { messages: [{ role: 'user', content: `${item.id === 'continue' ? '续写' : item.id === 'summarize' ? '总结' : item.id === 'polish' ? '润色' : '翻译为中文'}:\n\n${text}` }] },
                    });
                    if (resp.success && resp.data) {
                      alert(resp.data.content);
                    }
                  } catch { /* ignore */ }
                }}
                className="w-full text-left px-3 py-1.5 text-[12px] transition-colors hover:bg-[var(--bg-primary)]"
                style={{ color: 'var(--text-primary)', background: 'transparent', border: 'none', cursor: 'pointer' }}>
                {item.label}
              </button>
            ))}
          </div>
        )}

        {/* T2406: HoverPreview — transient wikilink context (200ms delay, no interaction) */}
        {hoverPrev && (
          <div className="fixed z-[9998] rounded-[6px] border p-3 shadow-lg max-w-[300px] pointer-events-none"
            style={{
              left: hoverPrev.x, top: hoverPrev.y,
              background: 'var(--bg-secondary)', borderColor: 'var(--border-default)',
            }}>
            <div className="text-[13px] font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{hoverPrev.data.title}</div>
            {hoverPrev.data.excerpt && (
              <div className="mt-1 text-[11px] line-clamp-2" style={{ color: 'var(--text-secondary)' }}>{hoverPrev.data.excerpt}</div>
            )}
            <div className="mt-1.5 flex items-center gap-2 text-[10px]" style={{ color: 'var(--text-muted)' }}>
              {hoverPrev.data.updatedAt && <span>{formatDate(hoverPrev.data.updatedAt)}</span>}
              {hoverPrev.data.refCount > 0 && <span>引用 {hoverPrev.data.refCount}</span>}
              {hoverPrev.data.backlinkCount > 0 && <span>被引 {hoverPrev.data.backlinkCount}</span>}
            </div>
            {hoverPrev.data.tags.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-1">
                {hoverPrev.data.tags.map((t) => (
                  <span key={t} className="text-[10px] rounded-[3px] px-1.5 py-0.5" style={{ background: 'var(--bg-primary)', color: 'var(--text-secondary)' }}>{t}</span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}

// ── T2203: Passive discovery — similar content recommendations ──

function RecommendTab({ docId, docType, userId }: { docId: number; docType: 'blog' | 'knowledge'; userId: number }) {
  const [results, setResults] = useState<Array<{ id: number; type: string; score: number; title?: string }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    searchSimilarDocs(docId, docType, 5, 0.75)
      .then((r) => {
        if (cancelled) return;
        // Fetch titles for results
        Promise.all(r.map(async (item) => {
          try {
            if (item.type === 'blog') {
              const resp = await window.api.blogGet(item.id);
              return { ...item, title: resp.success && resp.data ? resp.data.title : `博客 #${item.id}` };
            }
            const resp = await window.api.kbGet({ fileId: item.id, userId });
            return { ...item, title: resp.success && resp.data ? resp.data.filename : `知识文件 #${item.id}` };
          } catch {
            return { ...item, title: item.type === 'blog' ? `博客 #${item.id}` : `知识文件 #${item.id}` };
          }
        })).then((withTitles) => {
          if (!cancelled) { setResults(withTitles); setLoading(false); }
        });
      })
      .catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [docId, docType]);

  if (loading) {
    return <p className="text-[13px] py-4" style={{ color: 'var(--text-secondary)' }}>分析中...</p>;
  }
  if (results.length === 0) {
    return (
      <div className="text-center py-6">
        <p className="text-[13px]" style={{ color: 'var(--text-muted)' }}>暂无相关推荐</p>
        <p className="mt-1 text-[11px]" style={{ color: 'var(--text-muted)' }}>继续创作更多内容后，系统会自动发现关联</p>
      </div>
    );
  }
  return (
    <div className="space-y-1">
      <p className="text-[11px] mb-2" style={{ color: 'var(--text-muted)' }}>基于语义相似度推荐</p>
      {results.map((item) => (
        <Link key={`${item.type}-${item.id}`}
          to={item.type === 'blog' ? `/blog/${item.id}` : `/knowledge`}
          className="no-underline block rounded-[6px] px-3 py-2 transition-colors hover:bg-[var(--bg-primary)]">
          <div className="flex items-center gap-2">
            <span className="shrink-0 rounded-[3px] px-1.5 py-0.5 text-[10px] font-medium"
              style={{ background: item.type === 'blog' ? 'var(--accent-blue)' : 'var(--accent-green)', color: '#fff' }}>
              {item.type === 'blog' ? '博' : '知'}
            </span>
            <span className="flex-1 truncate text-[13px]" style={{ color: 'var(--text-primary)' }}>{item.title}</span>
            <span className="shrink-0 text-[10px]" style={{ color: 'var(--text-muted)' }}>{Math.round(item.score * 100)}%</span>
          </div>
        </Link>
      ))}
    </div>
  );
}
