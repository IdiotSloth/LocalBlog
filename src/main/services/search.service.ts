import type { FtsSearchResult, IndexableDoc, SearchResult } from '../../shared/types';
import { dbAll } from '../db';
import { isUsingMySQL } from '../db';

export class SearchService {
  /**
   * Legacy: global search returning old SearchResult format (used by existing GlobalSearch).
   */
  static async globalSearch(userId: number, query: string): Promise<{ blogs: SearchResult[]; knowledge: SearchResult[] }> {
    const [blogs, knowledge] = await Promise.all([
      SearchService.searchBlogs(userId, query),
      SearchService.searchKnowledge(userId, query),
    ]);
    return { blogs, knowledge };
  }

  /**
   * Legacy: blog search returning old SearchResult format.
   */
  static async searchBlogs(userId: number, query: string): Promise<SearchResult[]> {
    const like = `%${query}%`;
    const rows = await dbAll<{ id: number; title: string; match_field: string }>(
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

  /**
   * Legacy: knowledge search returning old SearchResult format.
   */
  static async searchKnowledge(userId: number, query: string): Promise<SearchResult[]> {
    const like = `%${query}%`;
    const rows = await dbAll<{ id: number; title: string; match_field: string; content_text?: string }>(
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

  /**
   * Search all content using MySQL FULLTEXT (MySQL mode) or
   * return indexable documents for Worker-based search (sql.js mode).
   *
   * When MySQL: performs MATCH ... AGAINST queries on blogs and knowledge_files.
   * When sql.js: returns all active blogs + knowledge files for the Worker to index.
   */
  static async searchAll(query: string, userId: number): Promise<FtsSearchResult[]> {
    if (isUsingMySQL()) {
      return SearchService.mysqlFulltextSearch(query, userId);
    }
    // sql.js mode: Server has no index; returns empty — Worker handles search in renderer.
    // The renderer should request indexable documents separately via getIndexableDocuments.
    return [];
  }

  /**
   * MySQL FULLTEXT search using MATCH ... AGAINST in natural language mode.
   */
  private static async mysqlFulltextSearch(query: string, userId: number): Promise<FtsSearchResult[]> {
    const escaped = query.replace(/[+\-<>()~*"@]/g, ' ').trim();
    if (!escaped) return [];

    const [blogs, knowledge] = await Promise.all([
      SearchService.mysqlSearchBlogs(escaped, userId),
      SearchService.mysqlSearchKnowledge(escaped, userId),
    ]);

    // Merge and sort by score descending
    const merged = [...blogs, ...knowledge].sort((a, b) => b.score - a.score);
    return merged.slice(0, 20);
  }

  private static async mysqlSearchBlogs(query: string, userId: number): Promise<FtsSearchResult[]> {
    try {
      const rows = await dbAll<{
        id: number;
        title: string;
        content: string;
        score: number;
      }>(
        `SELECT id, title, SUBSTRING(content, 1, 200) as content,
                MATCH(title, content) AGAINST(? IN NATURAL LANGUAGE MODE) as score
         FROM blogs
         WHERE user_id = ? AND status = 'active'
           AND MATCH(title, content) AGAINST(? IN NATURAL LANGUAGE MODE)
         ORDER BY score DESC
         LIMIT 20`,
        [query, userId, query],
      );

      return rows.map((row) => ({
        id: row.id,
        type: 'blog' as const,
        title: row.title,
        snippet: (row.content || '').slice(0, 200),
        score: Math.round((row.score || 0) * 1000) / 1000,
      }));
    } catch (err) {
      console.warn('[SearchService] MySQL blog fulltext search failed, falling back to LIKE:', (err as Error).message);
      return SearchService.fallbackBlogSearch(query, userId);
    }
  }

  private static async mysqlSearchKnowledge(query: string, userId: number): Promise<FtsSearchResult[]> {
    try {
      const rows = await dbAll<{
        id: number;
        title: string;
        content_text: string;
        score: number;
      }>(
        `SELECT id, filename as title, SUBSTRING(content_text, 1, 200) as content_text,
                MATCH(filename, content_text) AGAINST(? IN NATURAL LANGUAGE MODE) as score
         FROM knowledge_files
         WHERE user_id = ? AND status = 'active'
           AND MATCH(filename, content_text) AGAINST(? IN NATURAL LANGUAGE MODE)
         ORDER BY score DESC
         LIMIT 20`,
        [query, userId, query],
      );

      return rows.map((row) => ({
        id: row.id,
        type: 'knowledge' as const,
        title: row.title,
        snippet: (row.content_text || '').slice(0, 200),
        score: Math.round((row.score || 0) * 1000) / 1000,
      }));
    } catch (err) {
      console.warn('[SearchService] MySQL knowledge fulltext search failed, falling back to LIKE:', (err as Error).message);
      return SearchService.fallbackKnowledgeSearch(query, userId);
    }
  }

  /**
   * Fallback: LIKE-based search when FULLTEXT index is unavailable (e.g., during migration).
   */
  private static async fallbackBlogSearch(query: string, userId: number): Promise<FtsSearchResult[]> {
    const like = `%${query}%`;
    const rows = await dbAll<{ id: number; title: string; content: string }>(
      `SELECT id, title, SUBSTRING(content, 1, 200) as content
       FROM blogs
       WHERE user_id = ? AND status = 'active' AND (title LIKE ? OR content LIKE ?)
       ORDER BY created_at DESC
       LIMIT 20`,
      [userId, like, like],
    );
    return rows.map((row) => ({
      id: row.id,
      type: 'blog' as const,
      title: row.title,
      snippet: (row.content || '').slice(0, 200),
      score: 0,
    }));
  }

  private static async fallbackKnowledgeSearch(query: string, userId: number): Promise<FtsSearchResult[]> {
    const like = `%${query}%`;
    const rows = await dbAll<{ id: number; filename: string; content_text: string }>(
      `SELECT id, filename, SUBSTRING(content_text, 1, 200) as content_text
       FROM knowledge_files
       WHERE user_id = ? AND status = 'active' AND (filename LIKE ? OR content_text LIKE ?)
       ORDER BY created_at DESC
       LIMIT 20`,
      [userId, like, like],
    );
    return rows.map((row) => ({
      id: row.id,
      type: 'knowledge' as const,
      title: row.filename,
      snippet: (row.content_text || '').slice(0, 200),
      score: 0,
    }));
  }

  /**
   * Get all indexable documents for the Worker to build its inverted index.
   * Used in sql.js mode.
   */
  static async getIndexableDocuments(userId: number): Promise<IndexableDoc[]> {
    const [blogs, knowledge] = await Promise.all([
      dbAll<{ id: number; title: string; content: string }>(
        "SELECT id, title, COALESCE(content, '') as content FROM blogs WHERE user_id = ? AND status = 'active'",
        [userId],
      ),
      dbAll<{ id: number; filename: string; content_text: string }>(
        "SELECT id, filename, COALESCE(content_text, '') as content_text FROM knowledge_files WHERE user_id = ? AND status = 'active'",
        [userId],
      ),
    ]);

    const docs: IndexableDoc[] = [
      ...blogs.map((b) => ({
        id: b.id,
        docType: 'blog' as const,
        title: b.title,
        content: b.content || '',
      })),
      ...knowledge.map((k) => ({
        id: k.id,
        docType: 'knowledge' as const,
        title: k.filename,
        content: k.content_text || '',
      })),
    ];

    return docs;
  }
}
