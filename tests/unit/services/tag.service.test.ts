import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../src/main/db', () => ({
  dbGet: vi.fn(),
  dbRun: vi.fn(),
  dbAll: vi.fn(),
}));

import { dbAll, dbGet, dbRun } from '../../../src/main/db';
import { TagService } from '../../../src/main/services/tag.service';

const mockDbGet = dbGet as ReturnType<typeof vi.fn>;
const mockDbRun = dbRun as ReturnType<typeof vi.fn>;
const mockDbAll = dbAll as ReturnType<typeof vi.fn>;

describe('TagService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createTag', () => {
    it('should reject empty tag name', async () => {
      await expect(TagService.createTag(1, '  ')).rejects.toThrow('标签名不能为空');
    });

    it('should reject duplicate tag name', async () => {
      mockDbGet.mockResolvedValueOnce({ id: 1, user_id: 1, name: 'existing' });
      await expect(TagService.createTag(1, 'existing')).rejects.toThrow('标签已存在');
    });

    it('should create a tag and return it', async () => {
      mockDbGet.mockResolvedValueOnce(undefined); // duplicate check
      mockDbRun.mockResolvedValue(undefined);
      mockDbGet.mockResolvedValueOnce({ id: 1, user_id: 1, name: 'new-tag' }); // SELECT after INSERT
      const tag = await TagService.createTag(1, 'new-tag');
      expect(tag.name).toBe('new-tag');
      expect(tag.id).toBe(1);
    });
  });

  describe('updateTag', () => {
    it('should reject empty tag name', async () => {
      await expect(TagService.updateTag(1, 1, '  ')).rejects.toThrow('标签名不能为空');
    });

    it('should update tag name', async () => {
      mockDbRun.mockResolvedValue(undefined);
      await TagService.updateTag(1, 1, 'renamed');
      expect(mockDbRun).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE tags SET name = ?'),
        expect.arrayContaining(['renamed', 1, 1]),
      );
    });

    it('should update tag name and description', async () => {
      mockDbRun.mockResolvedValue(undefined);
      await TagService.updateTag(1, 1, 'renamed', 'New description');
      expect(mockDbRun).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE tags SET name = ?, description = ?'),
        expect.arrayContaining(['renamed', 'New description', 1, 1]),
      );
    });
  });

  describe('deleteTag', () => {
    it('should delete tag', async () => {
      mockDbRun.mockResolvedValue(undefined);
      await TagService.deleteTag(1, 1);
      expect(mockDbRun).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM tags WHERE id = ?'),
        expect.arrayContaining([1, 1]),
      );
    });
  });

  describe('listTags', () => {
    it('should return all tags with counts for user', async () => {
      mockDbAll.mockResolvedValueOnce([
        { id: 1, user_id: 1, name: 'tag1', description: null, blogCount: 2, kbCount: 1, count: 3 },
        { id: 2, user_id: 1, name: 'tag2', description: 'desc', blogCount: 0, kbCount: 0, count: 0 },
      ]);
      const tags = await TagService.listTags(1);
      expect(tags).toHaveLength(2);
      expect(tags[0]?.name).toBe('tag1');
      expect(tags[0]?.count).toBe(3);
      expect(tags[0]?.blogCount).toBe(2);
      expect(tags[0]?.kbCount).toBe(1);
      expect(tags[1]?.name).toBe('tag2');
      expect(tags[1]?.count).toBe(0);
      expect(tags[1]?.blogCount).toBe(0);
      expect(tags[1]?.kbCount).toBe(0);
    });
  });
});
