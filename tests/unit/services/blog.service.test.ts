import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../src/main/db', () => ({
  dbGet: vi.fn(),
  dbRun: vi.fn(),
  dbAll: vi.fn(),
}));

vi.mock('../../../src/main/utils/paths', () => ({
  getWorkspacePath: vi.fn().mockResolvedValue('/tmp/workspace'),
  getBlogsDir: vi.fn().mockResolvedValue('/tmp/workspace/Blogs'),
  getKnowledgeBaseDir: vi.fn(),
  getAssetsDir: vi.fn(),
  getBlogPath: vi.fn().mockResolvedValue('/tmp/workspace/Blogs/1.md'),
  getBlogAssetsDir: vi.fn().mockResolvedValue('/tmp/workspace/Assets/blog_1'),
  initWorkspaceDirectories: vi.fn(),
}));

vi.mock('node:fs', () => ({
  default: {
    existsSync: vi.fn().mockReturnValue(true),
    writeFileSync: vi.fn(),
    readFileSync: vi.fn().mockReturnValue('# Test Content'),
    mkdirSync: vi.fn(),
    renameSync: vi.fn(),
    readdirSync: vi.fn().mockReturnValue([]),
    statSync: vi.fn().mockReturnValue({ size: 1024 }),
    unlinkSync: vi.fn(),
    rmSync: vi.fn(),
    copyFileSync: vi.fn(),
  },
  existsSync: vi.fn().mockReturnValue(true),
  writeFileSync: vi.fn(),
  readFileSync: vi.fn().mockReturnValue('# Test Content'),
  mkdirSync: vi.fn(),
  renameSync: vi.fn(),
  readdirSync: vi.fn().mockReturnValue([]),
  statSync: vi.fn().mockReturnValue({ size: 1024 }),
  unlinkSync: vi.fn(),
  rmSync: vi.fn(),
  copyFileSync: vi.fn(),
}));

import { dbAll, dbGet, dbRun } from '../../../src/main/db';
import { BlogService } from '../../../src/main/services/blog.service';

const mockDbGet = dbGet as ReturnType<typeof vi.fn>;
const mockDbRun = dbRun as ReturnType<typeof vi.fn>;
const mockDbAll = dbAll as ReturnType<typeof vi.fn>;

describe('BlogService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createBlog', () => {
    it('should reject empty title', async () => {
      await expect(BlogService.createBlog(1, '', 'md', 'content')).rejects.toThrow('标题长度');
    });

    it('should reject invalid format', async () => {
      await expect(BlogService.createBlog(1, 'Test', 'pdf' as any, 'content')).rejects.toThrow('格式必须是 md 或 html');
    });

    it('should create a markdown blog successfully', async () => {
      mockDbRun.mockResolvedValue(undefined);
      mockDbGet.mockResolvedValue({
        id: 99,
        user_id: 1,
        title: 'Test',
        format: 'md',
        status: 'active',
        created_at: '2026-01-01',
        updated_at: '2026-01-01',
      });
      const blog = await BlogService.createBlog(1, 'Test', 'md', '# hello');
      expect(blog.id).toBe(99);
      expect(blog.format).toBe('md');
      expect(mockDbRun).toHaveBeenCalled();
    });
  });

  describe('getBlog', () => {
    it('should return null for non-existent blog', async () => {
      mockDbGet.mockResolvedValueOnce(undefined);
      const blog = await BlogService.getBlog(999);
      expect(blog).toBeNull();
    });

    it('should return blog with content and tags', async () => {
      mockDbGet.mockResolvedValueOnce({
        id: 1,
        user_id: 1,
        title: 'Test',
        format: 'md',
        content: '# Hello',
        status: 'active',
        created_at: '2026-01-01',
        updated_at: '2026-01-01',
      });
      mockDbAll.mockResolvedValue([]); // tags
      const blog = await BlogService.getBlog(1);
      expect(blog).not.toBeNull();
      expect(blog?.title).toBe('Test');
    });
  });

  describe('deleteBlog', () => {
    it('should throw for non-existent blog', async () => {
      mockDbGet.mockResolvedValueOnce(undefined);
      await expect(BlogService.deleteBlog(999)).rejects.toThrow('博客不存在');
    });

    it('should mark blog as trash', async () => {
      mockDbGet.mockResolvedValueOnce({
        id: 1,
        user_id: 1,
        title: 'Test',
        format: 'md',
        status: 'active',
        created_at: '2026-01-01',
        updated_at: '2026-01-01',
      });
      mockDbRun.mockResolvedValue(undefined);
      await BlogService.deleteBlog(1);
      expect(mockDbRun).toHaveBeenCalledTimes(2); // UPDATE status + INSERT recycle
    });
  });

  describe('listBlogs', () => {
    it('should return paginated blog list', async () => {
      mockDbGet.mockResolvedValueOnce({ count: 1 }); // total
      mockDbAll.mockResolvedValueOnce([
        {
          id: 1,
          user_id: 1,
          title: 'Test',
          format: 'md',
          status: 'active',
          created_at: '2026-01-01',
          updated_at: '2026-01-01',
        },
      ]);
      mockDbAll.mockResolvedValue([]); // tags
      const result = await BlogService.listBlogs({ userId: 1 });
      expect(result.total).toBe(1);
      expect(result.blogs).toHaveLength(1);
    });
  });
});
