import { Router } from 'express';
import { requireAuth, type AuthRequest } from '../middleware/auth';

export const scrapeRouter = Router();
scrapeRouter.use(requireAuth);

scrapeRouter.post('/webpage', async (req: AuthRequest, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.json({ success: false, error: '请提供 URL' });

    let parsed: URL;
    try { parsed = new URL(url); } catch { return res.json({ success: false, error: '无效的 URL' }); }
    if (!['http:', 'https:'].includes(parsed.protocol)) return res.json({ success: false, error: '仅支持 http/https 链接' });

    const { parseHTML } = await import('linkedom');
    const { Readability } = await import('@mozilla/readability');

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; LocalBlogKB/0.1)', Accept: 'text/html' },
    });
    clearTimeout(timeout);

    if (!response.ok) return res.json({ success: false, error: `网页返回错误 (HTTP ${response.status})` });
    const html = await response.text();
    if (!html || html.length < 100) return res.json({ success: false, error: '网页内容为空' });

    const { document } = parseHTML(html);
    const reader = new Readability(document);
    const article = reader.parse();
    if (!article) return res.json({ success: false, error: '无法提取网页正文' });

    // Use turndown to convert HTML to Markdown
    const TurndownService = (await import('turndown')).default;
    const turndown = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced', emDelimiter: '*' });
    const markdown = turndown.turndown(article.content);
    const excerpt = (article.excerpt || article.textContent?.substring(0, 200) || '').replace(/\s+/g, ' ').trim();

    return res.json({ success: true, data: {
      title: article.title || '未命名文章',
      content: markdown,
      excerpt,
      siteName: article.siteName || parsed.hostname,
    }});
  } catch (err) { return res.json({ success: false, error: `抓取失败: ${(err as Error).message}` }); }
});
