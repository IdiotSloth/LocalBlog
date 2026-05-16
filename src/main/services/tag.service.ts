import type { Tag } from '../../shared/types';
import { dbAll, dbGet, dbRun } from '../db';

export class TagService {
  static async listTags(userId: number): Promise<(Tag & { count: number; blogCount: number; kbCount: number })[]> {
    return dbAll<Tag & { count: number; blogCount: number; kbCount: number }>(
      `SELECT t.id, t.user_id, t.name, t.description,
        (SELECT COUNT(*) FROM blog_tags bt WHERE bt.tag_id = t.id) as blogCount,
        (SELECT COUNT(*) FROM knowledge_file_tags kft WHERE kft.tag_id = t.id) as kbCount,
        (SELECT COUNT(*) FROM blog_tags bt WHERE bt.tag_id = t.id) +
        (SELECT COUNT(*) FROM knowledge_file_tags kft WHERE kft.tag_id = t.id) as count
       FROM tags t WHERE t.user_id = ? ORDER BY t.name ASC`,
      [userId],
    );
  }
  static async createTag(userId: number, name: string): Promise<Tag> {
    const trimmed = name.trim();
    if (!trimmed) throw new Error('标签名不能为空');
    const existing = await dbGet<Tag>('SELECT * FROM tags WHERE user_id = ? AND name = ?', [userId, trimmed]);
    if (existing) throw new Error('标签已存在');
    await dbRun('INSERT INTO tags (user_id, name) VALUES (?, ?)', [userId, trimmed]);
    const row = await dbGet<Tag>('SELECT * FROM tags WHERE user_id = ? AND name = ?', [userId, trimmed]);
    if (!row) throw new Error('创建标签失败');
    return row;
  }
  static async updateTag(userId: number, tagId: number, name: string, description?: string): Promise<void> {
    const t = name.trim();
    if (!t) throw new Error('标签名不能为空');
    if (description !== undefined) {
      await dbRun('UPDATE tags SET name = ?, description = ? WHERE id = ? AND user_id = ?', [t, description, tagId, userId]);
    } else {
      await dbRun('UPDATE tags SET name = ? WHERE id = ? AND user_id = ?', [t, tagId, userId]);
    }
  }
  static async deleteTag(userId: number, tagId: number): Promise<void> {
    await dbRun('DELETE FROM tags WHERE id = ? AND user_id = ?', [tagId, userId]);
  }
}
