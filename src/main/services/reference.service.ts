import { dbAll, dbRun } from '../db';

interface RefRow { id: number; source_type: string; source_id: number; target_type: string; target_id: number; created_at: string; }

export interface RefTarget {
  id: number; type: string; title: string;
}

export class ReferenceService {
  static async addRef(sourceType: string, sourceId: number, targetType: string, targetId: number): Promise<void> {
    await dbRun('INSERT OR IGNORE INTO refs (source_type, source_id, target_type, target_id) VALUES (?,?,?,?)',
      [sourceType, sourceId, targetType, targetId]);
  }

  static async removeRef(refId: number): Promise<void> {
    await dbRun('DELETE FROM refs WHERE id = ?', [refId]);
  }

  /** Get all items referenced BY a source */
  static async getRefsFrom(sourceType: string, sourceId: number): Promise<(RefRow & { title: string })[]> {
    const rows = await dbAll<RefRow>('SELECT * FROM refs WHERE source_type = ? AND source_id = ? ORDER BY created_at DESC', [sourceType, sourceId]);
    return Promise.all(rows.map(async (r) => {
      const title = await ReferenceService.resolveTitle(r.target_type, r.target_id);
      return { ...r, title };
    }));
  }

  /** Get all items that reference TO a target */
  static async getRefsTo(targetType: string, targetId: number): Promise<(RefRow & { title: string })[]> {
    const rows = await dbAll<RefRow>('SELECT * FROM refs WHERE target_type = ? AND target_id = ? ORDER BY created_at DESC', [targetType, targetId]);
    return Promise.all(rows.map(async (r) => {
      const title = await ReferenceService.resolveTitle(r.source_type, r.source_id);
      return { ...r, title };
    }));
  }

  /** Search items for reference picker */
  static async searchItems(userId: number, scope: 'blog' | 'knowledge' | 'all', query: string):
    Promise<{ id: number; type: string; title: string }[]> {
    const results: { id: number; type: string; title: string }[] = [];
    const like = `%${query}%`;

    if (scope === 'all' || scope === 'blog') {
      const blogs = await dbAll<{ id: number; title: string }>(
        "SELECT id, title FROM blogs WHERE user_id = ? AND status = 'active' AND title LIKE ? LIMIT 10",
        [userId, like]);
      results.push(...blogs.map((b) => ({ id: b.id, type: 'blog', title: b.title })));
    }
    if (scope === 'all' || scope === 'knowledge') {
      const files = await dbAll<{ id: number; filename: string }>(
        "SELECT id, filename as title FROM knowledge_files WHERE user_id = ? AND status = 'active' AND filename LIKE ? LIMIT 10",
        [userId, like]);
      results.push(...files.map((f) => ({ id: f.id, type: 'knowledge', title: f.title })));
    }
    return results;
  }

  private static async resolveTitle(type: string, id: number): Promise<string> {
    try {
      if (type === 'blog') {
        const row = await dbAll<{ title: string }>('SELECT title FROM blogs WHERE id = ?', [id]);
        return row[0]?.title || '(已删除)';
      }
      const row = await dbAll<{ filename: string }>('SELECT filename as title FROM knowledge_files WHERE id = ?', [id]);
      return row[0]?.title || '(已删除)';
    } catch { return '(已删除)'; }
  }
}
