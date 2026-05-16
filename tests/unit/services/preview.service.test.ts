import { describe, expect, it, vi } from 'vitest';

vi.mock('../../../src/main/db', () => ({
  dbGet: vi.fn(),
}));

vi.mock('node:fs', () => {
  const mockFs = {
    existsSync: vi.fn().mockReturnValue(true),
    readFileSync: vi.fn().mockReturnValue('# Hello World'),
    statSync: vi.fn().mockReturnValue({ size: 100 }),
  };
  return { default: mockFs, ...mockFs };
});

import { dbGet } from '../../../src/main/db';
import { PreviewService } from '../../../src/main/services/preview.service';

const mockDbGet = dbGet as ReturnType<typeof vi.fn>;

describe('PreviewService', () => {
  describe('generatePreview', () => {
    it('should return error for non-existent file record', async () => {
      mockDbGet.mockResolvedValueOnce(undefined);
      const result = await PreviewService.generatePreview(999);
      expect(result.error).toBe('文件不存在');
    });

    it('should return error when file not found on disk', async () => {
      mockDbGet.mockResolvedValueOnce({ file_path: '/nonexistent/file.txt', filename: 'test.txt', file_type: 'txt' });
      const fs = await import('node:fs');
      fs.existsSync.mockReturnValueOnce(false);
      const result = await PreviewService.generatePreview(1);
      expect(result.error).toBe('文件不存在于磁盘');
    });

    it('should preview a text file', async () => {
      mockDbGet.mockResolvedValueOnce({ file_path: '/tmp/test.txt', filename: 'test.txt', file_type: 'txt' });
      const result = await PreviewService.generatePreview(1);
      expect(result.html).toBeDefined();
      expect(result.html).toContain('Hello World');
    });

    it('should return error for unsupported file format', async () => {
      mockDbGet.mockResolvedValueOnce({ file_path: '/tmp/test.xyz', filename: 'test.xyz', file_type: 'other' });
      const result = await PreviewService.generatePreview(1);
      expect(result.error).toBe('不支持的文件格式');
    });
  });

  describe('getFileSize', () => {
    it('should return file size', async () => {
      const size = PreviewService.getFileSize('/tmp/test.txt');
      expect(size).toBe(100);
    });
  });
});
