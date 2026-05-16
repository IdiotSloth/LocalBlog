/** Shared folder SQL builders — used by main FolderService and server routes.
 *  Eliminates duplicate tree-query + duplicate-check SQL. */
import type { SqlParams } from './blog-crud';
export type { SqlParams };

/** Build folder tree query: folders + item counts */
export function buildFolderTreeQuery(userId: number, type: 'blog' | 'knowledge'): SqlParams {
  const itemTable = type === 'blog' ? 'blogs' : 'knowledge_files';
  return {
    sql: `SELECT f.*, COALESCE(cnt.c, 0) as item_count FROM folders f
     LEFT JOIN (
       SELECT folder_id, COUNT(*) as c FROM ${itemTable}
       WHERE user_id = ? AND status = 'active' GROUP BY folder_id
     ) cnt ON cnt.folder_id = f.id
     WHERE f.user_id = ? AND f.type = ?
     ORDER BY f.sort_order, f.name`,
    params: [userId, userId, type],
  };
}

/** Check for duplicate folder name at the same parent level */
export function buildFolderDuplicateCheck(userId: number, name: string, parentId: number | null, type: 'blog' | 'knowledge'): SqlParams {
  if (parentId !== null) {
    return {
      sql: 'SELECT * FROM folders WHERE user_id = ? AND name = ? AND parent_id = ? AND type = ?',
      params: [userId, name, parentId, type],
    };
  }
  return {
    sql: 'SELECT * FROM folders WHERE user_id = ? AND name = ? AND parent_id IS NULL AND type = ?',
    params: [userId, name, type],
  };
}

/** Insert a new folder */
export function buildFolderCreate(userId: number, name: string, parentId: number | null, type: 'blog' | 'knowledge', createdAt: string): SqlParams {
  return {
    sql: 'INSERT INTO folders (user_id, name, parent_id, type, created_at) VALUES (?, ?, ?, ?, ?)',
    params: [userId, name, parentId ?? null, type, createdAt],
  };
}
