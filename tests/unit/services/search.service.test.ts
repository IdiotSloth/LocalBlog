import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../src/main/db', () => ({
  dbAll: vi.fn(),
}));

import { dbAll } from '../../../src/main/db';
import { SearchService } from '../../../src/main/services/search.service';

const mockDbAll = dbAll as ReturnType<typeof vi.fn>;

describe('SearchService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('searchBlogs', () => {
    it('should return blog search results', async () => {
      mockDbAll.mockResolvedValueOnce([
        { id: 1, title: 'First Blog', match_field: 'title' },
        { id: 2, title: 'Second Blog', match_field: 'content' },
      ]);
      const results = await SearchService.searchBlogs(1, 'Blog');
      expect(results).toHaveLength(2);
      expect(results[0]?.scope).toBe('blog');
      expect(results[0]?.id).toBe(1);
      expect(results[0]?.matchField).toBe('title');
      expect(results[1]?.matchField).toBe('content');
    });

    it('should return empty array when no matches', async () => {
      mockDbAll.mockResolvedValueOnce([]);
      const results = await SearchService.searchBlogs(1, 'NoMatch');
      expect(results).toHaveLength(0);
    });
  });

  describe('searchKnowledge', () => {
    it('should return knowledge search results with content snippet', async () => {
      mockDbAll.mockResolvedValueOnce([
        { id: 1, title: 'doc.pdf', match_field: 'pdf', content_text: 'This is a document about testing and search functionality' },
      ]);
      const results = await SearchService.searchKnowledge(1, 'testing');
      expect(results).toHaveLength(1);
      expect(results[0]?.scope).toBe('knowledge');
      expect(results[0]?.id).toBe(1);
      expect(results[0]?.snippet).toContain('testing');
    });

    it('should return empty array when no matches', async () => {
      mockDbAll.mockResolvedValueOnce([]);
      const results = await SearchService.searchKnowledge(1, 'NoMatch');
      expect(results).toHaveLength(0);
    });
  });

  describe('globalSearch', () => {
    it('should return combined blog and knowledge results', async () => {
      mockDbAll.mockResolvedValueOnce([
        { id: 1, title: 'Blog Post', match_field: 'title' },
      ]);
      mockDbAll.mockResolvedValueOnce([
        { id: 2, title: 'file.pdf', match_field: 'pdf', content_text: '' },
      ]);
      const result = await SearchService.globalSearch(1, 'test');
      expect(result.blogs).toHaveLength(1);
      expect(result.blogs[0]?.id).toBe(1);
      expect(result.knowledge).toHaveLength(1);
      expect(result.knowledge[0]?.id).toBe(2);
    });
  });

  describe('getIndexableDocuments', () => {
    it('should return blogs and knowledge files as indexable docs', async () => {
      mockDbAll.mockResolvedValueOnce([
        { id: 1, title: 'Blog 1', content: 'Content 1' },
        { id: 2, title: 'Blog 2', content: 'Content 2' },
      ]);
      mockDbAll.mockResolvedValueOnce([
        { id: 3, filename: 'File 1', content_text: 'Text 1' },
      ]);
      const docs = await SearchService.getIndexableDocuments(1);
      expect(docs).toHaveLength(3);
      expect(docs[0]?.docType).toBe('blog');
      expect(docs[0]?.title).toBe('Blog 1');
      expect(docs[1]?.docType).toBe('blog');
      expect(docs[2]?.docType).toBe('knowledge');
      expect(docs[2]?.title).toBe('File 1');
    });

    it('should return empty array when no content', async () => {
      mockDbAll.mockResolvedValueOnce([]);
      mockDbAll.mockResolvedValueOnce([]);
      const docs = await SearchService.getIndexableDocuments(1);
      expect(docs).toHaveLength(0);
    });
  });

  describe('searchAll (sql.js mode)', () => {
    it('should return null for sql.js mode (delegates to Worker)', async () => {
      const result = await SearchService.searchAll('test', 1);
      expect(result).toBeNull();
    });
  });
});
