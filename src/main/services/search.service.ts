import type { SearchResult } from '../../shared/types';
import { dbAll } from '../db';

interface SearchRow {
  id: number;
  title: string;
  match_field: string;
}

export class SearchService {
  static async searchBlogs(userId: number, query: string): Promise<SearchResult[]> {
    const like = `%${query}%`;
    const rows = await dbAll<SearchRow>(
      `SELECT id, title, 'title' as match_field FROM blogs
       WHERE user_id = ? AND status = 'active' AND title LIKE ?
       UNION
       SELECT id, title, 'content' as match_field FROM blogs
       WHERE user_id = ? AND status = 'active' AND content LIKE ?
       UNION
       SELECT id, title, 'content' as match_field FROM blogs
       WHERE user_id = ? AND status = 'active' AND id IN (
         SELECT blog_id FROM blog_drafts WHERE content LIKE ?
       )
       LIMIT 20`,
      [userId, like, userId, like, userId, like],
    );

    return rows.map((row) => ({
      scope: 'blog' as const,
      id: row.id,
      title: row.title,
      snippet: `匹配: ${row.match_field === 'title' ? '标题' : '正文'}`,
      matchField: row.match_field,
    }));
  }

  static async searchKnowledge(userId: number, query: string): Promise<SearchResult[]> {
    const like = `%${query}%`;
    const rows = await dbAll<SearchRow & { content_text?: string }>(
      `SELECT id, filename as title, file_type as match_field, content_text FROM knowledge_files
       WHERE user_id = ? AND status = 'active' AND (filename LIKE ? OR content_text LIKE ?)
       ORDER BY
         CASE WHEN filename LIKE ? THEN 0 ELSE 1 END,
         created_at DESC
       LIMIT 20`,
      [userId, like, like, like],
    );

    return rows.map((row) => {
      let snippet = `类型: ${row.match_field}`;
      if (row.content_text) {
        const idx = row.content_text.toLowerCase().indexOf(query.toLowerCase());
        if (idx >= 0) {
          const start = Math.max(0, idx - 30);
          const end = Math.min(row.content_text.length, idx + query.length + 30);
          snippet =
            (start > 0 ? '...' : '') +
            row.content_text.substring(start, end) +
            (end < row.content_text.length ? '...' : '');
        }
      }
      return {
        scope: 'knowledge' as const,
        id: row.id,
        title: row.title,
        snippet,
        matchField: snippet.includes(query) ? 'content' : row.match_field,
      };
    });
  }

  static async globalSearch(userId: number, query: string) {
    const [blogs, knowledge] = await Promise.all([
      SearchService.searchBlogs(userId, query),
      SearchService.searchKnowledge(userId, query),
    ]);
    return { blogs, knowledge };
  }
}
