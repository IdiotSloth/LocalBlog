import type { BrowserWindow } from 'electron';
import TurndownService from 'turndown';
import { IPC } from '../../shared/ipc-channels';
import { BlogService } from './blog.service';

export interface TocEntry {
  title: string;
  href: string;
  level: number;
}

export interface CollectProgress {
  done: number;
  total: number;
  title: string;
  status: 'ok' | 'fail' | 'skip';
}

export interface CollectResult {
  seriesId: string;
  seriesName: string;
  total: number;
  succeeded: number;
  failed: number;
}

const CONCURRENCY = 2;
const DELAY_MS = 500;
const TIMEOUT_MS = 15000;
const MAX_PAGES = 50;

const TOC_SELECTORS = [
  // mdBook
  '.chapter-item a', '.chapter li a',
  // Docusaurus
  '.menu__link', '.menu__list-item a.menu__link',
  // VuePress
  '.sidebar-link', '.sidebar a.sidebar-link',
  // GitBook
  '.summary li a', '.book-summary li a',
  // MkDocs / Material for MkDocs
  '.md-nav__link', '.md-nav__item a',
  // Hugo (Docsy / Book / Learn themes)
  '.td-sidebar-nav a', '.book-menu a', '.docs-menu a',
  // Sphinx / Read the Docs
  '.toctree-l1 a', '.toctree-wrapper a', '.wy-menu-vertical a',
  // JupyterBook
  '.bd-toc-item a', '.toc-entry a',
  // Antora / Asciidoctor
  '.nav-list a', '.doc a',
  // Generic sidebar nav (last resort)
  'nav.sidebar a', 'aside.sidebar a',
];

export class ManualCollectorService {
  private static turndown = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced' });

  /** Extract TOC from a documentation/manual page using linkedom */
  static async extractToc(url: string): Promise<TocEntry[]> {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), TIMEOUT_MS);
    let response: Response;
    try {
      response = await fetch(url, {
        signal: controller.signal,
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; LocalBlogKB/0.2)', Accept: 'text/html' },
      });
    } finally {
      clearTimeout(t);
    }
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const html = await response.text();

    const { parseHTML } = await import('linkedom');
    const { document } = parseHTML(html) as unknown as { document: Document };
    const base = new URL(url);

    // Try each known selector pattern
    let links: { title: string; href: string }[] = [];
    for (const sel of TOC_SELECTORS) {
      const nodes = document.querySelectorAll(sel);
      if (nodes.length >= 2) {
        links = Array.from(nodes)
          .map((a) => {
            const el = a as unknown as { textContent?: string; getAttribute?: (name: string) => string | null };
            const text = (el.textContent || '').trim();
            let href = el.getAttribute?.('href') || '';
            if (href && !href.startsWith('http')) {
              try { href = new URL(href, base).href; } catch { /* skip */ }
            }
            return { title: text, href };
          })
          .filter((l) => l.title && l.href && l.href.startsWith('http'));
        if (links.length >= 2) break;
      }
    }

    if (links.length < 2) return []; // Not a manual index — caller falls back to single-page
    // Deduplicate by href
    const seen = new Set<string>();
    const deduped = links.filter((l) => {
      const key = l.href;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Infer nesting level from URL depth (rough)
    return deduped.slice(0, MAX_PAGES).map((l) => {
      const pathSegments = new URL(l.href).pathname.replace(/\/$/, '').split('/').length - 1;
      const level = Math.min(3, Math.max(1, pathSegments));
      return { title: l.title, href: l.href, level };
    });
  }

  /** Batch collect manual pages into a blog series */
  static async batchCollect(
    targetWindow: BrowserWindow | null,
    userId: number,
    seriesName: string,
    entries: TocEntry[],
  ): Promise<CollectResult> {
    const limited = entries.slice(0, MAX_PAGES);
    const results: { title: string; ok: boolean; content?: string }[] = [];
    const sendProgress = (p: CollectProgress) => {
      if (targetWindow && !targetWindow.isDestroyed()) {
        targetWindow.webContents.send(IPC.EVT_MANUAL_COLLECT_PROGRESS, p);
      }
    };

    // Process in batches with concurrency 2
    for (let i = 0; i < limited.length; i += CONCURRENCY) {
      const batch = limited.slice(i, i + CONCURRENCY);
      const batchResults = await Promise.allSettled(
        batch.map(async (entry, bi) => {
          const idx = i + bi;
          const controller = new AbortController();
          const t = setTimeout(() => controller.abort(), TIMEOUT_MS);
          try {
            const response = await fetch(entry.href, {
              signal: controller.signal,
              headers: { 'User-Agent': 'Mozilla/5.0 (compatible; LocalBlogKB/0.2)', Accept: 'text/html' },
            });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const html = await response.text();

            const { parseHTML } = await import('linkedom');
            const { document } = parseHTML(html) as unknown as { document: Document };
            const { Readability } = await import('@mozilla/readability');
            const reader = new Readability(document);
            const article = reader.parse();

            if (!article) throw new Error('无法提取正文');
            const md = ManualCollectorService.turndown.turndown(article.content);
            sendProgress({ done: idx + 1, total: limited.length, title: entry.title, status: 'ok' });
            return { title: article.title || entry.title, content: md, ok: true };
          } catch {
            sendProgress({ done: idx + 1, total: limited.length, title: entry.title, status: 'fail' });
            return { title: entry.title, content: '', ok: false };
          } finally {
            clearTimeout(t);
          }
        }),
      );
      for (const r of batchResults) {
        if (r.status === 'fulfilled') results.push(r.value);
        else results.push({ title: 'unknown', ok: false });
      }
      // Delay between batches
      if (i + CONCURRENCY < limited.length) {
        await new Promise((r) => setTimeout(r, DELAY_MS));
      }
    }

    // Create blog series from collected pages
    const seriesId = `manual-${Date.now()}`;
    let firstBlogId: number | null = null;
    let succeeded = 0;
    let failed = 0;

    for (const r of results) {
      if (!r.ok || !r.content) { failed++; continue; }
      try {
        const blog = await BlogService.createBlog(userId, r.title, 'md', r.content);
        await BlogService.setBlogSeries(userId, blog.id, seriesId, seriesName);
        if (!firstBlogId) firstBlogId = blog.id;
        succeeded++;
      } catch {
        failed++;
      }
    }

    return { seriesId, seriesName, total: limited.length, succeeded, failed };
  }
}
