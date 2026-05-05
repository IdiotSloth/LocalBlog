import type { FolderTreeNode } from '../../shared/types';
import { dbAll, dbGet, dbRun } from '../db';

interface FolderRow {
  id: number;
  user_id: number;
  name: string;
  parent_id: number | null;
  type: string;
  sort_order: number;
  created_at: string;
}

export class FolderService {
  static async getFolderTree(userId: number, type: 'blog' | 'knowledge'): Promise<FolderTreeNode[]> {
    const folders = await dbAll<FolderRow & { item_count: number }>(
      `SELECT f.*, COALESCE(cnt.c, 0) as item_count FROM folders f
       LEFT JOIN (
         SELECT folder_id, COUNT(*) as c FROM ${type === 'blog' ? 'blogs' : 'knowledge_files'}
         WHERE user_id = ? AND status = 'active' GROUP BY folder_id
       ) cnt ON cnt.folder_id = f.id
       WHERE f.user_id = ? AND f.type = ?
       ORDER BY f.sort_order, f.name`,
      [userId, userId, type],
    );

    return buildTree(folders);
  }

  static async createFolder(userId: number, name: string, type: string, parentId?: number): Promise<FolderRow> {
    const trimmed = name.trim();
    if (!trimmed) throw new Error('文件夹名不能为空');

    // MySQL: IS only accepts literal NULL — split query by parentId presence
    const existing =
      parentId != null
        ? await dbGet<FolderRow>(
            'SELECT * FROM folders WHERE user_id = ? AND name = ? AND parent_id = ? AND type = ?',
            [userId, trimmed, parentId, type],
          )
        : await dbGet<FolderRow>(
            'SELECT * FROM folders WHERE user_id = ? AND name = ? AND parent_id IS NULL AND type = ?',
            [userId, trimmed, type],
          );
    if (existing) throw new Error('同名文件夹已存在');

    await dbRun('INSERT INTO folders (user_id, name, parent_id, type, created_at) VALUES (?, ?, ?, ?, ?)', [
      userId,
      trimmed,
      parentId ?? null,
      type,
      new Date().toISOString(),
    ]);

    const row = await dbGet<FolderRow>(
      'SELECT * FROM folders WHERE user_id = ? AND name = ? AND type = ? ORDER BY id DESC LIMIT 1',
      [userId, trimmed, type],
    );
    if (!row) throw new Error('创建文件夹失败');
    return row;
  }

  static async renameFolder(folderId: number, name: string): Promise<void> {
    const trimmed = name.trim();
    if (!trimmed) throw new Error('文件夹名不能为空');
    await dbRun('UPDATE folders SET name = ? WHERE id = ?', [trimmed, folderId]);
  }

  static async deleteFolder(folderId: number): Promise<void> {
    // Children get parent set to null (ON DELETE SET NULL in schema)
    await dbRun('DELETE FROM folders WHERE id = ?', [folderId]);
  }

  static async moveToFolder(
    itemType: 'blog' | 'knowledge_file',
    itemId: number,
    folderId: number | null,
  ): Promise<void> {
    const table = itemType === 'blog' ? 'blogs' : 'knowledge_files';
    await dbRun(`UPDATE ${table} SET folder_id = ?, updated_at = ? WHERE id = ?`, [
      folderId,
      new Date().toISOString(),
      itemId,
    ]);
  }
}

function buildTree(rows: (FolderRow & { item_count: number })[]): FolderTreeNode[] {
  const map = new Map<number, FolderTreeNode>();

  for (const r of rows) {
    map.set(r.id, {
      id: r.id,
      name: r.name,
      parentId: r.parent_id,
      type: r.type,
      itemCount: r.item_count,
      children: [],
    });
  }

  const roots: FolderTreeNode[] = [];
  for (const node of map.values()) {
    if (node.parentId && map.has(node.parentId)) {
      map.get(node.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}
