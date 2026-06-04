import type { UserStats } from '../../shared/types';
import { dbAll, dbGet } from '../db';

export class StatsService {
  static async getUserStats(userId: number): Promise<UserStats> {
    // Blog counts
    const blogRow = await dbGet<{ total: number; words: number; longest: number; mdCount: number; htmlCount: number }>(
      `SELECT COUNT(*) as total,
        COALESCE(SUM(LENGTH(content)), 0) as words,
        COALESCE(MAX(LENGTH(content)), 0) as longest,
        SUM(CASE WHEN format = 'md' THEN 1 ELSE 0 END) as mdCount,
        SUM(CASE WHEN format = 'html' THEN 1 ELSE 0 END) as htmlCount
       FROM blogs WHERE user_id = ? AND status = 'active'`,
      [userId],
    );

    // Hour-based stats calculated from raw data
    const timestamps = await dbAll<{ created_at: string }>(
      "SELECT created_at FROM blogs WHERE user_id = ? AND status = 'active'",
      [userId],
    );
    let nightCount = 0;
    let earlyCount = 0;
    for (const t of timestamps) {
      const h = new Date(t.created_at).getHours();
      if (h >= 0 && h <= 4) nightCount++;
      else if (h >= 5 && h <= 6) earlyCount++;
    }

    // File count
    const fileRow = await dbGet<{ total: number }>(
      "SELECT COUNT(*) as total FROM knowledge_files WHERE user_id = ? AND status = 'active'",
      [userId],
    );

    // Tag count
    const tagRow = await dbGet<{ unique: number }>(
      'SELECT COUNT(DISTINCT tag_id) as unique FROM blog_tags bt JOIN blogs b ON bt.blog_id = b.id WHERE b.user_id = ?',
      [userId],
    );

    // Monthly stats
    const monthRow = await dbGet<{ count: number; words: number }>(
      `SELECT COUNT(*) as count, COALESCE(SUM(LENGTH(content)), 0) as words
       FROM blogs WHERE user_id = ? AND status = 'active'
       AND created_at >= datetime('now', '-30 days')`,
      [userId],
    );

    // Tag distribution (top 10)
    const byTag = await dbAll<{ name: string; count: number }>(
      `SELECT t.name, COUNT(*) as count FROM blog_tags bt
       JOIN tags t ON bt.tag_id = t.id
       JOIN blogs b ON bt.blog_id = b.id
       WHERE b.user_id = ? AND b.status = 'active'
       GROUP BY t.name ORDER BY count DESC LIMIT 10`,
      [userId],
    );

    // Format distribution
    const byFormat = await dbAll<{ format: string; count: number }>(
      "SELECT format, COUNT(*) as count FROM blogs WHERE user_id = ? AND status = 'active' GROUP BY format",
      [userId],
    );

    // Heatmap (last 365 days)
    const heatmap = await dbAll<{ date: string; count: number }>(
      `SELECT DATE(created_at) as date, COUNT(*) as count
       FROM blogs WHERE user_id = ? AND status = 'active'
       AND created_at >= datetime('now', '-365 days')
       GROUP BY DATE(created_at) ORDER BY date`,
      [userId],
    );

    // Streak calculation
    const allDates = await dbAll<{ d: string }>(
      `SELECT DISTINCT DATE(created_at) as d FROM blogs WHERE user_id = ? AND status = 'active' ORDER BY d DESC`,
      [userId],
    );
    const { currentStreak, longestStreak } = calcStreak(allDates.map((r) => r.d));

    // T2306: Additional entity counts for sidebar badges
    const noteRow = await dbGet<{ total: number }>(
      'SELECT COUNT(*) as total FROM notes WHERE user_id = ?',
      [userId],
    );
    const seriesRow = await dbGet<{ total: number }>(
      'SELECT COUNT(DISTINCT series_id) as total FROM blogs WHERE user_id = ? AND series_id IS NOT NULL AND series_id != \'\'',
      [userId],
    );
    const bookmarkRow = await dbGet<{ total: number }>(
      'SELECT COUNT(*) as total FROM bookmarks WHERE user_id = ?',
      [userId],
    );
    const wbRow = await dbGet<{ total: number }>(
      'SELECT COUNT(*) as total FROM whiteboards WHERE user_id = ?',
      [userId],
    );

    return {
      totalBlogs: blogRow?.total || 0,
      totalWords: blogRow?.words || 0,
      totalFiles: fileRow?.total || 0,
      longestBlog: blogRow?.longest || 0,
      currentStreak,
      longestStreak,
      uniqueTags: tagRow?.unique || 0,
      totalNotes: noteRow?.total || 0,
      totalSeries: seriesRow?.total || 0,
      totalBookmarks: bookmarkRow?.total || 0,
      totalWhiteboards: wbRow?.total || 0,
      hasMdBlog: (blogRow?.mdCount || 0) > 0,
      hasHtmlBlog: (blogRow?.htmlCount || 0) > 0,
      hasNightBlog: nightCount > 0,
      hasEarlyBlog: earlyCount > 0,
      monthlyCount: monthRow?.count || 0,
      monthlyWords: monthRow?.words || 0,
      byTag,
      byFormat,
      heatmap,
    };
  }
}

function calcStreak(dates: string[]): { currentStreak: number; longestStreak: number } {
  if (dates.length === 0) return { currentStreak: 0, longestStreak: 0 };

  let currentStreak = 1;
  let longestStreak = 1;
  let tempStreak = 1;

  for (let i = 1; i < dates.length; i++) {
    const prev = new Date(dates[i - 1]!);
    const curr = new Date(dates[i]!);
    const diff = (prev.getTime() - curr.getTime()) / (1000 * 60 * 60 * 24);
    if (Math.abs(diff - 1) < 0.1) {
      tempStreak++;
    } else {
      tempStreak = 1;
    }
    if (tempStreak > longestStreak) longestStreak = tempStreak;
  }

  // Current streak: check if today or yesterday is in dates
  const today = new Date().toISOString().substring(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().substring(0, 10);
  if (dates[0] !== today && dates[0] !== yesterday) {
    currentStreak = 0;
  } else {
    currentStreak = tempStreak;
  }

  return { currentStreak, longestStreak };
}

interface DailyStats {
  date: string;
  blogCount: number;
  wordCount: number;
}

export async function getDailyStats(userId: number): Promise<DailyStats[]> {
  return dbAll<DailyStats>(
    `SELECT DATE(created_at) as date, COUNT(*) as blogCount, COALESCE(SUM(LENGTH(content)), 0) as wordCount
     FROM blogs WHERE user_id = ? AND status = 'active'
     AND created_at >= datetime('now', '-365 days')
     GROUP BY DATE(created_at) ORDER BY date`,
    [userId],
  );
}
