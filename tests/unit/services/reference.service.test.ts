import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../src/main/db', () => ({
  dbGet: vi.fn(),
  dbRun: vi.fn(),
  dbAll: vi.fn(),
}));

import { dbAll, dbGet, dbRun } from '../../../src/main/db';
import { ReferenceService } from '../../../src/main/services/reference.service';

const mockDbGet = dbGet as ReturnType<typeof vi.fn>;
const mockDbRun = dbRun as ReturnType<typeof vi.fn>;
const mockDbAll = dbAll as ReturnType<typeof vi.fn>;

describe('ReferenceService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('addRef', () => {
    it('should insert a reference', async () => {
      mockDbRun.mockResolvedValue(undefined);
      await ReferenceService.addRef('blog', 1, 'knowledge', 2);
      expect(mockDbRun).toHaveBeenCalledWith(
        expect.stringContaining('INSERT OR IGNORE INTO refs'),
        expect.arrayContaining(['blog', 1, 'knowledge', 2]),
      );
    });
  });

  describe('removeRef', () => {
    it('should delete a reference by id', async () => {
      mockDbRun.mockResolvedValue(undefined);
      await ReferenceService.removeRef(1);
      expect(mockDbRun).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM refs WHERE id = ?'),
        [1],
      );
    });
  });

  describe('getRefsFrom', () => {
    it('should return references from a source', async () => {
      mockDbAll.mockResolvedValueOnce([
        { id: 1, source_type: 'blog', source_id: 1, target_type: 'knowledge', target_id: 2, created_at: '2026-01-01' },
      ]);
      mockDbAll.mockResolvedValueOnce([{ filename: 'ref-file' }]); // resolve title
      const refs = await ReferenceService.getRefsFrom('blog', 1);
      expect(refs).toHaveLength(1);
      expect(refs[0]?.targetType).toBe('knowledge');
    });
  });

  describe('getRefsTo', () => {
    it('should return references pointing to a target', async () => {
      mockDbAll.mockResolvedValueOnce([
        { id: 1, source_type: 'blog', source_id: 2, target_type: 'knowledge', target_id: 1, created_at: '2026-01-01' },
      ]);
      mockDbAll.mockResolvedValueOnce([{ title: 'source-blog' }]); // resolve title
      const refs = await ReferenceService.getRefsTo('knowledge', 1);
      expect(refs).toHaveLength(1);
      expect(refs[0]?.sourceType).toBe('blog');
    });
  });

  describe('searchItems', () => {
    it('should search blogs and knowledge files', async () => {
      mockDbAll
        .mockResolvedValueOnce([{ id: 1, title: 'Test Blog' }]) // blogs
        .mockResolvedValueOnce([{ id: 2, title: 'Test File' }]); // knowledge
      const results = await ReferenceService.searchItems(1, 'all', 'Test');
      expect(results).toHaveLength(2);
      expect(results[0]?.type).toBe('blog');
      expect(results[1]?.type).toBe('knowledge');
    });

    it('should search only blogs when scope is blog', async () => {
      mockDbAll.mockResolvedValueOnce([{ id: 1, title: 'Test Blog' }]);
      const results = await ReferenceService.searchItems(1, 'blog', 'Test');
      expect(results).toHaveLength(1);
      expect(results[0]?.type).toBe('blog');
    });
  });
});
