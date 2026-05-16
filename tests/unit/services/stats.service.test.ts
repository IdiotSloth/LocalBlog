import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../src/main/db', () => ({
  dbGet: vi.fn(),
  dbRun: vi.fn(),
  dbAll: vi.fn(),
}));

import { dbAll, dbGet } from '../../../src/main/db';
import { StatsService } from '../../../src/main/services/stats.service';

const mockDbGet = dbGet as ReturnType<typeof vi.fn>;
const mockDbAll = dbAll as ReturnType<typeof vi.fn>;

describe('StatsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getUserStats', () => {
    it('should return zeroed stats for user with no activity', async () => {
      mockDbGet
        .mockResolvedValueOnce({ total: 0, words: 0, longest: 0, mdCount: 0, htmlCount: 0 })
        .mockResolvedValueOnce({ total: 0 })
        .mockResolvedValueOnce({ unique: 0 })
        .mockResolvedValueOnce({ count: 0, words: 0 });
      mockDbAll
        .mockResolvedValueOnce([]) // timestamps
        .mockResolvedValueOnce([]) // byTag
        .mockResolvedValueOnce([]) // byFormat
        .mockResolvedValueOnce([]) // heatmap
        .mockResolvedValueOnce([]); // dates for streak
      const stats = await StatsService.getUserStats(1);
      expect(stats.totalBlogs).toBe(0);
      expect(stats.totalWords).toBe(0);
      expect(stats.totalFiles).toBe(0);
      expect(stats.currentStreak).toBe(0);
      expect(stats.longestStreak).toBe(0);
    });

    it('should return populated stats for active user', async () => {
      mockDbGet
        .mockResolvedValueOnce({ total: 5, words: 10000, longest: 5000, mdCount: 4, htmlCount: 1 })
        .mockResolvedValueOnce({ total: 3 })
        .mockResolvedValueOnce({ unique: 8 })
        .mockResolvedValueOnce({ count: 2, words: 3000 });
      mockDbAll
        .mockResolvedValueOnce([
          { created_at: '2026-05-01 10:00:00' },
          { created_at: '2026-05-02 10:00:00' },
        ])
        .mockResolvedValueOnce([{ name: 'tag1', count: 3 }, { name: 'tag2', count: 2 }])
        .mockResolvedValueOnce([{ format: 'md', count: 4 }, { format: 'html', count: 1 }])
        .mockResolvedValueOnce([{ date: '2026-05-01', count: 1 }, { date: '2026-05-02', count: 1 }])
        .mockResolvedValueOnce([{ d: '2026-05-02' }, { d: '2026-05-01' }]);
      const stats = await StatsService.getUserStats(1);
      expect(stats.totalBlogs).toBe(5);
      expect(stats.totalWords).toBe(10000);
      expect(stats.totalFiles).toBe(3);
      expect(stats.uniqueTags).toBe(8);
      expect(stats.byTag).toHaveLength(2);
      expect(stats.byFormat).toHaveLength(2);
    });

    it('should calculate streaks correctly', async () => {
      const today = new Date().toISOString().substring(0, 10);
      const yesterday = new Date(Date.now() - 86400000).toISOString().substring(0, 10);
      mockDbGet
        .mockResolvedValueOnce({ total: 3, words: 5000, longest: 2000, mdCount: 3, htmlCount: 0 })
        .mockResolvedValueOnce({ total: 0 })
        .mockResolvedValueOnce({ unique: 1 })
        .mockResolvedValueOnce({ count: 3, words: 5000 });
      mockDbAll
        .mockResolvedValueOnce([
          { created_at: `${today} 10:00:00` },
          { created_at: `${yesterday} 10:00:00` },
        ])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ format: 'md', count: 3 }])
        .mockResolvedValueOnce([{ date: today, count: 1 }, { date: yesterday, count: 1 }])
        .mockResolvedValueOnce([{ d: today }, { d: yesterday }]);
      const stats = await StatsService.getUserStats(1);
      expect(stats.currentStreak).toBeGreaterThanOrEqual(1);
    });
  });
});
