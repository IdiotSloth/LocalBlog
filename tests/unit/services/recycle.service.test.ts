import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../src/main/db', () => ({
  dbGet: vi.fn(),
  dbRun: vi.fn(),
  dbAll: vi.fn(),
}));

vi.mock('../../../src/main/utils/paths', () => ({
  getWorkspacePath: vi.fn().mockResolvedValue('/tmp/workspace'),
  getBlogPath: vi.fn().mockResolvedValue('/tmp/workspace/Blogs/1.md'),
  getBlogAssetsDir: vi.fn().mockResolvedValue('/tmp/workspace/Assets/blog_1'),
}));

vi.mock('node:fs', () => ({
  existsSync: vi.fn().mockReturnValue(false),
  unlinkSync: vi.fn(),
  rmSync: vi.fn(),
}));

import { dbAll, dbGet, dbRun } from '../../../src/main/db';
import { RecycleService } from '../../../src/main/services/recycle.service';

const mockDbGet = dbGet as ReturnType<typeof vi.fn>;
const mockDbRun = dbRun as ReturnType<typeof vi.fn>;
const mockDbAll = dbAll as ReturnType<typeof vi.fn>;

describe('RecycleService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('listItems', () => {
    it('should return recycle bin items for user', async () => {
      mockDbAll.mockResolvedValueOnce([
        { id: 1, user_id: 1, item_type: 'blog', item_id: 1, deleted_at: '2026-01-01' },
        { id: 2, user_id: 1, item_type: 'knowledge_file', item_id: 2, deleted_at: '2026-01-02' },
      ]);
      const items = await RecycleService.listItems(1);
      expect(items).toHaveLength(2);
      expect(items[0]?.itemType).toBe('blog');
      expect(items[1]?.itemType).toBe('knowledge_file');
    });

    it('should return empty array when recycle bin is empty', async () => {
      mockDbAll.mockResolvedValueOnce([]);
      const items = await RecycleService.listItems(1);
      expect(items).toHaveLength(0);
    });
  });

  describe('restoreItem', () => {
    it('should throw if item not found in recycle bin', async () => {
      mockDbGet.mockResolvedValueOnce(undefined);
      await expect(RecycleService.restoreItem(1, 999, 'blog')).rejects.toThrow('回收站中未找到该项目');
    });

    it('should restore a blog item', async () => {
      mockDbGet.mockResolvedValueOnce({ id: 1, user_id: 1, item_type: 'blog', item_id: 1, deleted_at: '2026-01-01' });
      mockDbRun.mockResolvedValue(undefined);
      await RecycleService.restoreItem(1, 1, 'blog');
      expect(mockDbRun).toHaveBeenCalledWith(
        expect.stringContaining("UPDATE blogs SET status = 'active'"),
        expect.arrayContaining([1]),
      );
      expect(mockDbRun).toHaveBeenLastCalledWith(
        expect.stringContaining('DELETE FROM recycle_bin WHERE id = ?'),
        expect.arrayContaining([1]),
      );
    });

    it('should restore a knowledge file item', async () => {
      mockDbGet.mockResolvedValueOnce({ id: 2, user_id: 1, item_type: 'knowledge_file', item_id: 2, deleted_at: '2026-01-01' });
      mockDbRun.mockResolvedValue(undefined);
      await RecycleService.restoreItem(1, 2, 'knowledge_file');
      expect(mockDbRun).toHaveBeenCalledWith(
        expect.stringContaining("UPDATE knowledge_files SET status = 'active'"),
        expect.arrayContaining([2]),
      );
    });
  });

  describe('permanentlyDelete (via emptyTrash)', () => {
    it('should empty trash and return count', async () => {
      mockDbAll.mockResolvedValueOnce([
        { id: 1, user_id: 1, item_type: 'blog', item_id: 1, deleted_at: '2026-01-01' },
      ]);
      mockDbGet
        .mockResolvedValueOnce({ user_id: 1, format: 'md' }) // blog lookup
        .mockResolvedValueOnce(undefined); // blog assets dir
      mockDbRun.mockResolvedValue(undefined);
      const count = await RecycleService.emptyTrash(1);
      expect(count).toBe(1);
    });

    it('should handle empty recycle bin', async () => {
      mockDbAll.mockResolvedValueOnce([]);
      const count = await RecycleService.emptyTrash(1);
      expect(count).toBe(0);
    });
  });

  describe('autoClean', () => {
    it('should clean items older than specified days', async () => {
      mockDbAll.mockResolvedValueOnce([
        { id: 1, user_id: 1, item_type: 'blog', item_id: 1, deleted_at: '2026-01-01' },
      ]);
      mockDbGet
        .mockResolvedValueOnce({ user_id: 1, format: 'md' })
        .mockResolvedValueOnce(undefined);
      mockDbRun.mockResolvedValue(undefined);
      const count = await RecycleService.autoClean(1, 30);
      expect(count).toBe(1);
    });
  });
});
