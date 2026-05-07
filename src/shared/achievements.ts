import type { UserStats } from './types';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  emoji: string;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  condition: (stats: UserStats) => boolean;
}

export const ACHIEVEMENTS: Achievement[] = [
  // Production milestones
  {
    id: 'first-blog',
    name: '初出茅庐',
    description: '发布第一篇博客',
    emoji: '✍️',
    tier: 'bronze',
    condition: (s) => s.totalBlogs >= 1,
  },
  {
    id: 'ten-blogs',
    name: '笔耕不辍',
    description: '发布 10 篇博客',
    emoji: '📚',
    tier: 'silver',
    condition: (s) => s.totalBlogs >= 10,
  },
  {
    id: 'fifty-blogs',
    name: '著作等身',
    description: '发布 50 篇博客',
    emoji: '📖',
    tier: 'gold',
    condition: (s) => s.totalBlogs >= 50,
  },
  // Wordcount milestones
  {
    id: 'total-10k',
    name: '万字长城',
    description: '累计写作 10,000 字',
    emoji: '📜',
    tier: 'silver',
    condition: (s) => s.totalWords >= 10000,
  },
  {
    id: 'total-100k',
    name: '十万伏特',
    description: '累计写作 100,000 字',
    emoji: '⚡',
    tier: 'gold',
    condition: (s) => s.totalWords >= 100000,
  },
  // Streak milestone
  {
    id: 'streak-7',
    name: '一周战士',
    description: '连续 7 天写作',
    emoji: '🔥',
    tier: 'silver',
    condition: (s) => s.currentStreak >= 7,
  },
];

export const TIER_LABELS: Record<string, string> = {
  bronze: '🥉 铜',
  silver: '🥈 银',
  gold: '🥇 金',
  platinum: '💎 铂金',
};
