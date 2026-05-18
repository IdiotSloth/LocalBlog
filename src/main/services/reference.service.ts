import { nowMySQL } from '../../shared/datetime';
import type { RefType, Reference } from '../../shared/types';
import { dbAll, dbGet, dbRun } from '../db';

interface RefRow {
  id: number;
  source_type: string;
  source_id: number;
  target_type: string;
  target_id: number;
  created_at: string;
}

export interface RefTarget {
  id: number;
  type: string;
  title: string;
}

const VALID_REF_TYPES: readonly string[] = ['blog', 'knowledge', 'note'];

export class ReferenceService {
  private static rowToReference(row: RefRow, extra?: { sourceTitle?: string; targetTitle?: string }): Reference {
    return {
      id: row.id,
      sourceType: row.source_type as RefType,
      sourceId: row.source_id,
      targetType: row.target_type as RefType,
      targetId: row.target_id,
      createdAt: row.created_at,
      ...extra,
    };
  }
  static async addRef(sourceType: string, sourceId: number, targetType: string, targetId: number): Promise<void> {
    // D54: Application-level validation replaces DB CHECK constraint
    if (!VALID_REF_TYPES.includes(sourceType) || !VALID_REF_TYPES.includes(targetType)) {
      throw new Error(`Invalid ref type: source=${sourceType}, target=${targetType}`);
    }
    const now = nowMySQL();
    await dbRun('INSERT OR IGNORE INTO refs (source_type, source_id, target_type, target_id, created_at) VALUES (?,?,?,?,?)', [
      sourceType, sourceId, targetType, targetId, now,
    ]);
  }

  static async removeRef(refId: number): Promise<void> {
    await dbRun('DELETE FROM refs WHERE id = ?', [refId]);
  }

  /** Get all items referenced BY a source */
  static async getRefsFrom(sourceType: string, sourceId: number): Promise<Reference[]> {
    const rows = await dbAll<RefRow>(
      'SELECT * FROM refs WHERE source_type = ? AND source_id = ? ORDER BY created_at DESC',
      [sourceType, sourceId],
    );
    return Promise.all(
      rows.map(async (r) => {
        const targetTitle = await ReferenceService.resolveTitle(r.target_type, r.target_id);
        return ReferenceService.rowToReference(r, { targetTitle });
      }),
    );
  }

  /** Get all items that reference TO a target */
  static async getRefsTo(targetType: string, targetId: number): Promise<Reference[]> {
    const rows = await dbAll<RefRow>(
      'SELECT * FROM refs WHERE target_type = ? AND target_id = ? ORDER BY created_at DESC',
      [targetType, targetId],
    );
    return Promise.all(
      rows.map(async (r) => {
        const sourceTitle = await ReferenceService.resolveTitle(r.source_type, r.source_id);
        return ReferenceService.rowToReference(r, { sourceTitle });
      }),
    );
  }

  /** Search items for reference picker + wikilink autocomplete */
  static async searchItems(
    userId: number,
    scope: 'blog' | 'knowledge' | 'note' | 'all',
    query: string,
  ): Promise<{ id: number; type: string; title: string }[]> {
    const results: { id: number; type: string; title: string }[] = [];
    const like = `%${query}%`;

    if (scope === 'all' || scope === 'blog') {
      const blogs = await dbAll<{ id: number; title: string }>(
        "SELECT id, title FROM blogs WHERE user_id = ? AND status = 'active' AND title LIKE ? LIMIT 10",
        [userId, like],
      );
      results.push(...blogs.map((b) => ({ id: b.id, type: 'blog', title: b.title })));
    }
    if (scope === 'all' || scope === 'knowledge') {
      const files = await dbAll<{ id: number; filename: string }>(
        "SELECT id, filename as title FROM knowledge_files WHERE user_id = ? AND status = 'active' AND filename LIKE ? LIMIT 10",
        [userId, like],
      );
      results.push(...files.map((f) => ({ id: f.id, type: 'knowledge', title: f.title })));
    }
    // R222: Support 'note' scope for wikilink autocomplete
    if (scope === 'all' || scope === 'note') {
      const notes = await dbAll<{ id: number; title: string }>(
        'SELECT id, title FROM notes WHERE user_id = ? AND (title LIKE ? OR content LIKE ?) LIMIT 10',
        [userId, like, like],
      );
      results.push(...notes.map((n) => ({ id: n.id, type: 'note', title: n.title || '(便签)' })));
    }
    return results;
  }

  private static async resolveTitle(type: string, id: number): Promise<string> {
    try {
      if (type === 'blog') {
        const row = await dbAll<{ title: string }>('SELECT title FROM blogs WHERE id = ?', [id]);
        return row[0]?.title || '(已删除)';
      }
      if (type === 'knowledge') {
        const row = await dbAll<{ filename: string }>('SELECT filename as title FROM knowledge_files WHERE id = ?', [id]);
        return row[0]?.title || '(已删除)';
      }
      if (type === 'note') {
        const row = await dbGet<{ title: string }>('SELECT title FROM notes WHERE id = ?', [id]);
        return row?.title || '(已删除)';
      }
      return '(已删除)';
    } catch {
      return '(已删除)';
    }
  }
}
