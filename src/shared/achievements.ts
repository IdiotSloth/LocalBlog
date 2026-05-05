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
  // Production
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
  // Word count
  {
    id: 'first-1k',
    name: '千字文',
    description: '单篇博客超 1000 字',
    emoji: '📝',
    tier: 'bronze',
    condition: (s) => s.longestBlog >= 1000,
  },
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
  // Streaks
  {
    id: 'streak-3',
    name: '三天打鱼',
    description: '连续 3 天写作',
    emoji: '🔥',
    tier: 'bronze',
    condition: (s) => s.currentStreak >= 3,
  },
  {
    id: 'streak-7',
    name: '一周战士',
    description: '连续 7 天写作',
    emoji: '🔥',
    tier: 'silver',
    condition: (s) => s.currentStreak >= 7,
  },
  {
    id: 'streak-30',
    name: '月度之星',
    description: '连续 30 天写作',
    emoji: '⭐',
    tier: 'gold',
    condition: (s) => s.currentStreak >= 30,
  },
  // KB
  {
    id: 'first-file',
    name: '知识收集者',
    description: '导入第一个知识库文件',
    emoji: '📁',
    tier: 'bronze',
    condition: (s) => s.totalFiles >= 1,
  },
  {
    id: 'ten-files',
    name: '资料达人',
    description: '知识库达到 10 个文件',
    emoji: '🗄️',
    tier: 'silver',
    condition: (s) => s.totalFiles >= 10,
  },
  // Special
  {
    id: 'night-owl',
    name: '夜猫子',
    description: '在凌晨 0-5 点发布博客',
    emoji: '🦉',
    tier: 'bronze',
    condition: (s) => s.hasNightBlog,
  },
  {
    id: 'tag-master',
    name: '分类大师',
    description: '使用 10 个以上不同标签',
    emoji: '🏷️',
    tier: 'silver',
    condition: (s) => s.uniqueTags >= 10,
  },
  {
    id: 'multi-format',
    name: '双栖写手',
    description: '拥有 MD 和 HTML 博客',
    emoji: '🔄',
    tier: 'bronze',
    condition: (s) => s.hasMdBlog && s.hasHtmlBlog,
  },
];

export const TIER_LABELS: Record<string, string> = {
  bronze: '🥉 铜',
  silver: '🥈 银',
  gold: '🥇 金',
  platinum: '💎 铂金',
};
