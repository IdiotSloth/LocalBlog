import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../src/main/db', () => ({
  dbGet: vi.fn(),
  dbRun: vi.fn(),
  dbAll: vi.fn(),
}));

vi.mock('../../../src/main/utils/paths', () => ({
  getKnowledgeBaseDir: vi.fn().mockResolvedValue('/tmp/workspace/KnowledgeBase'),
  initWorkspaceDirectories: vi.fn(),
}));

vi.mock('node:fs', () => ({
  default: {
    existsSync: vi.fn().mockReturnValue(true),
    writeFileSync: vi.fn(),
    readFileSync: vi.fn().mockReturnValue('test content'),
    mkdirSync: vi.fn(),
    renameSync: vi.fn(),
    readdirSync: vi.fn().mockReturnValue([]),
    statSync: vi.fn().mockReturnValue({ size: 100 }),
    unlinkSync: vi.fn(),
    rmSync: vi.fn(),
    copyFileSync: vi.fn(),
  },
  existsSync: vi.fn().mockReturnValue(true),
  writeFileSync: vi.fn(),
  readFileSync: vi.fn().mockReturnValue('test content'),
  mkdirSync: vi.fn(),
  renameSync: vi.fn(),
  readdirSync: vi.fn().mockReturnValue([]),
  statSync: vi.fn().mockReturnValue({ size: 100 }),
  unlinkSync: vi.fn(),
  rmSync: vi.fn(),
  copyFileSync: vi.fn(),
}));

import { dbAll, dbGet, dbRun } from '../../../src/main/db';
import { KnowledgeService } from '../../../src/main/services/knowledge.service';

const mockDbGet = dbGet as ReturnType<typeof vi.fn>;
const mockDbRun = dbRun as ReturnType<typeof vi.fn>;
const mockDbAll = dbAll as ReturnType<typeof vi.fn>;

describe('KnowledgeService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('importFiles', () => {
    it('should import a file and return it in list', async () => {
      // INSERT does not return anything in mock
      mockDbRun.mockResolvedValue(undefined);
      // After INSERT, service SELECTs the row back
      mockDbGet.mockResolvedValue({
        id: 1,
        user_id: 1,
        filename: 'test.md',
        file_path: '/tmp/test.md',
        file_type: 'txt',
        file_size: 100,
        status: 'active',
        created_at: '2026-01-01',
        updated_at: '2026-01-01',
      });
      const files = await KnowledgeService.importFiles(1, ['/tmp/test.md'], false);
      expect(files).toHaveLength(1);
      expect(files[0]?.filename).toBe('test.md');
    });
  });

  describe('getFile', () => {
    it('should return null for non-existent file', async () => {
      mockDbGet.mockResolvedValueOnce(undefined);
      const file = await KnowledgeService.getFile(999);
      expect(file).toBeNull();
    });

    it('should return file with tags for existing file', async () => {
      mockDbGet.mockResolvedValueOnce({
        id: 1,
        user_id: 1,
        filename: 'doc.pdf',
        file_path: '/tmp/doc.pdf',
        file_type: 'pdf',
        file_size: 5000,
        status: 'active',
        created_at: '2026-01-01',
        updated_at: '2026-01-01',
      });
      mockDbAll.mockResolvedValue([]); // tags
      const file = await KnowledgeService.getFile(1);
      expect(file).not.toBeNull();
      expect(file?.filename).toBe('doc.pdf');
      expect(file?.fileType).toBe('pdf');
    });
  });

  describe('deleteFile', () => {
    it('should throw for non-existent file', async () => {
      mockDbGet.mockResolvedValueOnce(undefined);
      await expect(KnowledgeService.deleteFile(1, 999, false)).rejects.toThrow('文件不存在');
    });

    it('should mark file as trash and insert recycle record', async () => {
      mockDbGet.mockResolvedValueOnce({
        id: 1,
        user_id: 1,
        filename: 'test.md',
        file_path: '/tmp/test.md',
        file_type: 'txt',
        file_size: 100,
        status: 'active',
        created_at: '2026-01-01',
        updated_at: '2026-01-01',
      });
      mockDbRun.mockResolvedValue(undefined);
      await KnowledgeService.deleteFile(1, 1, true);
      // SELECT + UPDATE status + INSERT recycle
      expect(mockDbRun).toHaveBeenCalledTimes(2);
      expect(mockDbRun).toHaveBeenCalledWith(
        expect.stringContaining("UPDATE knowledge_files SET status = 'trash'"),
        expect.any(Array),
      );
    });
  });

  describe('listFiles', () => {
    it('should return paginated file list', async () => {
      mockDbGet.mockResolvedValueOnce({ count: 1 }); // total
      mockDbAll.mockResolvedValueOnce([
        {
          id: 1,
          user_id: 1,
          filename: 'doc.pdf',
          file_path: '/tmp/doc.pdf',
          file_type: 'pdf',
          file_size: 5000,
          status: 'active',
          created_at: '2026-01-01',
          updated_at: '2026-01-01',
        },
      ]);
      mockDbAll.mockResolvedValue([]); // tags
      const result = await KnowledgeService.listFiles({ userId: 1 });
      expect(result.total).toBe(1);
      expect(result.files).toHaveLength(1);
    });
  });
});
