import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ACHIEVEMENTS } from '../../../shared/achievements';
import type { UserStats } from '../../../shared/types';
import { useAuthStore } from '../../stores/auth-store';
import { Heatmap } from './Heatmap';

export function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const [ws, setWs] = useState<any>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [achievements, setAchievements] = useState<string[]>([]);

  useEffect(() => {
    if (!user) return;
    let aborted = false;
    window.api
      .workspaceGetInfo(user.id)
      .then((d: unknown) => {
        if (aborted) return;
        const s = d as Record<string, unknown>;
        if (s && typeof s.blogCount === 'number') setWs(s);
      })
      .catch((e) => {
        console.error('[Dashboard] Failed to get workspace info:', e);
      });
    window.api
      .statsGet(user.id)
      .then((d: unknown) => {
        if (aborted) return;
        const r = d as any;
        if (r.success && r.data) {
          setStats(r.data);
          const unlocked = ACHIEVEMENTS.filter((a) => a.condition(r.data)).map((a) => a.id);
          setAchievements(unlocked);
        }
      })
      .catch((e) => {
        console.error('[Dashboard] Failed to get stats:', e);
      });
    return () => {
      aborted = true;
    };
  }, [user]);

  const allAchievements = ACHIEVEMENTS.map((a) => ({
    ...a,
    unlocked: achievements.includes(a.id),
  }));

  return (
    <div style={{ maxWidth: 'var(--content-max)', margin: '0 auto' }}>
      {/* Hero */}
      <div className="mb-8" style={{ fontFamily: 'var(--font-mono)' }}>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>&gt; whoami</p>
        <h1 className="mt-1 text-[40px] font-bold leading-tight" style={{ color: 'var(--text-primary)' }}>
          {user?.username || '...'}
        </h1>
        <p className="mt-1 text-[18px]" style={{ color: 'var(--text-secondary)' }}>
          本地博客与知识库
        </p>

        {/* Streak badges */}
        {stats && (stats.currentStreak > 0 || stats.totalWords > 0) && (
          <div className="mt-3 flex flex-wrap gap-2">
            {stats.currentStreak > 0 && (
              <span
                className="rounded-[12px] px-3 py-1 text-[12px]"
                style={{ background: 'rgba(211,153,34,0.15)', color: 'var(--accent-amber)' }}
              >
                🔥 连续 {stats.currentStreak} 天
              </span>
            )}
            {stats.totalWords > 0 && (
              <span
                className="rounded-[12px] px-3 py-1 text-[12px]"
                style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
              >
                累计 {(stats.totalWords / 1000).toFixed(1)}k 字
              </span>
            )}
            {stats.totalBlogs > 0 && (
              <span
                className="rounded-[12px] px-3 py-1 text-[12px]"
                style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
              >
                {stats.totalBlogs} 篇文章
              </span>
            )}
          </div>
        )}
      </div>

      {/* Stat cards */}
      <div className="mb-8 grid grid-cols-4 gap-3">
        {[
          {
            label: '博客',
            val: ws?.blogCount ?? '...',
            sub: stats ? `本月 +${stats.monthlyCount}` : '',
            c: '--accent-blue',
          },
          { label: '知识库', val: ws?.knowledgeCount ?? '...', c: '--accent-green' },
          { label: '标签', val: ws?.tagCount ?? '...', c: '--accent-amber' },
          { label: '存储占用', val: ws ? fmt(ws.storageSize || 0) : '...', c: '--text-secondary' },
        ].map((card) => (
          <div
            key={card.label}
            className="rounded-[6px] border p-4"
            style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-default)' }}
          >
            <div className="text-[28px] font-bold" style={{ color: `var(${card.c})` }}>
              {card.val}
            </div>
            <div className="mt-1 flex items-center gap-2 text-[12px]" style={{ color: 'var(--text-secondary)' }}>
              {card.label}
              {card.sub && (
                <span className="text-[11px]" style={{ color: 'var(--accent-green)' }}>
                  {card.sub}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Achievements */}
      <h3
        className="mb-3 text-[14px] font-semibold uppercase tracking-wider"
        style={{ color: 'var(--text-secondary)' }}
      >
        成就 ({achievements.length}/{ACHIEVEMENTS.length})
      </h3>
      <div className="mb-8 grid grid-cols-7 gap-2">
        {allAchievements.map((a) => (
          <div
            key={a.id}
            className="flex flex-col items-center rounded-[6px] border p-2 text-center transition-opacity"
            style={{
              background: a.unlocked ? 'var(--bg-secondary)' : 'var(--bg-primary)',
              borderColor: a.unlocked ? 'var(--accent-amber)' : 'var(--border-default)',
              opacity: a.unlocked ? 1 : 0.4,
            }}
            title={a.unlocked ? `${a.name}: ${a.description}` : '??? '}
          >
            <span className="text-[20px]">{a.unlocked ? a.emoji : '🔒'}</span>
            <span
              className="mt-0.5 text-[10px] truncate w-full"
              style={{ color: a.unlocked ? 'var(--text-primary)' : 'var(--text-placeholder)' }}
            >
              {a.name}
            </span>
          </div>
        ))}
      </div>

      {/* Heatmap */}
      {user && (
        <div className="mb-8">
          <Heatmap userId={user.id} />
        </div>
      )}

      {/* Quick actions */}
      <h3
        className="mb-3 text-[14px] font-semibold uppercase tracking-wider"
        style={{ color: 'var(--text-secondary)' }}
      >
        快捷操作
      </h3>
      <div className="grid grid-cols-4 gap-3">
        {[
          { to: '/blog/new', label: '写博客', k: '✍', desc: '创建一篇新文章' },
          { to: '/knowledge', label: '知识库', k: '📁', desc: '导入与管理文件' },
          { to: '/tags', label: '标签', k: '#', desc: '整理分类标签' },
          { to: '/blog', label: '看博客', k: '→', desc: '浏览全部文章' },
        ].map((a) => (
          <Link
            key={a.to}
            to={a.to}
            className="rounded-[6px] border p-4 transition-all duration-[0.2s]"
            style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-default)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--accent-blue)';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--border-default)';
              e.currentTarget.style.transform = '';
            }}
          >
            <div className="text-xl">{a.k}</div>
            <div className="mt-2 text-[15px] font-medium" style={{ color: 'var(--text-primary)' }}>
              {a.label}
            </div>
            <div className="mt-0.5 text-[12px]" style={{ color: 'var(--text-secondary)' }}>
              {a.desc}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function fmt(bytes: number): string {
  if (!bytes) return '0 B';
  const u = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / 1024 ** i).toFixed(1)} ${u[i]}`;
}
