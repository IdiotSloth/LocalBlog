/**
 * T2106: Browser clipper endpoint — POST /api/clip
 *
 * Receives a URL from the Chrome extension, extracts article content
 * using @mozilla/readability, and converts to Markdown via turndown.
 *
 * Auth: No JWT required — this is a localhost-only endpoint for the
 * companion Chrome extension. Uses first user in DB (single-user app).
 */

import { Router } from 'express';
import type { Request, Response } from 'express';
import { getPool } from '../db';

export const clipRouter = Router();

// Lazy-loaded to avoid startup cost
async function scrapeUrl(url: string): Promise<{ title: string; content: string; excerpt: string }> {
  // 15s timeout + 10MB response body limit
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 15_000);
  try {
    const resp = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; LocalBlogKB/1.0)' },
      signal: ctrl.signal,
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);

    // Read up to 10MB, reject if larger
    const contentLength = resp.headers.get('content-length');
    if (contentLength && Number(contentLength) > 10_485_760) {
      throw new Error('响应体超过 10MB 限制');
    }
    const html = await resp.text();
    if (html.length > 10_485_760) throw new Error('响应体超过 10MB 限制');
  } finally {
    clearTimeout(timer);
  }

  const { parseHTML } = await import('linkedom');
  const { Readability } = await import('@mozilla/readability');
  const TurndownService = (await import('turndown')).default;

  const { document } = parseHTML(html) as unknown as { document: Document };
  const reader = new Readability(document as any);
  const article = reader.parse();

  if (!article) throw new Error('无法提取页面内容');

  const turndown = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced' });
  const content = turndown.turndown(article.content);
  const excerpt = article.excerpt ?? article.textContent.slice(0, 200);

  return { title: article.title ?? url, content, excerpt };
}

/** Look up first user id — single-user localhost app, no JWT needed for clip */
async function getFirstUserId(): Promise<number | null> {
  try {
    const pool = getPool();
    const [rows] = await pool.execute('SELECT id FROM users LIMIT 1') as any;
    return rows?.[0]?.id ?? null;
  } catch {
    return null;
  }
}

clipRouter.post('/', async (req: Request, res: Response) => {
  const { url } = req.body as { url?: string };
  if (!url || typeof url !== 'string') {
    res.status(400).json({ success: false, error: '请提供有效的 URL' });
    return;
  }

  // Validate URL protocol
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      res.status(400).json({ success: false, error: '仅支持 HTTP/HTTPS URL' });
      return;
    }
  } catch {
    res.status(400).json({ success: false, error: 'URL 格式无效' });
    return;
  }

  // Verify app has a registered user
  const userId = await getFirstUserId();
  if (!userId) {
    res.status(503).json({ success: false, error: '请先在应用中注册账号' });
    return;
  }

  try {
    const result = await scrapeUrl(url);
    res.json({ success: true, data: { ...result, userId } });
  } catch (err) {
    const message = (err as Error).message || '剪藏失败';
    res.status(500).json({ success: false, error: message });
  }
});
