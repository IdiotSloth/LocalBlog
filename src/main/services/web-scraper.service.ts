import TurndownService from 'turndown';
import type { ScrapeResult } from '../../shared/types';

export class WebScraperService {
  private static turndown = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
    emDelimiter: '*',
  });

  /** Fetch a webpage and extract its main content as Markdown */
  static async scrape(url: string): Promise<ScrapeResult> {
    // Validate URL
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      throw new Error('无效的 URL');
    }

    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new Error('仅支持 http/https 链接');
    }

    // Fetch with timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    let response: Response;
    try {
      response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; LocalBlogKB/0.1)',
          Accept: 'text/html, application/xhtml+xml',
        },
      });
    } catch (err) {
      clearTimeout(timeout);
      throw new Error(`无法访问该网页: ${(err as Error).message}`);
    }
    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`网页返回错误 (HTTP ${response.status})`);
    }

    const html = await response.text();
    if (!html || html.length < 100) {
      throw new Error('网页内容为空');
    }

    // Check content type
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html') && !contentType.includes('application/xhtml')) {
      throw new Error('该页面不是 HTML 网页');
    }

    // Extract with @mozilla/readability + linkedom (no native deps)
    const { parseHTML } = await import('linkedom');
    const { Readability } = await import('@mozilla/readability');

    const { document } = parseHTML(html);
    const reader = new Readability(document);
    const article = reader.parse();

    if (!article) {
      throw new Error('无法提取网页正文');
    }

    // Convert HTML to Markdown
    const markdown = WebScraperService.turndown.turndown(article.content);
    const excerpt = article.excerpt || article.textContent?.substring(0, 200) || '';

    return {
      title: article.title || '未命名文章',
      content: markdown,
      excerpt: excerpt.replace(/\s+/g, ' ').trim(),
      siteName: article.siteName || parsed.hostname,
    };
  }
}
