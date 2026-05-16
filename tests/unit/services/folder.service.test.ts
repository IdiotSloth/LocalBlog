import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../src/main/db', () => ({
  dbGet: vi.fn(),
  dbRun: vi.fn(),
  dbAll: vi.fn(),
}));

import { dbAll, dbGet, dbRun } from '../../../src/main/db';
import { FolderService } from '../../../src/main/services/folder.service';

const mockDbGet = dbGet as ReturnType<typeof vi.fn>;
const mockDbRun = dbRun as ReturnType<typeof vi.fn>;
const mockDbAll = dbAll as ReturnType<typeof vi.fn>;

describe('FolderService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createFolder', () => {
    it('should reject empty folder name', async () => {
      await expect(FolderService.createFolder(1, '  ', 'blog')).rejects.toThrow('文件夹名不能为空');
    });

    it('should reject duplicate folder name', async () => {
      mockDbGet.mockResolvedValueOnce({ id: 1, user_id: 1, name: 'existing', parent_id: null, type: 'blog' });
      await expect(FolderService.createFolder(1, 'existing', 'blog')).rejects.toThrow('同名文件夹已存在');
    });

    it('should create a folder and return it', async () => {
      mockDbGet.mockResolvedValueOnce(undefined); // duplicate check
      mockDbRun.mockResolvedValue(undefined);
      mockDbGet.mockResolvedValueOnce({ id: 1, user_id: 1, name: 'new-folder', parent_id: null, type: 'blog', sort_order: 0, created_at: '2026-01-01' });
      const folder = await FolderService.createFolder(1, 'new-folder', 'blog');
      expect(folder.name).toBe('new-folder');
      expect(folder.id).toBe(1);
    });
  });

  describe('getFolderTree', () => {
    it('should return folder tree for user', async () => {
      mockDbAll.mockResolvedValueOnce([
        { id: 1, user_id: 1, name: 'Root', parent_id: null, type: 'blog', sort_order: 0, created_at: '2026-01-01', item_count: 2 },
        { id: 2, user_id: 1, name: 'Child', parent_id: 1, type: 'blog', sort_order: 0, created_at: '2026-01-02', item_count: 0 },
      ]);
      const tree = await FolderService.getFolderTree(1, 'blog');
      expect(tree).toHaveLength(1);
      expect(tree[0]?.name).toBe('Root');
      expect(tree[0]?.children).toHaveLength(1);
      expect(tree[0]?.children[0]?.name).toBe('Child');
    });

    it('should return empty array when no folders exist', async () => {
      mockDbAll.mockResolvedValueOnce([]);
      const tree = await FolderService.getFolderTree(1, 'knowledge');
      expect(tree).toHaveLength(0);
    });
  });

  describe('moveFolder', () => {
    it('should move item to folder', async () => {
      mockDbRun.mockResolvedValue(undefined);
      await FolderService.moveToFolder(1, 'blog', 1, 2);
      expect(mockDbRun).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE blogs SET folder_id ='),
        expect.arrayContaining([2, 1]),
      );
    });

    it('should move item to root (null folder)', async () => {
      mockDbRun.mockResolvedValue(undefined);
      await FolderService.moveToFolder(1, 'knowledge_file', 1, null);
      expect(mockDbRun).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE knowledge_files SET folder_id ='),
        expect.arrayContaining([null, 1]),
      );
    });
  });

  describe('deleteFolder', () => {
    it('should delete folder by id', async () => {
      mockDbRun.mockResolvedValue(undefined);
      await FolderService.deleteFolder(1, 1);
      expect(mockDbRun).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM folders WHERE id = ?'),
        expect.arrayContaining([1, 1]),
      );
    });
  });
});
