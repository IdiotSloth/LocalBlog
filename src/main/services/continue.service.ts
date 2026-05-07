import { dbAll, dbGet } from '../db';
import type { DraftItem, LastBlog, RecentFile } from '../../shared/types';

export class ContinueService {
  static async getRecentDrafts(userId: number): Promise<DraftItem[]> {
    return dbAll<DraftItem>(
      `SELECT d.id, d.blog_id as blogId, b.title as blogTitle, d.content, d.saved_at as savedAt
       FROM blog_drafts d JOIN blogs b ON d.blog_id = b.id
       WHERE b.user_id = ? AND b.status = 'active'
       ORDER BY d.saved_at DESC LIMIT 3`,
      [userId],
    );
  }

  static async getLastBlog(userId: number): Promise<LastBlog | null> {
    return dbGet<LastBlog>(
      `SELECT id, title, updated_at as updatedAt
       FROM blogs WHERE user_id = ? AND status = 'active'
       ORDER BY updated_at DESC LIMIT 1`,
      [userId],
    );
  }

  static async getRecentFiles(userId: number): Promise<RecentFile[]> {
    return dbAll<RecentFile>(
      `SELECT id, filename, created_at as createdAt
       FROM knowledge_files WHERE user_id = ? AND status = 'active'
       ORDER BY created_at DESC LIMIT 5`,
      [userId],
    );
  }
}
