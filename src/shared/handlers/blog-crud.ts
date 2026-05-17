/** Shared blog CRUD SQL builders -- used by both Electron main IPC and Express server routes.
 *  Eliminates duplicate SQL strings between blog.service.ts and server/routes/blog.ts. */

import { nowMySQL } from '../datetime';
import type { Blog, BlogFormat, ItemStatus } from '../types';

export interface SqlParams {
  sql: string;
  params: unknown[];
}

/** SELECT * FROM blogs WHERE id = ? */
export function buildBlogSelect(id: number): SqlParams {
  return { sql: 'SELECT * FROM blogs WHERE id = ?', params: [id] };
}

/** SELECT * FROM blogs WHERE id = ? AND user_id = ? */
export function buildBlogSelectByUser(id: number, userId: number): SqlParams {
  return { sql: 'SELECT * FROM blogs WHERE id = ? AND user_id = ?', params: [id, userId] };
}

/** INSERT INTO blogs (...) VALUES (...) */
export function buildBlogCreate(userId: number, title: string, format: string, content: string): SqlParams {
  const now = nowMySQL();
  return {
    sql: 'INSERT INTO blogs (user_id, title, format, content, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
    params: [userId, title, format, content, now, now],
  };
}

/** UPDATE blogs SET title = ?, content = ?, format = ?, updated_at = ? WHERE id = ? AND user_id = ?
 *  Full-field update; for partial updates callers should build inline. */
export function buildBlogUpdate(id: number, userId: number, title: string, content: string, format: string): SqlParams {
  const now = nowMySQL();
  return {
    sql: 'UPDATE blogs SET title = ?, content = ?, format = ?, updated_at = ? WHERE id = ? AND user_id = ?',
    params: [title, content, format, now, id, userId],
  };
}

/** Soft-delete: UPDATE blogs SET status='trash', updated_at=? WHERE id = ? AND user_id = ? */
export function buildBlogDelete(id: number, userId: number): SqlParams {
  const now = nowMySQL();
  return {
    sql: "UPDATE blogs SET status = 'trash', updated_at = ? WHERE id = ? AND user_id = ?",
    params: [now, id, userId],
  };
}

/** Soft-delete without userId guard (used after ownership check): UPDATE blogs SET status='trash', updated_at=? WHERE id = ? */
export function buildBlogDeleteById(id: number): SqlParams {
  const now = nowMySQL();
  return {
    sql: "UPDATE blogs SET status = 'trash', updated_at = ? WHERE id = ?",
    params: [now, id],
  };
}

/** Restore: UPDATE blogs SET status='active', updated_at=? WHERE id = ? AND user_id = ? */
export function buildBlogRestore(id: number, userId: number): SqlParams {
  const now = nowMySQL();
  return {
    sql: "UPDATE blogs SET status = 'active', updated_at = ? WHERE id = ? AND user_id = ?",
    params: [now, id, userId],
  };
}

/** Restore without userId guard: UPDATE blogs SET status='active', updated_at=? WHERE id = ? */
export function buildBlogRestoreById(id: number): SqlParams {
  const now = nowMySQL();
  return {
    sql: "UPDATE blogs SET status = 'active', updated_at = ? WHERE id = ?",
    params: [now, id],
  };
}

/** INSERT INTO blog_drafts (blog_id, content, saved_at) VALUES (?, ?, ?) */
export function buildBlogDraftInsert(blogId: number, content: string): SqlParams {
  const now = nowMySQL();
  return {
    sql: 'INSERT INTO blog_drafts (blog_id, content, saved_at) VALUES (?, ?, ?)',
    params: [blogId, content, now],
  };
}

/** INSERT INTO recycle_bin (user_id, item_type, item_id, deleted_at) VALUES (?, ?, ?, ?) */
export function buildRecycleInsert(userId: number, itemType: string, itemId: number): SqlParams {
  const now = nowMySQL();
  return {
    sql: 'INSERT INTO recycle_bin (user_id, item_type, item_id, deleted_at) VALUES (?, ?, ?, ?)',
    params: [userId, itemType, itemId, now],
  };
}

/** SELECT t.id, t.user_id, t.name FROM tags t JOIN blog_tags bt ON bt.tag_id = t.id WHERE bt.blog_id = ? */
export function buildBlogTagsSelect(blogId: number): SqlParams {
  return {
    sql: 'SELECT t.id, t.user_id, t.name FROM tags t JOIN blog_tags bt ON bt.tag_id = t.id WHERE bt.blog_id = ?',
    params: [blogId],
  };
}

/** DELETE FROM blog_tags WHERE blog_id = ? */
export function buildBlogTagsDelete(blogId: number): SqlParams {
  return { sql: 'DELETE FROM blog_tags WHERE blog_id = ?', params: [blogId] };
}

/** SELECT id FROM blogs WHERE id = ? AND user_id = ? (for ownership checks) */
export function buildBlogOwnershipCheck(blogId: number, userId: number): SqlParams {
  return { sql: 'SELECT id FROM blogs WHERE id = ? AND user_id = ?', params: [blogId, userId] };
}

/** SELECT * FROM blogs WHERE id = ? AND status = ? (for trash check) */
export function buildBlogSelectTrash(id: number): SqlParams {
  return { sql: "SELECT * FROM blogs WHERE id = ? AND status = ?", params: [id, 'trash'] };
}

/** DELETE FROM recycle_bin WHERE item_type = ? AND item_id = ? AND user_id = ? */
export function buildRecycleDelete(itemType: string, itemId: number, userId: number): SqlParams {
  return {
    sql: 'DELETE FROM recycle_bin WHERE item_type = ? AND item_id = ? AND user_id = ?',
    params: [itemType, itemId, userId],
  };
}

/** DELETE FROM recycle_bin WHERE item_type = ? AND item_id = ? (without userId) */
export function buildRecycleDeleteByType(itemType: string, itemId: number): SqlParams {
  return {
    sql: 'DELETE FROM recycle_bin WHERE item_type = ? AND item_id = ?',
    params: [itemType, itemId],
  };
}

/** SELECT * FROM blog_drafts WHERE id = ? AND blog_id = ? */
export function buildBlogDraftSelect(draftId: number, blogId: number): SqlParams {
  return {
    sql: 'SELECT * FROM blog_drafts WHERE id = ? AND blog_id = ?',
    params: [draftId, blogId],
  };
}

/** SELECT id, blog_id, content, saved_at FROM blog_drafts WHERE blog_id = ? ORDER BY saved_at DESC LIMIT 20 */
export function buildBlogHistorySelect(blogId: number): SqlParams {
  return {
    sql: 'SELECT id, blog_id, content, saved_at FROM blog_drafts WHERE blog_id = ? ORDER BY saved_at DESC LIMIT 20',
    params: [blogId],
  };
}

/** SELECT bd.* FROM blog_drafts bd JOIN blogs b ON b.id = bd.blog_id WHERE bd.blog_id = ? AND b.user_id = ? ORDER BY bd.saved_at DESC LIMIT 20 */
export function buildBlogHistorySelectByUser(blogId: number, userId: number): SqlParams {
  return {
    sql: `SELECT bd.* FROM blog_drafts bd JOIN blogs b ON b.id = bd.blog_id
     WHERE bd.blog_id = ? AND b.user_id = ? ORDER BY bd.saved_at DESC LIMIT 20`,
    params: [blogId, userId],
  };
}

/** Map a snake_case DB row to a camelCase Blog object.
 *  Content and tags should be added at call sites when needed. */
export function mapBlogRow(row: Record<string, unknown>): Blog {
  return {
    id: row.id as number,
    userId: row.user_id as number,
    title: row.title as string,
    format: row.format as BlogFormat,
    status: row.status as ItemStatus,
    seriesId: row.series_id as string | undefined,
    seriesName: row.series_name as string | undefined,
    folderId: row.folder_id as number | null | undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}
